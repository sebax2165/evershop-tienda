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
    const rules = await select()
      .from('cod_conditional_rule')
      .orderBy('priority', 'DESC')
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      data: rules
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
