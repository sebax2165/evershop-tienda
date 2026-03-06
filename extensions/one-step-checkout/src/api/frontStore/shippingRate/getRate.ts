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
  try {
    const { country, province, order_value, weight } = request.query;

    let query = select()
      .from('cod_shipping_rate');

    // Match country
    if (country) {
      query = query.andWhere('country', '=', country);
    }

    // Match province (or NULL meaning "all provinces")
    if (province) {
      query = query.andWhere('province', 'IN', [province, null]);
    }

    // Match order value range
    if (order_value) {
      const val = parseFloat(order_value);
      query = query
        .andWhere('min_order_value', '<=', val)
        .andWhere('max_order_value', '>=', val);
    }

    // Match weight range
    if (weight) {
      const w = parseFloat(weight);
      query = query
        .andWhere('min_weight', '<=', w)
        .andWhere('max_weight', '>=', w);
    }

    const rates = await query.execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      rates: rates.map((r) => ({
        name: r.name,
        amount: parseFloat(r.amount)
      }))
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
