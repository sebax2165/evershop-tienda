import { select, update } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';
import { generateDropiGuide } from '../../../services/dropiApi.js';

export default async (request, response) => {
  try {
    const { order_id } = request.params;

    // 1. Load Dropi config (dropi_config table first, then setting table)
    let token: string | null = null;
    let environment = 'test';

    const config = await select()
      .from('dropi_config')
      .where('enabled', '=', true)
      .load(pool);

    if (config && config.api_key) {
      token = config.api_key;
      environment = config.environment || 'test';
    } else {
      const { getSetting } = await import('@evershop/evershop/setting/services');
      token = await getSetting('dropiApiKey', null);
      environment = (await getSetting('dropiEnvironment', 'test')) || 'test';
    }

    if (!token) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Token de integracion Dropi no configurado'
      });
    }

    // 2. Find the order by UUID
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

    // 3. Find the sync record
    const syncRecord = await select()
      .from('dropi_order_sync')
      .where('evershop_order_id', '=', order.order_id)
      .where('status', '=', 'synced')
      .orderBy('sync_id', 'DESC')
      .load(pool);

    if (!syncRecord || !syncRecord.dropi_order_id) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Este pedido no tiene un ID de Dropi. Sincroniza primero el pedido.'
      });
    }

    // 4. Generate guide via Dropi API
    const guideResponse = await generateDropiGuide(
      syncRecord.dropi_order_id,
      token,
      environment
    );

    // 5. Extract guide number from response
    const guideNumber =
      guideResponse?.object?.shipping_guide ||
      guideResponse?.object?.guide_number ||
      guideResponse?.data?.shipping_guide ||
      guideResponse?.data?.guide_number ||
      null;

    const dropiStatus =
      guideResponse?.object?.status ||
      guideResponse?.data?.status ||
      'GUIA_GENERADA';

    // 6. Update sync record
    await update('dropi_order_sync')
      .given({
        dropi_guide_number: guideNumber ? String(guideNumber) : null,
        dropi_status: dropiStatus,
        response_payload: JSON.stringify(guideResponse),
        updated_at: new Date().toISOString()
      })
      .where('sync_id', '=', syncRecord.sync_id)
      .execute(pool);

    console.info(
      `[Dropi] Guia generada para pedido ${order.order_number}: ${guideNumber || 'sin numero'}`
    );

    response.status(OK);
    return response.json({
      success: true,
      message: guideNumber
        ? `Guia generada: ${guideNumber}`
        : 'Solicitud de guia enviada a Dropi',
      data: {
        guideNumber,
        dropiStatus
      }
    });
  } catch (e) {
    console.error('[Dropi] Error generando guia:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: (e as Error).message
    });
  }
};
