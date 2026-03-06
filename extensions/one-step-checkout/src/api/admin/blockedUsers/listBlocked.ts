import {
  select
} from '@evershop/postgres-query-builder';
import {
  pool
} from '@evershop/evershop/src/lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';

export default async (request, response, next) => {
  // Only handle GET requests
  if (request.method !== 'GET') {
    return next();
  }

  try {
    const { block_type } = request.query || {};

    let query = select().from('cod_blocked_user');

    if (block_type) {
      query = query.where('block_type', '=', block_type);
    }

    const blocked = await query
      .orderBy('created_at', 'DESC')
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
