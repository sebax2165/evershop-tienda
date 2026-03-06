import { select, insert, update, execute } from '@evershop/postgres-query-builder';
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
    const {
      product_id,
      enabled,
      deposit_type,
      deposit_value,
      min_order_total,
      max_order_total
    } = request.body || {};

    // Check if config already exists for this product_id (or global)
    let existing;
    if (product_id) {
      existing = await select()
        .from('cod_partial_payment_config')
        .where('product_id', '=', product_id)
        .execute(pool);
    } else {
      existing = await select()
        .from('cod_partial_payment_config')
        .where('product_id', 'IS NULL', null)
        .execute(pool);
    }

    const data: Record<string, any> = {};
    if (enabled !== undefined) data.enabled = enabled;
    if (deposit_type !== undefined) data.deposit_type = deposit_type;
    if (deposit_value !== undefined) data.deposit_value = deposit_value;
    if (min_order_total !== undefined) data.min_order_total = min_order_total;
    if (max_order_total !== undefined) data.max_order_total = max_order_total;

    let result;

    if (existing.length > 0) {
      // Update existing config
      if (product_id) {
        result = await update('cod_partial_payment_config')
          .given(data)
          .where('product_id', '=', product_id)
          .execute(pool);
      } else {
        result = await update('cod_partial_payment_config')
          .given(data)
          .where('product_id', 'IS NULL', null)
          .execute(pool);
      }
    } else {
      // Insert new config
      if (product_id) {
        data.product_id = product_id;
      }
      result = await insert('cod_partial_payment_config')
        .given(data)
        .execute(pool);
    }

    response.status(OK);
    return response.json({
      success: true,
      data: result
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
