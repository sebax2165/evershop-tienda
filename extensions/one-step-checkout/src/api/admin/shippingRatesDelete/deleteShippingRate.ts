import { del } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  if (request.method !== 'DELETE') {
    return next();
  }

  try {
    const { rate_id } = request.params;

    await del('cod_shipping_rate')
      .where('rate_id', '=', parseInt(rate_id, 10))
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      message: 'Tarifa eliminada correctamente'
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
