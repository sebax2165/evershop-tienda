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
    const { product_id } = request.params;
    const {
      qty,
      discount_type,
      discount_value,
      label,
      badge_text,
      sort_order,
      enabled
    } = request.body;

    if (!qty || !discount_type || discount_value === undefined) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'qty, discount_type, and discount_value are required'
      });
    }

    // Verify the product exists
    const product = await select()
      .from('product')
      .where('product_id', '=', parseInt(product_id, 10))
      .load(pool);

    if (!product) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Product not found'
      });
    }

    const offer = await insert('cod_quantity_offer')
      .given({
        product_id: parseInt(product_id, 10),
        qty: parseInt(qty, 10),
        discount_type: discount_type, // 'percentage' or 'fixed'
        discount_value: parseFloat(discount_value),
        label: label || null,
        badge_text: badge_text || null,
        sort_order: sort_order !== undefined ? parseInt(sort_order, 10) : 0,
        enabled: enabled !== undefined ? enabled : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      data: offer
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
