import { select, update } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';

/**
 * Mapa de estados Dropi a estados EverShop.
 * Basado en la documentacion oficial del webhook de Dropi.
 */
const DROPI_TO_EVERSHOP: Record<
  string,
  { payment_status?: string; shipment_status?: string } | null
> = {
  PENDIENTE: { shipment_status: 'unfulfilled' },
  GUIA_GENERADA: { shipment_status: 'unfulfilled' },
  EN_BODEGA: { shipment_status: 'unfulfilled' },
  ENVIADO: { shipment_status: 'shipping' },
  ENTREGADO: { payment_status: 'paid', shipment_status: 'delivered' },
  DEVUELTO: { shipment_status: 'returned' },
  CANCELADO: { shipment_status: 'returned' }
};

/**
 * Webhook de Dropi para recibir actualizaciones de estado de ordenes.
 *
 * Segun la doc oficial, el payload tiene este formato:
 * {
 *   "id": 28593481,           // Numero de Orden Dropi
 *   "status": "ESTADO",       // Estado de la orden
 *   "name": "...",
 *   "surname": "...",
 *   "dir": "...",
 *   "phone": "...",
 *   "total_order": "79000.00",
 *   "state": "DEPARTAMENTO",
 *   "city": "CIUDAD",
 *   "rate_type": "CON RECAUDO",
 *   "shipping_company": "...",
 *   "shipping_guide": "...",   // Numero de guia
 *   "sticker": "...",          // Nombre del archivo PDF
 *   "shop_order_id": "...",    // ID de la orden en nuestra tienda
 *   "orderdetails": [...],
 *   ...
 * }
 */
export default async (request, response) => {
  try {
    const payload = request.body;

    if (!payload) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Payload vacio'
      });
    }

    // Extraer campos del payload oficial de Dropi
    const dropiOrderId = payload.id;
    const dropiStatus = payload.status;
    const guideNumber = payload.shipping_guide || null;
    const sticker = payload.sticker || null;
    const shippingCompany = payload.shipping_company || null;
    const shopOrderId = payload.shop_order_id || null;

    if (!dropiOrderId) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Falta el ID del pedido Dropi (campo "id") en el webhook'
      });
    }

    // Verificar que la integracion esta habilitada
    const config = await select()
      .from('dropi_config')
      .where('enabled', '=', true)
      .load(pool);

    if (!config) {
      // Fallback: check if configured via EverShop setting table
      let hasToken = false;
      try {
        const { getSetting } = await import('@evershop/evershop/setting/services');
        const settingToken = await getSetting('dropiApiKey', null);
        hasToken = !!settingToken;
      } catch {
        // getSetting not available
      }

      if (!hasToken) {
        response.status(OK);
        return response.json({
          success: false,
          message: 'Integracion Dropi no habilitada'
        });
      }
    }

    // Buscar el registro de sync por dropi_order_id
    let syncRecord = await select()
      .from('dropi_order_sync')
      .where('dropi_order_id', '=', String(dropiOrderId))
      .orderBy('sync_id', 'DESC')
      .load(pool);

    // Si no se encuentra por dropi_order_id, intentar por shop_order_id
    if (!syncRecord && shopOrderId) {
      // shop_order_id tiene formato "EV-{order_number}"
      const orderNumber = shopOrderId.replace(/^EV-/, '');
      if (orderNumber) {
        const order = await select()
          .from('order')
          .where('order_number', '=', orderNumber)
          .load(pool);

        if (order) {
          syncRecord = await select()
            .from('dropi_order_sync')
            .where('evershop_order_id', '=', order.order_id)
            .orderBy('sync_id', 'DESC')
            .load(pool);
        }
      }
    }

    if (!syncRecord) {
      console.info(
        `[Dropi Webhook] Pedido Dropi ${dropiOrderId} no tiene registro de sincronizacion`
      );
      response.status(OK);
      return response.json({
        success: true,
        message: `Pedido Dropi ${dropiOrderId} recibido pero sin registro de sync`
      });
    }

    // Actualizar el registro de sync
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (dropiStatus) {
      updateData.dropi_status = dropiStatus;
    }
    if (guideNumber) {
      updateData.dropi_guide_number = String(guideNumber);
    }
    // Guardar el response completo del webhook para referencia
    updateData.response_payload = JSON.stringify(payload);

    await update('dropi_order_sync')
      .given(updateData)
      .where('sync_id', '=', syncRecord.sync_id)
      .execute(pool);

    // Actualizar el estado del pedido en EverShop
    if (dropiStatus) {
      const normalizedStatus = dropiStatus.toUpperCase().replace(/\s+/g, '_');
      const statusMapping = DROPI_TO_EVERSHOP[normalizedStatus];

      if (statusMapping) {
        try {
          const orderUpdate: Record<string, any> = {};
          if (statusMapping.payment_status) {
            orderUpdate.payment_status = statusMapping.payment_status;
          }
          if (statusMapping.shipment_status) {
            orderUpdate.shipment_status = statusMapping.shipment_status;
          }

          if (Object.keys(orderUpdate).length > 0) {
            await update('order')
              .given(orderUpdate)
              .where('order_id', '=', syncRecord.evershop_order_id)
              .execute(pool);

            console.info(
              `[Dropi Webhook] Pedido EverShop ${syncRecord.evershop_order_id} actualizado: ${JSON.stringify(orderUpdate)}`
            );
          }
        } catch (orderUpdateErr) {
          console.error(
            '[Dropi Webhook] Error actualizando estado del pedido:',
            (orderUpdateErr as Error).message
          );
        }
      }
    }

    console.info(
      `[Dropi Webhook] Procesado: Dropi #${dropiOrderId}, estado: ${dropiStatus || 'sin cambio'}, guia: ${guideNumber || 'n/a'}`
    );

    response.status(OK);
    return response.json({
      success: true,
      message: 'Webhook procesado correctamente'
    });
  } catch (e) {
    console.error(
      '[Dropi Webhook] Error procesando webhook:',
      (e as Error).message
    );
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: (e as Error).message
    });
  }
};
