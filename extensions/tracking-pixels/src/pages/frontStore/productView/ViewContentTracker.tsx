import React from 'react';

interface ViewContentTrackerProps {
  product: {
    name: string;
    productId: number;
    sku: string;
    price: {
      regular: {
        value: number;
        currency: string;
      };
    };
  } | null;
  trackingSettings: {
    facebookPixelId: string | null;
    facebookEnabled: boolean;
    tiktokPixelId: string | null;
    tiktokEnabled: boolean;
  } | null;
}

export default function ViewContentTracker({
  product,
  trackingSettings
}: ViewContentTrackerProps) {
  if (!product || !trackingSettings) {
    return null;
  }

  const hasFb =
    trackingSettings.facebookEnabled && trackingSettings.facebookPixelId;
  const hasTt =
    trackingSettings.tiktokEnabled && trackingSettings.tiktokPixelId;

  if (!hasFb && !hasTt) {
    return null;
  }

  const contentData = {
    content_name: product.name,
    content_ids: [String(product.sku || product.productId)],
    content_type: 'product',
    value: product.price?.regular?.value || 0,
    currency: product.price?.regular?.currency || 'USD'
  };

  let script = '';

  if (hasFb) {
    script += `
      if (typeof fbq === 'function') {
        fbq('track', 'ViewContent', ${JSON.stringify(contentData)});
      }
    `;
  }

  if (hasTt) {
    script += `
      if (typeof ttq !== 'undefined') {
        ttq.track('ViewContent', {
          content_id: '${product.sku || product.productId}',
          content_type: 'product',
          content_name: ${JSON.stringify(product.name)},
          value: ${product.price?.regular?.value || 0},
          currency: '${product.price?.regular?.currency || 'USD'}'
        });
      }
    `;
  }

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export const layout = {
  areaId: 'head',
  sortOrder: 3
};

export const query = `
  query Query {
    product(id: getContextValue("productId", null)) {
      name
      productId
      sku
      price {
        regular {
          value
          currency
        }
      }
    }
    trackingSettings {
      facebookPixelId
      facebookEnabled
      tiktokPixelId
      tiktokEnabled
    }
  }
`;
