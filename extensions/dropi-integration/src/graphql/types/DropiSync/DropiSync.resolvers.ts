import { select } from '@evershop/postgres-query-builder';
import { camelCase } from '@evershop/evershop/lib/util/camelCase';

export default {
  Setting: {
    dropiApiKey: (setting) => {
      const row = setting.find((s) => s.name === 'dropiApiKey');
      return row ? row.value : null;
    },
    dropiEnvironment: (setting) => {
      const row = setting.find((s) => s.name === 'dropiEnvironment');
      return row ? row.value : null;
    },
    dropiAutoSync: (setting) => {
      const row = setting.find((s) => s.name === 'dropiAutoSync');
      return row ? row.value : null;
    }
  },
  Query: {
    dropiOrderSync: async (_root: any, { orderUuid }: { orderUuid: string }, { pool }: any) => {
      try {
        const order = await select()
          .from('order')
          .where('uuid', '=', orderUuid)
          .load(pool);

        if (!order) {
          return null;
        }

        const sync = await select()
          .from('dropi_order_sync')
          .where('evershop_order_id', '=', order.order_id)
          .orderBy('sync_id', 'DESC')
          .load(pool);

        if (!sync) {
          return null;
        }

        return camelCase(sync);
      } catch {
        return null;
      }
    },

    dropiProductMappings: async (_root: any, _args: any, { pool }: any) => {
      try {
        const query = select().from('dropi_product_map');
        query.leftJoin('product').on('dropi_product_map.evershop_product_id', '=', 'product.product_id');
        query.leftJoin('product_description').on(
          'product.product_id',
          '=',
          'product_description.product_description_product_id'
        );
        const mappings = await query.execute(pool);

        return mappings.map((m: any) => ({
          mapId: m.map_id,
          evershopProductId: m.evershop_product_id,
          dropiProductId: m.dropi_product_id,
          dropiVariationId: m.dropi_variation_id,
          dropiProductName: m.dropi_product_name,
          productName: m.name || `Producto #${m.evershop_product_id}`
        }));
      } catch {
        return [];
      }
    }
  }
};
