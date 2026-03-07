import {
  insert
} from '@evershop/postgres-query-builder';
import {
  pool
} from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  try {
    const {
      product_id,
      customer_name,
      customer_phone,
      customer_email,
      form_data,
      cart_total,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content
    } = request.body;

    const ip_address =
      request.headers['x-forwarded-for'] ||
      request.connection?.remoteAddress ||
      null;
    const user_agent = request.headers['user-agent'] || null;

    const result = await insert('cod_abandoned_order')
      .given({
        product_id: product_id ? parseInt(product_id, 10) : null,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        customer_email: customer_email || null,
        form_data: form_data ? JSON.stringify(form_data) : null,
        cart_total: cart_total ? parseFloat(cart_total) : null,
        ip_address: typeof ip_address === 'string' ? ip_address.split(',')[0].trim() : ip_address,
        user_agent,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        utm_content: utm_content || null,
        created_at: new Date().toISOString()
      })
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      uuid: result.uuid
    });
  } catch (e) {
    console.error('[AbandonedOrder] Error:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: 'Error al guardar la informacion'
    });
  }
};
