import { insert } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  if (request.method !== 'POST') {
    return next();
  }

  try {
    const {
      name,
      country,
      province,
      min_order_value,
      max_order_value,
      min_weight,
      max_weight,
      rate_amount,
      free_shipping_threshold,
      enabled
    } = request.body || {};

    if (!country) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'El pais es requerido'
      });
    }

    const data: Record<string, any> = {
      name: name || `${country} - ${province || 'Todos'}`,
      country,
      province: province || null,
      min_order_value: min_order_value ?? 0,
      max_order_value: max_order_value ?? null,
      min_weight: min_weight ?? 0,
      max_weight: max_weight ?? null,
      rate_amount: rate_amount ?? 0,
      free_shipping_threshold: free_shipping_threshold ?? null,
      enabled: enabled !== undefined ? enabled : true
    };

    const result = await insert('cod_shipping_rate')
      .given(data)
      .execute(pool);

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
