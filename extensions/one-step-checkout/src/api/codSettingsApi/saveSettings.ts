import { select, insertOnUpdate } from '@evershop/postgres-query-builder';
import { pool, getConnection } from '@evershop/evershop/lib/postgres';
import { commit, rollback } from '@evershop/postgres-query-builder';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  if (request.method !== 'POST') {
    return next();
  }

  const connection = await getConnection(pool);

  try {
    const body = request.body || {};

    const allowedKeys = [
      'fraud_max_orders_per_ip_24h',
      'fraud_max_orders_per_phone_24h',
      'fraud_max_orders_per_email_24h',
      'otp_enabled',
      'otp_provider',
      'otp_channel',
      'otp_timing',
      'otp_expiry_minutes',
      'otp_max_attempts',
      'telesign_customer_id',
      'telesign_api_key',
      'partial_payment_enabled',
      'partial_payment_deposit_type',
      'partial_payment_deposit_value'
    ];

    for (const key of Object.keys(body)) {
      if (!allowedKeys.includes(key)) {
        continue;
      }
      const value = String(body[key]);

      // Check if setting exists
      const existing = await select()
        .from('cod_settings')
        .where('setting_key', '=', key)
        .load(connection);

      if (existing) {
        // Update existing setting
        await connection.query(
          `UPDATE "cod_settings" SET "setting_value" = $1, "updated_at" = CURRENT_TIMESTAMP WHERE "setting_key" = $2`,
          [value, key]
        );
      } else {
        // Insert new setting
        await connection.query(
          `INSERT INTO "cod_settings" ("setting_key", "setting_value") VALUES ($1, $2)`,
          [key, value]
        );
      }
    }

    await commit(connection);

    response.status(OK);
    return response.json({
      success: true,
      message: 'Configuracion guardada correctamente'
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
