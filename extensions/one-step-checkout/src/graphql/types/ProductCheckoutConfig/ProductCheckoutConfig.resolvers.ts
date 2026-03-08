import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '@evershop/evershop/lib/util/camelCase';

export default {
  Product: {
    checkoutConfig: async (product, _, { pool }) => {
      try {
        const config = await select()
          .from('product_checkout_config')
          .where('product_id', '=', product.productId)
          .load(pool);

        if (!config) {
          return null;
        }

        return camelCase(config);
      } catch (e) {
        // Table may not exist if migration has not been run yet
        return null;
      }
    },
    oneStepCheckoutUrl: async (product, _, { pool }) => {
      try {
        const description = await select()
          .from('product_description')
          .where('product_description_product_id', '=', product.productId)
          .load(pool);

        if (!description || !description.url_key) {
          return null;
        }

        return `/comprar/${description.url_key}`;
      } catch (e) {
        return null;
      }
    }
  }
};
