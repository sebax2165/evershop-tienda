import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  // Solo manejar GET
  if (request.method !== 'GET') {
    return undefined;
  }

  try {
    const mappings = await select()
      .from('dropi_product_map')
      .leftJoin('product')
      .on('dropi_product_map.evershop_product_id', '=', 'product.product_id')
      .leftJoin('product_description')
      .on(
        'product.product_id',
        '=',
        'product_description.product_description_product_id'
      )
      .execute(pool);

    const result = mappings.map((m: any) => ({
      map_id: m.map_id,
      evershop_product_id: m.evershop_product_id,
      dropi_product_id: m.dropi_product_id,
      dropi_variation_id: m.dropi_variation_id,
      dropi_product_name: m.dropi_product_name,
      product_name: m.name || `Producto #${m.evershop_product_id}`,
      created_at: m.created_at,
      updated_at: m.updated_at
    }));

    response.status(OK);
    return response.json({
      success: true,
      data: result
    });
  } catch (e) {
    console.error('[Dropi] Error obteniendo mapeos de productos:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: `Error al obtener mapeos: ${(e as Error).message}`
    });
  }
};
