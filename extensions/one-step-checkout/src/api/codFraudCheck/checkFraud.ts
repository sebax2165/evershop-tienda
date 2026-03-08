import {
  select
} from '@evershop/postgres-query-builder';
import {
  pool
} from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  try {
    const { phone, email, ip_address } = request.body;

    // Check if user is blocked by IP
    if (ip_address) {
      const blockedByIp = await select()
        .from('cod_blocked_user')
        .where('block_type', '=', 'ip')
        .andWhere('block_value', '=', ip_address)
        .load(pool);

      if (blockedByIp) {
        response.status(403);
        return response.json({
          allowed: false,
          reason: 'IP address is blocked'
        });
      }
    }

    // Check if user is blocked by phone
    if (phone) {
      const blockedByPhone = await select()
        .from('cod_blocked_user')
        .where('block_type', '=', 'phone')
        .andWhere('block_value', '=', phone)
        .load(pool);

      if (blockedByPhone) {
        response.status(403);
        return response.json({
          allowed: false,
          reason: 'Phone number is blocked'
        });
      }
    }

    // Check if user is blocked by email
    if (email) {
      const blockedByEmail = await select()
        .from('cod_blocked_user')
        .where('block_type', '=', 'email')
        .andWhere('block_value', '=', email)
        .load(pool);

      if (blockedByEmail) {
        response.status(403);
        return response.json({
          allowed: false,
          reason: 'Email address is blocked'
        });
      }
    }

    // Load rate limit settings from cod_settings
    const maxAttemptsRow = await select()
      .from('cod_settings')
      .where('setting_key', '=', 'max_order_attempts_24h')
      .load(pool);

    const maxAttempts = maxAttemptsRow
      ? parseInt(maxAttemptsRow.setting_value, 10)
      : 10; // default 10 attempts per 24h

    // Check rate limits from cod_order_attempt (last 24 hours)
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    let attemptCount = 0;

    // Count attempts by IP
    if (ip_address) {
      const ipAttempts = await select('COUNT(*)')
        .from('cod_order_attempt')
        .where('ip_address', '=', ip_address)
        .andWhere('created_at', '>=', twentyFourHoursAgo)
        .load(pool);

      attemptCount = Math.max(attemptCount, parseInt(ipAttempts?.count || '0', 10));
    }

    // Count attempts by phone
    if (phone) {
      const phoneAttempts = await select('COUNT(*)')
        .from('cod_order_attempt')
        .where('phone', '=', phone)
        .andWhere('created_at', '>=', twentyFourHoursAgo)
        .load(pool);

      attemptCount = Math.max(attemptCount, parseInt(phoneAttempts?.count || '0', 10));
    }

    // Count attempts by email
    if (email) {
      const emailAttempts = await select('COUNT(*)')
        .from('cod_order_attempt')
        .where('email', '=', email)
        .andWhere('created_at', '>=', twentyFourHoursAgo)
        .load(pool);

      attemptCount = Math.max(attemptCount, parseInt(emailAttempts?.count || '0', 10));
    }

    if (attemptCount >= maxAttempts) {
      response.status(429);
      return response.json({
        allowed: false,
        reason: 'Too many order attempts in the last 24 hours'
      });
    }

    response.status(OK);
    return response.json({
      allowed: true,
      reason: null
    });
  } catch (e) {
    console.error('[FraudCheck] Error:', (e as Error).message);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: 'Error interno al verificar la solicitud'
    });
  }
};
