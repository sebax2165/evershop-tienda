import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import { setContextValue } from '@evershop/evershop/graphql/services';

export default async (request, response, next) => {
  try {
    const { url_key } = request.params;

    const query = select();
    query
      .from('product')
      .leftJoin('product_description')
      .on(
        'product.product_id',
        '=',
        'product_description.product_description_product_id'
      );
    query.where('product_description.url_key', '=', url_key);
    query.andWhere('product.status', '=', 1);
    const product = await query.load(pool);

    if (product === null) {
      response.status(404);
      next();
      return;
    }

    // Load checkout config for this product (may be null)
    const checkoutConfig = await select()
      .from('product_checkout_config')
      .where('product_id', '=', product.product_id)
      .load(pool);

    setContextValue(request, 'productId', product.product_id);
    setContextValue(request, 'currentProductId', product.product_id);
    setContextValue(request, 'checkoutConfig', checkoutConfig);
    setContextValue(request, 'pageInfo', {
      title: product.meta_title || product.name,
      description: product.meta_description || product.name
    });

    next();
  } catch (e) {
    next(e);
  }
};
