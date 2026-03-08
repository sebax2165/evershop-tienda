import {
  select,
  insert,
  update,
  insertOnUpdate,
  commit,
  rollback
} from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import { getConnection } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  // Handle GET - return current Dropi settings
  if (request.method === 'GET') {
    try {
      const config = await select()
        .from('dropi_config')
        .load(pool);

      const mappings = await select()
        .from('dropi_product_map')
        .execute(pool);

      response.status(OK);
      return response.json({
        success: true,
        data: {
          config: config || null,
          productMappings: mappings || []
        }
      });
    } catch (e) {
      response.status(INTERNAL_SERVER_ERROR);
      return response.json({
        success: false,
        message: e.message
      });
    }
  }

  // Handle POST - save Dropi settings
  const connection = await getConnection();
  try {
    const {
      api_key,
      environment,
      enabled,
      auto_sync,
      // Product mapping fields
      product_mappings
    } = request.body || {};

    // Save/update the main Dropi config
    const existing = await select()
      .from('dropi_config')
      .execute(pool);

    const configData: Record<string, any> = {};
    if (api_key !== undefined) configData.api_key = api_key;
    if (environment !== undefined) configData.environment = environment;
    if (enabled !== undefined) configData.enabled = enabled === true || enabled === 'true' || enabled === 1 || enabled === '1';
    if (auto_sync !== undefined) configData.auto_sync = auto_sync === true || auto_sync === 'true' || auto_sync === 1 || auto_sync === '1';
    configData.updated_at = new Date().toISOString();

    if (existing.length > 0) {
      await update('dropi_config')
        .given(configData)
        .where('config_id', '=', existing[0].config_id)
        .execute(connection, false);
    } else {
      await insert('dropi_config')
        .given(configData)
        .execute(connection, false);
    }

    // Handle product mappings if provided
    if (Array.isArray(product_mappings)) {
      for (const mapping of product_mappings) {
        if (!mapping.evershop_product_id || !mapping.dropi_product_id) {
          continue;
        }
        await insertOnUpdate('dropi_product_map', ['evershop_product_id'])
          .given({
            evershop_product_id: mapping.evershop_product_id,
            dropi_product_id: mapping.dropi_product_id,
            dropi_variation_id: mapping.dropi_variation_id || null,
            dropi_product_name: mapping.dropi_product_name || null,
            updated_at: new Date().toISOString()
          })
          .execute(connection, false);
      }
    }

    await commit(connection);

    response.status(OK);
    return response.json({
      success: true,
      message: 'Configuracion de Dropi guardada correctamente'
    });
  } catch (e) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
