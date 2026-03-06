import {
  insert,
  select
} from '@evershop/postgres-query-builder';
import {
  pool
} from '@evershop/evershop/src/lib/postgres/connection.js';
import {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';

export default async (request, response, next) => {
  // Only handle POST requests
  if (request.method !== 'POST') {
    return next();
  }

  try {
    const { block_type, block_value, reason } = request.body;

    if (!block_type || !block_value) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'block_type and block_value are required'
      });
    }

    if (!['ip', 'phone', 'email'].includes(block_type)) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'block_type must be one of: ip, phone, email'
      });
    }

    // Check if already blocked
    const existing = await select()
      .from('cod_blocked_user')
      .where('block_type', '=', block_type)
      .andWhere('block_value', '=', block_value)
      .load(pool);

    if (existing) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'This value is already blocked'
      });
    }

    const blocked = await insert('cod_blocked_user')
      .given({
        block_type,
        block_value,
        reason: reason || null,
        created_at: new Date().toISOString()
      })
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      data: blocked
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
