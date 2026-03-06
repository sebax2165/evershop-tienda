import {
  insert
} from '@evershop/postgres-query-builder';
import {
  pool
} from '@evershop/evershop/src/lib/postgres/connection.js';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/src/lib/util/httpStatus.js';

export default async (request, response, next) => {
  try {
    const { phone, email } = request.body;

    const ip_address =
      request.headers['x-forwarded-for'] ||
      request.connection?.remoteAddress ||
      null;

    await insert('cod_order_attempt')
      .given({
        phone: phone || null,
        email: email || null,
        ip_address: typeof ip_address === 'string' ? ip_address.split(',')[0].trim() : ip_address,
        created_at: new Date().toISOString()
      })
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
