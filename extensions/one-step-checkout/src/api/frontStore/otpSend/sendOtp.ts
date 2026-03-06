import { select, insert, update, execute } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR,
  INVALID_PAYLOAD
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response) => {
  try {
    const { phone } = request.body || {};

    if (!phone) {
      response.status(INVALID_PAYLOAD);
      return response.json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Check for existing valid verification
    const existingVerification = await select()
      .from('cod_otp_verification')
      .where('phone', '=', phone)
      .andWhere('expires_at', '>', 'NOW()')
      .execute(pool);

    if (existingVerification.length > 0) {
      response.status(OK);
      return response.json({
        success: true,
        data: { alreadyVerified: true }
      });
    }

    // Generate 6-digit OTP code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP with 5-minute expiry
    await insert('cod_otp_code')
      .given({
        phone,
        code,
        verified: false,
        attempts: 0,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      })
      .execute(pool);

    // Fetch Telesign credentials from settings
    const settings = await select()
      .from('cod_settings')
      .where('setting_key', 'IN', ['telesign_customer_id', 'telesign_api_key', 'otp_channel'])
      .execute(pool);

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.setting_key] = s.setting_value;
    }

    const customerId = settingsMap['telesign_customer_id'];
    const apiKey = settingsMap['telesign_api_key'];
    const channel = settingsMap['otp_channel'] || 'sms';

    let sent = false;
    let usedChannel = channel;

    if (customerId && apiKey) {
      const authHeader =
        'Basic ' + Buffer.from(`${customerId}:${apiKey}`).toString('base64');

      let apiUrl: string;
      let logCategory: string;

      if (channel === 'whatsapp') {
        apiUrl = 'https://rest-wap.telesign.com/v1/verify/whatsapp';
        logCategory = 'whatsapp_auth';
      } else {
        apiUrl = 'https://rest-api.telesign.com/v1/verify/sms';
        logCategory = 'sms';
        usedChannel = 'sms';
      }

      try {
        const apiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader
          },
          body: JSON.stringify({
            phone_number: phone,
            verify_code: code
          })
        });

        sent = apiResponse.ok;

        // Log the message
        await insert('cod_message_log')
          .given({
            phone,
            category: logCategory,
            status: sent ? 'sent' : 'failed',
            created_at: new Date().toISOString()
          })
          .execute(pool);

        // Deduct from messaging credit balance
        if (sent) {
          await execute(
            pool,
            `UPDATE cod_messaging_credit SET balance = balance - 1, updated_at = NOW() WHERE balance > 0`
          );
        }
      } catch (apiError) {
        // Log failure but don't break the flow
        await insert('cod_message_log')
          .given({
            phone,
            category: channel === 'whatsapp' ? 'whatsapp_auth' : 'sms',
            status: 'error',
            error_message: apiError.message,
            created_at: new Date().toISOString()
          })
          .execute(pool);
      }
    }

    response.status(OK);
    return response.json({
      success: true,
      data: {
        sent: sent || !customerId,
        channel: usedChannel
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
