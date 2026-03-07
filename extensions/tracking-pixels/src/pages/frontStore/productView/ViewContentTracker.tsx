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

  const contentId = String(product.sku || product.productId);
  const value = product.price?.regular?.value || 0;
  const currency = product.price?.regular?.currency || 'COP';

  let script = '';

  // Facebook Pixel - ViewContent
  if (hasFb) {
    script += `
      if (typeof fbq === 'function') {
        fbq('track', 'ViewContent', {
          content_name: ${JSON.stringify(product.name)},
          content_ids: ['${contentId}'],
          content_type: 'product',
          value: ${value},
          currency: '${currency}'
        });
      }
    `;
  }

  // TikTok Pixel - ViewContent
  // Uses ttq.track with proper content parameters per TikTok docs
  if (hasTt) {
    script += `
      if (typeof ttq !== 'undefined' && ttq.track) {
        ttq.track('ViewContent', {
          contents: [{
            content_id: '${contentId}',
            content_type: 'product',
            content_name: ${JSON.stringify(product.name)}
          }],
          value: ${value},
          currency: '${currency}'
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
