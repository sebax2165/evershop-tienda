import { del } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  // Only handle DELETE requests
  if (request.method !== 'DELETE') {
    return next();
  }

  try {
    const { rule_id } = request.query || {};

    if (!rule_id) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'rule_id query parameter is required'
      });
    }

    await del('cod_conditional_rule')
      .where('cod_conditional_rule_id', '=', rule_id)
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      data: { deleted: true }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
