import crypto from 'crypto';
import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import { getSetting } from '@evershop/evershop/setting/services';
import { error as logError, debug } from '@evershop/evershop/lib/log';

function sha256Hash(value: string): string {
  if (!value) return '';
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex');
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
    userData.ph = sha256Hash(shippingAddress.telephone);
  }
  if (shippingAddress?.full_name) {
    const nameParts = shippingAddress.full_name.split(' ');
    if (nameParts.length > 0) {
      userData.fn = sha256Hash(nameParts[0]);
    }
    if (nameParts.length > 1) {
      userData.ln = sha256Hash(nameParts[nameParts.length - 1]);
    }
  }
  if (shippingAddress?.country) {
    userData.country = sha256Hash(shippingAddress.country);
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
    ]
  };

  try {
    const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      logError(
        `Facebook Conversions API error: ${response.status} - ${body}`
      );
    } else {
      const result = await response.json();
      debug(
        `Facebook Conversions API: Purchase event sent successfully. events_received: ${result?.events_received || 0}`
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
// Docs: https://business-api.tiktok.com/portal/docs
// ---------------------------------------------------------------------------

async function sendTikTokConversionEvent(
  pixelCode: string,
  accessToken: string,
  order: any,
  items: any[],
  shippingAddress: any
) {
  const eventTime = Math.floor(Date.now() / 1000);

  // User data — hashed where required
  const user: Record<string, any> = {};
  if (shippingAddress?.email) {
    user.email = sha256Hash(shippingAddress.email);
  }
  if (shippingAddress?.telephone) {
    // TikTok requires phone with country code prefix, hashed
    let phone = shippingAddress.telephone.replace(/\s+/g, '');
    if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }
    user.phone = sha256Hash(phone);
  }
  if (shippingAddress?.full_name) {
    user.external_id = sha256Hash(
      shippingAddress.full_name + '_' + (shippingAddress.telephone || '')
    );
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
    event_source_id: pixelCode,
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
        `TikTok Events API: CompletePayment event sent successfully. Response: ${body}`
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

    // Facebook Conversions API
    const fbEnabled = await getSetting('trackingFacebookEnabled', '');
    const fbPixelId = await getSetting('trackingFacebookPixelId', '');
    const fbAccessToken = await getSetting(
      'trackingFacebookAccessToken',
      ''
    );

    if (
      (fbEnabled === '1' || fbEnabled === 'true' || fbEnabled === true) &&
      fbPixelId &&
      fbAccessToken
    ) {
      await sendFacebookConversionEvent(
        fbPixelId,
        fbAccessToken,
        order,
        items,
        shippingAddress
      );
    }

    // TikTok Events API
    const ttEnabled = await getSetting('trackingTiktokEnabled', '');
    const ttPixelId = await getSetting('trackingTiktokPixelId', '');
    const ttAccessToken = await getSetting(
      'trackingTiktokAccessToken',
      ''
    );

    if (
      (ttEnabled === '1' || ttEnabled === 'true' || ttEnabled === true) &&
      ttPixelId &&
      ttAccessToken
    ) {
      await sendTikTokConversionEvent(
        ttPixelId,
        ttAccessToken,
        order,
        items,
        shippingAddress
      );
    }
  } catch (err) {
    logError(
      `sendConversionEvents failed: ${(err as Error).message}`
    );
  }
}
