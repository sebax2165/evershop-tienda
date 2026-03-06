import {
  del
} from '@evershop/postgres-query-builder';
import {
  pool
} from '@evershop/evershop/src/lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';

export default async (request, response, next) => {
  // Only handle DELETE requests
  if (request.method !== 'DELETE') {
    return next();
  }

  try {
    const { block_id } = request.params;

    await del('cod_blocked_user')
      .where('cod_blocked_user_id', '=', parseInt(block_id, 10))
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      message: 'Block removed successfully'
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
