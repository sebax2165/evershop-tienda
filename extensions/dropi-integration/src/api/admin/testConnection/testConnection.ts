import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';
import { testConnection } from '../../../services/dropiApi.js';

export default async (request, response) => {
  try {
    let { token, environment } = request.body || {};

    // Si no se envian credenciales en el body, usar las guardadas
    if (!token) {
      // Try dropi_config table first
      const config = await select()
        .from('dropi_config')
        .load(pool);

      if (config && config.api_key) {
        token = config.api_key;
        environment = environment || config.environment || 'test';
      } else {
        // Fallback: read from EverShop setting table
        const { getSetting } = await import('@evershop/evershop/setting/services');
        const settingToken = await getSetting('dropiApiKey', null);
        if (settingToken) {
          token = settingToken;
          const settingEnv = await getSetting('dropiEnvironment', 'test');
          environment = environment || settingEnv || 'test';
        }
      }

      if (!token) {
        response.status(INVALID_PAYLOAD);
        return response.json({
          success: false,
          message: 'No se proporcionaron credenciales y no hay configuracion guardada'
        });
      }
    }

    environment = environment || 'test';

    const result = await testConnection(token, environment);

    response.status(OK);
    return response.json({
      success: result.success,
      message: result.message,
      environment
    });
  } catch (e) {
    console.error('[Dropi] Error en prueba de conexion:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: `Error inesperado: ${(e as Error).message}`
    });
  }
};
