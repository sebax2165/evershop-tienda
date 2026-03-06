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
    const { product_id } = request.params;

    const offers = await select()
      .from('cod_quantity_offer')
      .where('product_id', '=', parseInt(product_id, 10))
      .andWhere('enabled', '=', true)
      .orderBy('sort_order', 'ASC')
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      data: offers
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
