import { select, insert, update } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import { getSetting } from '@evershop/evershop/setting/services';
import { createDropiOrder } from '../../services/dropiApi.js';

interface OrderPlacedData {
  order_id: number;
  [key: string]: any;
}

export default async function syncToDropi(data: OrderPlacedData) {
  let syncRecord: any = null;

  try {
    // 1. Read Dropi config
    const config = await select()
      .from('dropi_config')
      .where('enabled', '=', true)
      .load(pool);

    if (!config) {
      // Dropi integration not enabled, skip
      return;
    }

    // Check if auto_sync is enabled
    if (!config.auto_sync) {
      return;
    }

    const token = config.api_key;
    const environment = config.environment || 'test';

    if (!token) {
      console.warn('[Dropi] Token de integracion no configurado. Omitiendo sincronizacion.');
      return;
    }

    // 2. Load the EverShop order
    const order = await select()
      .from('order')
      .where('order_id', '=', data.order_id)
      .load(pool);

    if (!order) {
      console.error(`[Dropi] Pedido ${data.order_id} no encontrado.`);
      return;
    }

    // 3. Load shipping address
    const shippingAddress = await select()
      .from('order_address')
      .where('order_address_id', '=', order.shipping_address_id)
      .load(pool);

    if (!shippingAddress) {
      console.error(`[Dropi] Direccion de envio no encontrada para pedido ${data.order_id}.`);
      return;
    }

    // 4. Load order items
    const orderItems = await select()
      .from('order_item')
      .where('order_item_order_id', '=', order.order_id)
      .execute(pool);

    // 5. Map order items to Dropi products
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
      } else {
        console.warn(
          `[Dropi] Producto EverShop ${item.product_id} no tiene mapeo a Dropi. Omitiendo item.`
        );
      }
    }

    if (dropiProducts.length === 0) {
      console.warn(
        `[Dropi] Ningun producto del pedido ${data.order_id} tiene mapeo a Dropi. Omitiendo sincronizacion.`
      );
      return;
    }

    // 6. Parse full_name into name and surname
    const fullName = shippingAddress.full_name || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // 7. Build the Dropi order payload
    const dropiOrderData = {
      calculate_costs_and_shiping: true,
      state: (shippingAddress.province || shippingAddress.city || '').toUpperCase(),
      city: (shippingAddress.city || '').toUpperCase(),
      client_email: order.customer_email || shippingAddress.email || '',
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

    // 8. Create sync record as pending
    syncRecord = await insert('dropi_order_sync')
      .given({
        evershop_order_id: order.order_id,
        status: 'pending',
        request_payload: JSON.stringify(dropiOrderData)
      })
      .execute(pool);

    // 9. Send to Dropi
    const dropiResponse = await createDropiOrder(
      dropiOrderData,
      token,
      environment
    );

    // 10. Update sync record with success
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
        updated_at: new Date().toISOString()
      })
      .where('sync_id', '=', syncRecord.insertId || syncRecord.sync_id)
      .execute(pool);

    console.info(
      `[Dropi] Pedido ${order.order_number} sincronizado exitosamente. Dropi ID: ${dropiOrderId}`
    );
  } catch (e) {
    console.error(`[Dropi] Error sincronizando pedido ${data.order_id}:`, e.message);

    // Update sync record with error if it exists
    if (syncRecord) {
      try {
        await update('dropi_order_sync')
          .given({
            status: 'failed',
            error_message: e.message,
            updated_at: new Date().toISOString()
          })
          .where('sync_id', '=', syncRecord.insertId || syncRecord.sync_id)
          .execute(pool);
      } catch (updateError) {
        console.error('[Dropi] Error actualizando registro de sincronizacion:', updateError.message);
      }
    } else {
      // Create a failed sync record
      try {
        await insert('dropi_order_sync')
          .given({
            evershop_order_id: data.order_id,
            status: 'failed',
            error_message: e.message
          })
          .execute(pool);
      } catch (insertError) {
        console.error('[Dropi] Error creando registro de sincronizacion fallido:', insertError.message);
      }
    }
  }
}
