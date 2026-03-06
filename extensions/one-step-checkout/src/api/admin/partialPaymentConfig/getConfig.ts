import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  // Only handle GET requests
  if (request.method !== 'GET') {
    return next();
  }

  try {
    const configs = await select()
      .from('cod_partial_payment_config')
      .orderBy('product_id', 'ASC')
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      data: configs
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
