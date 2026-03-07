import crypto from 'crypto';
import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import { getSetting } from '@evershop/evershop/setting/services';
import { error as logError, debug } from '@evershop/evershop/lib/log';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256Hash(value: string): string {
  if (!value) return '';
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex');
}

/** Normalize phone to E.164: strip non-digits, prepend country code */
function normalizePhone(phone: string, countryCode?: string): string {
  if (!phone) return '';
  // Strip all non-digit chars except leading +
  let digits = phone.replace(/[^\d+]/g, '');
  // Remove leading + to get pure digits
  if (digits.startsWith('+')) {
    digits = digits.substring(1);
  }
  // If it's a short number (no country code), prepend based on country
  const countryPhoneCodes: Record<string, string> = {
    CO: '57', MX: '52', AR: '54', CL: '56', PE: '51',
    EC: '593', BR: '55', VE: '58', PA: '507', CR: '506',
    DO: '1', GT: '502', HN: '504', SV: '503', BO: '591',
    PY: '595', UY: '598', NI: '505', US: '1', ES: '34'
  };
  // If number is 10 digits or less, it likely needs a country code
  if (digits.length <= 10 && countryCode) {
    const prefix = countryPhoneCodes[countryCode.toUpperCase()];
    if (prefix && !digits.startsWith(prefix)) {
      digits = prefix + digits;
    }
  }
  return '+' + digits;
}

/** Sanitize pixel ID to alphanumeric only */
function sanitizePixelId(id: string): string {
  return (id || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

// ---------------------------------------------------------------------------
// Facebook Conversions API
// https://developers.facebook.com/docs/marketing-api/conversions-api
// ---------------------------------------------------------------------------

async function sendFacebookConversionEvent(
  pixelId: string,
  accessToken: string,
  order: any,
  items: any[],
  shippingAddress: any
) {
  const eventTime = Math.floor(Date.now() / 1000);
  const userData: Record<string, string> = {};

  if (shippingAddress?.email) {
    userData.em = sha256Hash(shippingAddress.email);
  }
  if (shippingAddress?.telephone) {
    const phone = normalizePhone(
      shippingAddress.telephone,
      shippingAddress?.country
    );
    if (phone.length > 2) {
      userData.ph = sha256Hash(phone);
    }
  }
  if (shippingAddress?.full_name) {
    const nameParts = shippingAddress.full_name.trim().split(/\s+/);
    if (nameParts.length > 0) {
      userData.fn = sha256Hash(nameParts[0]);
    }
    if (nameParts.length > 1) {
      userData.ln = sha256Hash(nameParts[nameParts.length - 1]);
    }
  }
  if (shippingAddress?.country) {
    // Meta requires lowercase 2-letter ISO code
    const country = shippingAddress.country.trim().toLowerCase();
    if (country.length === 2) {
      userData.country = sha256Hash(country);
    }
  }
  if (shippingAddress?.city) {
    userData.ct = sha256Hash(shippingAddress.city);
  }
  if (shippingAddress?.postcode) {
    userData.zp = sha256Hash(shippingAddress.postcode);
  }

  const contentIds = items.map(
    (item) => item.product_sku || String(item.product_id)
  );
  const contents = items.map((item) => ({
    id: item.product_sku || String(item.product_id),
    quantity: item.qty,
    item_price: parseFloat(item.final_price) || 0
  }));

  const eventId = `purchase_${order.order_id}_${eventTime}`;

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: eventTime,
        action_source: 'website',
        event_id: eventId,
        user_data: userData,
        custom_data: {
          currency: order.currency || 'COP',
          value: parseFloat(order.grand_total) || 0,
          content_ids: contentIds,
          contents: contents,
          content_type: 'product',
          order_id: order.order_number || String(order.order_id),
          num_items: items.length
        }
      }
    ],
    // Pass access_token in body instead of URL for security
    access_token: accessToken
  };

  try {
    const safePixelId = sanitizePixelId(pixelId);
    const url = `https://graph.facebook.com/v21.0/${safePixelId}/events`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.text();
    if (!response.ok) {
      logError(
        `Facebook Conversions API error: ${response.status} - ${body}`
      );
    } else {
      debug(
        `Facebook Conversions API: Purchase event sent. ${body}`
      );
    }
  } catch (err) {
    logError(
      `Facebook Conversions API request failed: ${(err as Error).message}`
    );
  }
}

// ---------------------------------------------------------------------------
// TikTok Events API v1.3
// https://business-api.tiktok.com/open_api/v1.3/event/track/
// ---------------------------------------------------------------------------

async function sendTikTokConversionEvent(
  pixelCode: string,
  accessToken: string,
  order: any,
  items: any[],
  shippingAddress: any
) {
  const eventTime = Math.floor(Date.now() / 1000);

  // User data — hashed where required per TikTok spec
  const user: Record<string, any> = {};
  if (shippingAddress?.email) {
    user.email = sha256Hash(shippingAddress.email);
  }
  if (shippingAddress?.telephone) {
    const phone = normalizePhone(
      shippingAddress.telephone,
      shippingAddress?.country
    );
    if (phone.length > 2) {
      // TikTok: hash the E.164 phone number
      user.phone = sha256Hash(phone);
    }
  }

  // Contents array per TikTok spec
  const contents = items.map((item) => ({
    content_id: item.product_sku || String(item.product_id),
    content_type: 'product',
    content_name: item.product_name || '',
    quantity: item.qty,
    price: parseFloat(item.final_price) || 0
  }));

  const eventId = `purchase_${order.order_id}_${eventTime}`;

  // TikTok Events API v1.3 payload format
  const payload = {
    event_source: 'web',
    event_source_id: sanitizePixelId(pixelCode),
    data: [
      {
        event: 'CompletePayment',
        event_id: eventId,
        event_time: eventTime,
        user: user,
        properties: {
          currency: order.currency || 'COP',
          value: parseFloat(order.grand_total) || 0,
          contents: contents,
          content_type: 'product',
          order_id: order.order_number || String(order.order_id)
        }
      }
    ]
  };

  try {
    const url =
      'https://business-api.tiktok.com/open_api/v1.3/event/track/';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken
      },
      body: JSON.stringify(payload)
    });

    const body = await response.text();
    if (!response.ok) {
      logError(
        `TikTok Events API error: ${response.status} - ${body}`
      );
    } else {
      debug(
        `TikTok Events API: CompletePayment event sent. ${body}`
      );
    }
  } catch (err) {
    logError(
      `TikTok Events API request failed: ${(err as Error).message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Main subscriber handler
// ---------------------------------------------------------------------------

export default async function sendConversionEvents(data: {
  order_id: number;
  [key: string]: any;
}) {
  try {
    const orderId = data.order_id;

    const order = await select()
      .from('order')
      .where('order_id', '=', orderId)
      .load(pool);

    if (!order) {
      debug(`sendConversionEvents: Order ${orderId} not found`);
      return;
    }

    const items = await select()
      .from('order_item')
      .where('order_item_order_id', '=', orderId)
      .execute(pool);

    let shippingAddress = null;
    if (order.shipping_address_id) {
      shippingAddress = await select()
        .from('order_address')
        .where('order_address_id', '=', order.shipping_address_id)
        .load(pool);
    }
    if (!shippingAddress && order.billing_address_id) {
      shippingAddress = await select()
        .from('order_address')
        .where('order_address_id', '=', order.billing_address_id)
        .load(pool);
    }

    // Gather settings
    const fbEnabled = await getSetting('trackingFacebookEnabled', '');
    const fbPixelId = await getSetting('trackingFacebookPixelId', '');
    const fbAccessToken = await getSetting(
      'trackingFacebookAccessToken',
      ''
    );
    const ttEnabled = await getSetting('trackingTiktokEnabled', '');
    const ttPixelId = await getSetting('trackingTiktokPixelId', '');
    const ttAccessToken = await getSetting(
      'trackingTiktokAccessToken',
      ''
    );

    const isEnabled = (val: any) =>
      val === '1' || val === 'true' || val === true;

    // Fire both API calls in parallel
    const promises: Promise<void>[] = [];

    if (isEnabled(fbEnabled) && fbPixelId && fbAccessToken) {
      promises.push(
        sendFacebookConversionEvent(
          fbPixelId,
          fbAccessToken,
          order,
          items,
          shippingAddress
        )
      );
    }

    if (isEnabled(ttEnabled) && ttPixelId && ttAccessToken) {
      promises.push(
        sendTikTokConversionEvent(
          ttPixelId,
          ttAccessToken,
          order,
          items,
          shippingAddress
        )
      );
    }

    await Promise.allSettled(promises);
  } catch (err) {
    logError(
      `sendConversionEvents failed: ${(err as Error).message}`
    );
  }
}
