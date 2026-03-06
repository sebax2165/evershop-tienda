import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '@evershop/evershop/src/lib/util/camelCase.js';

export default {
  Product: {
    checkoutConfig: async (product, _, { pool }) => {
      const config = await select()
        .from('product_checkout_config')
        .where('product_id', '=', product.productId)
        .load(pool);

      if (!config) {
        return null;
      }

      return camelCase(config);
    },
    oneStepCheckoutUrl: async (product, _, { pool }) => {
      const description = await select()
        .from('product_description')
        .where('product_description_product_id', '=', product.productId)
        .load(pool);

      if (!description || !description.url_key) {
        return null;
      }

      return `/comprar/${description.url_key}`;
    }
  }
};
