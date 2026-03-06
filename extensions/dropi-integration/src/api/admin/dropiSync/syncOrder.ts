import { select, insert, update } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';
import { createDropiOrder } from '../../../services/dropiApi.js';

export default async (request, response) => {
  try {
    const { order_id } = request.params;

    // 1. Load Dropi config
    const config = await select()
      .from('dropi_config')
      .where('enabled', '=', true)
      .load(pool);

    if (!config) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'La integracion con Dropi no esta habilitada'
      });
    }

    const token = config.api_key;
    const environment = config.environment || 'test';

    if (!token) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Token de integracion Dropi no configurado'
      });
    }

    // 2. Load the order (by UUID)
    const order = await select()
      .from('order')
      .where('uuid', '=', order_id)
      .load(pool);

    if (!order) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: `Pedido ${order_id} no encontrado`
      });
    }

    // 3. Load shipping address
    const shippingAddress = await select()
      .from('order_address')
      .where('order_address_id', '=', order.shipping_address_id)
      .load(pool);

    if (!shippingAddress) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Direccion de envio no encontrada'
      });
    }

    // 4. Load order items
    const orderItems = await select()
      .from('order_item')
      .where('order_item_order_id', '=', order.order_id)
      .execute(pool);

    // 5. Map products
    const dropiProducts: Array<{
      id: number;
      price: number;
      variation_id: number | null;
      quantity: number;
    }> = [];

    for (const item of orderItems) {
      const mapping = await select()
        .from('dropi_product_map')
        .where('evershop_product_id', '=', item.product_id)
        .load(pool);

      if (mapping) {
        dropiProducts.push({
          id: mapping.dropi_product_id,
          price: parseFloat(item.final_price) || parseFloat(item.product_price),
          variation_id: mapping.dropi_variation_id || null,
          quantity: item.qty
        });
      }
    }

    if (dropiProducts.length === 0) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Ningun producto del pedido tiene mapeo a Dropi'
      });
    }

    // 6. Parse name
    const fullName = shippingAddress.full_name || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // 7. Build payload
    const dropiOrderData = {
      calculate_costs_and_shiping: true,
      state: (shippingAddress.province || shippingAddress.city || '').toUpperCase(),
      city: (shippingAddress.city || '').toUpperCase(),
      client_email: order.customer_email || '',
      name: firstName,
      surname: lastName,
      dir: shippingAddress.address_1 || '',
      notes: order.customer_note || '',
      payment_method_id: 1,
      phone: shippingAddress.telephone || shippingAddress.phone || '',
      rate_type: 'CON RECAUDO',
      type: 'FINAL_ORDER',
      total_order: parseFloat(order.grand_total),
      shop_order_id: `EV-${order.order_number}`,
      products: dropiProducts
    };

    // 8. Create/update sync record
    const existingSync = await select()
      .from('dropi_order_sync')
      .where('evershop_order_id', '=', order.order_id)
      .orderBy('sync_id', 'DESC')
      .load(pool);

    let syncId: number;

    if (existingSync) {
      await update('dropi_order_sync')
        .given({
          status: 'pending',
          request_payload: JSON.stringify(dropiOrderData),
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .where('sync_id', '=', existingSync.sync_id)
        .execute(pool);
      syncId = existingSync.sync_id;
    } else {
      const newSync = await insert('dropi_order_sync')
        .given({
          evershop_order_id: order.order_id,
          status: 'pending',
          request_payload: JSON.stringify(dropiOrderData)
        })
        .execute(pool);
      syncId = newSync.insertId || newSync.sync_id;
    }

    // 9. Send to Dropi
    const dropiResponse = await createDropiOrder(
      dropiOrderData,
      token,
      environment
    );

    // 10. Update with success
    const dropiOrderId =
      dropiResponse?.object?.id ||
      dropiResponse?.data?.id ||
      dropiResponse?.id ||
      null;

    const dropiGuide =
      dropiResponse?.object?.guide_number ||
      dropiResponse?.data?.guide_number ||
      null;

    await update('dropi_order_sync')
      .given({
        dropi_order_id: dropiOrderId ? String(dropiOrderId) : null,
        dropi_guide_number: dropiGuide ? String(dropiGuide) : null,
        status: 'synced',
        dropi_status: dropiResponse?.object?.status || null,
        response_payload: JSON.stringify(dropiResponse),
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null
      })
      .where('sync_id', '=', syncId)
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      message: 'Pedido sincronizado exitosamente con Dropi',
      data: {
        dropiOrderId,
        dropiGuide
      }
    });
  } catch (e) {
    // Try to update the sync record with error
    try {
      const { order_id } = request.params;
      const order = await select()
        .from('order')
        .where('uuid', '=', order_id)
        .load(pool);

      if (order) {
        const existingSync = await select()
          .from('dropi_order_sync')
          .where('evershop_order_id', '=', order.order_id)
          .orderBy('sync_id', 'DESC')
          .load(pool);

        if (existingSync) {
          await update('dropi_order_sync')
            .given({
              status: 'failed',
              error_message: e.message,
              updated_at: new Date().toISOString()
            })
            .where('sync_id', '=', existingSync.sync_id)
            .execute(pool);
        }
      }
    } catch (updateErr) {
      console.error('[Dropi] Error actualizando registro de sync:', updateErr.message);
    }

    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
