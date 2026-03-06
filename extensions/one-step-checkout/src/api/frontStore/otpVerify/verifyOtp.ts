import { select, insert, update, execute } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  try {
    const { phone, code } = request.body || {};

    if (!phone || !code) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Phone and code are required'
      });
    }

    // Look up the OTP code entry
    const otpEntries = await select()
      .from('cod_otp_code')
      .where('phone', '=', phone)
      .andWhere('verified', '=', false)
      .andWhere('expires_at', '>', 'NOW()')
      .orderBy('created_at', 'DESC')
      .execute(pool);

    if (otpEntries.length === 0) {
      response.status(OK);
      return response.json({
        success: false,
        data: {
          verified: false,
          reason: 'No valid OTP found or OTP has expired'
        }
      });
    }

    const otpEntry = otpEntries[0];

    // Get max attempts setting
    const maxAttemptsSetting = await select()
      .from('cod_settings')
      .where('setting_key', '=', 'otp_max_attempts')
      .execute(pool);

    const maxAttempts =
      maxAttemptsSetting.length > 0
        ? parseInt(maxAttemptsSetting[0].setting_value, 10)
        : 5;

    // Increment attempts
    const newAttempts = (otpEntry.attempts || 0) + 1;

    await execute(
      pool,
      `UPDATE cod_otp_code SET attempts = $1 WHERE cod_otp_code_id = $2`,
      [newAttempts, otpEntry.cod_otp_code_id]
    );

    // Check if max attempts exceeded
    if (newAttempts > maxAttempts) {
      response.status(OK);
      return response.json({
        success: false,
        data: {
          verified: false,
          attemptsLeft: 0,
          reason: 'Maximum verification attempts exceeded'
        }
      });
    }

    // Check if code matches
    if (otpEntry.code !== code) {
      response.status(OK);
      return response.json({
        success: false,
        data: {
          verified: false,
          attemptsLeft: maxAttempts - newAttempts
        }
      });
    }

    // Code matches — mark as verified
    await execute(
      pool,
      `UPDATE cod_otp_code SET verified = true WHERE cod_otp_code_id = $1`,
      [otpEntry.cod_otp_code_id]
    );

    // Get otp_persist_days setting
    const persistSetting = await select()
      .from('cod_settings')
      .where('setting_key', '=', 'otp_persist_days')
      .execute(pool);

    const persistDays =
      persistSetting.length > 0
        ? parseInt(persistSetting[0].setting_value, 10)
        : 30;

    // Create verification entry
    const expiresAt = new Date(
      Date.now() + persistDays * 24 * 60 * 60 * 1000
    ).toISOString();

    await insert('cod_otp_verification')
      .given({
        phone,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })
      .execute(pool);

    response.status(OK);
    return response.json({
      success: true,
      data: {
        verified: true
      }
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
