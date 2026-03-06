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

    const upsells = await select(
      'u.*',
      'p.name AS offer_product_name',
      'pd.price AS offer_product_price',
      'pi.origin_image AS offer_product_image'
    )
      .from('cod_upsell', 'u')
      .leftJoin('product_description', 'pd')
      .on('u.offer_product_id', '=', 'pd.product_description_product_id')
      .leftJoin('product', 'p')
      .on('u.offer_product_id', '=', 'p.product_id')
      .leftJoin('product_image', 'pi')
      .on('u.offer_product_id', '=', 'pi.product_image_product_id')
      .andWhere('pi.is_main', '=', true)
      .where('u.trigger_product_id', '=', parseInt(product_id, 10))
      .andWhere('u.enabled', '=', true)
      .orderBy('u.sort_order', 'ASC')
      .execute(pool);

    // Group by upsell type
    const grouped = {
      one_tick: upsells.filter((u) => u.upsell_type === 'one_tick'),
      one_click: upsells.filter((u) => u.upsell_type === 'one_click')
    };

    response.status(OK);
    return response.json({
      success: true,
      data: grouped
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
