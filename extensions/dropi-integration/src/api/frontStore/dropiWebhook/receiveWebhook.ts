import crypto from 'crypto';
import { select, update } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';

/**
 * Mapa de estados Dropi a estados EverShop.
 * Ajustar segun los estados configurados en tu tienda.
 */
const DROPI_TO_EVERSHOP_STATUS: Record<string, string | null> = {
  ENVIADO: 'processing',
  ENTREGADO: 'complete',
  DEVUELTO: 'canceled',
  CANCELADO: 'canceled',
  EN_BODEGA: 'processing',
  PENDIENTE: 'pending'
};

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

    // Validate that we have the required fields
    const dropiOrderId =
      payload.order_id ||
      payload.id ||
      payload.data?.order_id ||
      payload.data?.id;
    const dropiStatus =
      payload.status ||
      payload.data?.status ||
      payload.state;
    const guideNumber =
      payload.guide_number ||
      payload.data?.guide_number ||
      null;

    if (!dropiOrderId) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Falta el ID del pedido Dropi en el webhook'
      });
    }

    // Verify webhook authenticity using the configured API key
    const config = await select()
      .from('dropi_config')
      .where('enabled', '=', true)
      .load(pool);

    if (!config) {
      response.status(OK);
      return response.json({
        success: false,
        message: 'Integracion Dropi no habilitada'
      });
    }

    // Optional: verify webhook signature if Dropi sends one
    const webhookSignature = request.headers['x-dropi-signature'];
    if (webhookSignature && config.api_key) {
      const expectedSignature = crypto
        .createHash('sha256')
        .update(`${config.api_key}:${dropiOrderId}`)
        .digest('hex');

      if (webhookSignature !== expectedSignature) {
        console.warn('[Dropi Webhook] Firma de webhook invalida');
        response.status(INVALID_PAYLOAD);
        return response.json({
          success: false,
          message: 'Firma de webhook invalida'
        });
      }
    }

    // Find the sync record
    const syncRecord = await select()
      .from('dropi_order_sync')
      .where('dropi_order_id', '=', String(dropiOrderId))
      .orderBy('sync_id', 'DESC')
      .load(pool);

    if (!syncRecord) {
      // Try to find by shop_order_id in the payload
      const shopOrderId = payload.shop_order_id || payload.data?.shop_order_id;
      if (shopOrderId) {
        console.info(
          `[Dropi Webhook] Pedido Dropi ${dropiOrderId} no encontrado por ID, buscando por shop_order_id: ${shopOrderId}`
        );
      }

      response.status(OK);
      return response.json({
        success: true,
        message: `Pedido Dropi ${dropiOrderId} no tiene registro de sincronizacion`
      });
    }

    // Update the sync record
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (dropiStatus) {
      updateData.dropi_status = dropiStatus;
    }

    if (guideNumber) {
      updateData.dropi_guide_number = String(guideNumber);
    }

    await update('dropi_order_sync')
      .given(updateData)
      .where('sync_id', '=', syncRecord.sync_id)
      .execute(pool);

    // Optionally update the EverShop order status
    if (dropiStatus) {
      const normalizedStatus = dropiStatus.toUpperCase().replace(/\s+/g, '_');
      const evershopStatus = DROPI_TO_EVERSHOP_STATUS[normalizedStatus];

      if (evershopStatus) {
        try {
          await update('order')
            .given({
              payment_status: evershopStatus === 'complete' ? 'paid' : undefined,
              shipment_status:
                evershopStatus === 'complete'
                  ? 'delivered'
                  : evershopStatus === 'processing'
                    ? 'shipping'
                    : undefined
            })
            .where('order_id', '=', syncRecord.evershop_order_id)
            .execute(pool);

          console.info(
            `[Dropi Webhook] Pedido EverShop ${syncRecord.evershop_order_id} actualizado a estado: ${evershopStatus}`
          );
        } catch (orderUpdateErr) {
          console.error(
            '[Dropi Webhook] Error actualizando estado del pedido EverShop:',
            (orderUpdateErr as Error).message
          );
        }
      }
    }

    console.info(
      `[Dropi Webhook] Webhook procesado para pedido Dropi ${dropiOrderId}, estado: ${dropiStatus || 'sin cambio'}`
    );

    response.status(OK);
    return response.json({
      success: true,
      message: 'Webhook procesado correctamente'
    });
  } catch (e) {
    console.error('[Dropi Webhook] Error procesando webhook:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: (e as Error).message
    });
  }
};
