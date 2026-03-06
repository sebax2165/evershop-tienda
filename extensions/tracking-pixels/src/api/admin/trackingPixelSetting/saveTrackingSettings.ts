import {
  commit,
  insertOnUpdate,
  rollback
} from '@evershop/postgres-query-builder';
import {
  getConnection,
  pool
} from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';
import { refreshSetting } from '@evershop/evershop/modules/setting/services/setting';

const ALLOWED_KEYS = [
  'trackingFacebookPixelId',
  'trackingFacebookAccessToken',
  'trackingFacebookEnabled',
  'trackingTiktokPixelId',
  'trackingTiktokAccessToken',
  'trackingTiktokEnabled'
];

export default async (request, response, next) => {
  const { body } = request;
  const connection = await getConnection();

  try {
    const promises = [];

    for (const key of ALLOWED_KEYS) {
      if (body[key] !== undefined) {
        const value = body[key];
        if (typeof value === 'object') {
          promises.push(
            insertOnUpdate('setting', ['name'])
              .given({
                name: key,
                value: JSON.stringify(value),
                is_json: 1
              })
              .execute(connection, false)
          );
        } else {
          promises.push(
            insertOnUpdate('setting', ['name'])
              .given({
                name: key,
                value: String(value),
                is_json: 0
              })
              .execute(connection, false)
          );
        }
      }
    }

    await Promise.all(promises);
    await commit(connection);
    await refreshSetting();

    response.status(OK);
    response.json({
      data: {},
      success: true,
      message: 'Configuracion de pixeles guardada correctamente'
    });
  } catch (error) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: {
        status: INTERNAL_SERVER_ERROR,
        message: error.message
      }
    });
  }
};
