import { insert } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  // Only handle POST requests
  if (request.method !== 'POST') {
    return next();
  }

  try {
    const { rule_type, operator, conditions, priority, enabled } =
      request.body || {};

    if (!rule_type || !conditions) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'rule_type and conditions are required'
      });
    }

    const rule = await insert('cod_conditional_rule')
      .given({
        rule_type,
        operator: operator || 'block',
        conditions:
          typeof conditions === 'string'
            ? conditions
            : JSON.stringify(conditions),
        priority: priority !== undefined ? priority : 0,
        enabled: enabled !== undefined ? enabled : true
      })
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      data: rule
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
