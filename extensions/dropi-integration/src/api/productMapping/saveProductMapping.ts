import { insertOnUpdate } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  // Solo manejar POST
  if (request.method !== 'POST') {
    return undefined;
  }

  try {
    const {
      evershop_product_id,
      dropi_product_id,
      dropi_variation_id,
      dropi_product_name
    } = request.body || {};

    if (!evershop_product_id || !dropi_product_id) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Se requiere evershop_product_id y dropi_product_id'
      });
    }

    const evershopId = parseInt(String(evershop_product_id), 10);
    const dropiId = parseInt(String(dropi_product_id), 10);

    if (isNaN(evershopId) || isNaN(dropiId)) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Los IDs de producto deben ser numeros validos'
      });
    }

    const variationId = dropi_variation_id
      ? parseInt(String(dropi_variation_id), 10)
      : null;

    const result = await insertOnUpdate('dropi_product_map', ['evershop_product_id'])
      .given({
        evershop_product_id: evershopId,
        dropi_product_id: dropiId,
        dropi_variation_id: variationId,
        dropi_product_name: dropi_product_name || null,
        updated_at: new Date().toISOString()
      })
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      message: 'Mapeo de producto guardado correctamente',
      data: {
        map_id: result.insertId || result.map_id,
        evershop_product_id: evershopId,
        dropi_product_id: dropiId,
        dropi_variation_id: variationId,
        dropi_product_name: dropi_product_name || null
      }
    });
  } catch (e) {
    const error = e as Error;
    console.error('[Dropi] Error guardando mapeo de producto:', error.message);

    // Detectar error de foreign key (producto EverShop no existe)
    if (error.message.includes('FK_DROPI_PRODUCT_MAP_PRODUCT') || error.message.includes('violates foreign key')) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'El producto de EverShop especificado no existe'
      });
    }

    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: `Error al guardar mapeo: ${error.message}`
    });
  }
};
