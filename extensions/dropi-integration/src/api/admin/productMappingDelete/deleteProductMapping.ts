import { del, select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  try {
    const { map_id } = request.params;

    if (!map_id) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Se requiere el ID del mapeo (map_id)'
      });
    }

    const mapIdInt = parseInt(String(map_id), 10);
    if (isNaN(mapIdInt)) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'El ID del mapeo debe ser un numero valido'
      });
    }

    // Verificar que existe
    const existing = await select()
      .from('dropi_product_map')
      .where('map_id', '=', mapIdInt)
      .load(pool);

    if (!existing) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: `Mapeo con ID ${mapIdInt} no encontrado`
      });
    }

    await del('dropi_product_map')
      .where('map_id', '=', mapIdInt)
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      message: 'Mapeo de producto eliminado correctamente'
    });
  } catch (e) {
    console.error('[Dropi] Error eliminando mapeo de producto:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: `Error al eliminar mapeo: ${(e as Error).message}`
    });
  }
};
