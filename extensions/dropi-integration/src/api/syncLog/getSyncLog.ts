import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  try {
    // Obtener los ultimos 50 registros de sincronizacion con datos del pedido
    const query = select().from('dropi_order_sync');
    query.leftJoin('order').on('dropi_order_sync.evershop_order_id', '=', 'order.order_id');
    query.orderBy('dropi_order_sync.created_at', 'DESC');
    query.limit(0, 50);
    const syncRecords = await query.execute(pool);

    const result = syncRecords.map((r: any) => ({
      sync_id: r.sync_id,
      evershop_order_id: r.evershop_order_id,
      order_number: r.order_number || null,
      grand_total: r.grand_total || null,
      dropi_order_id: r.dropi_order_id,
      dropi_guide_number: r.dropi_guide_number,
      status: r.status,
      dropi_status: r.dropi_status,
      error_message: r.error_message,
      synced_at: r.synced_at,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    // Resumen de estados
    const summary = {
      total: result.length,
      synced: result.filter((r: any) => r.status === 'synced').length,
      failed: result.filter((r: any) => r.status === 'failed').length,
      pending: result.filter((r: any) => r.status === 'pending').length,
      cancelled: result.filter((r: any) => r.status === 'cancelled').length,
      last_sync: result.find((r: any) => r.status === 'synced')?.synced_at || null
    };

    response.status(OK);
    return response.json({
      success: true,
      data: {
        summary,
        records: result
      }
    });
  } catch (e) {
    console.error('[Dropi] Error obteniendo log de sincronizacion:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: `Error al obtener log de sincronizacion: ${(e as Error).message}`
    });
  }
};
