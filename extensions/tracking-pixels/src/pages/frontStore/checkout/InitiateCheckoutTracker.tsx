import React from 'react';

interface InitiateCheckoutTrackerProps {
  trackingSettings: {
    facebookPixelId: string | null;
    facebookEnabled: boolean;
    tiktokPixelId: string | null;
    tiktokEnabled: boolean;
  } | null;
}

export default function InitiateCheckoutTracker({
  trackingSettings
}: InitiateCheckoutTrackerProps) {
  if (!trackingSettings) {
    return null;
  }

  const hasFb =
    trackingSettings.facebookEnabled && trackingSettings.facebookPixelId;
  const hasTt =
    trackingSettings.tiktokEnabled && trackingSettings.tiktokPixelId;

  if (!hasFb && !hasTt) {
    return null;
  }

  let script = '';

  if (hasFb) {
    script += `
      if (typeof fbq === 'function') {
        fbq('track', 'InitiateCheckout');
      }
    `;
  }

  if (hasTt) {
    script += `
      if (typeof ttq !== 'undefined') {
        ttq.track('InitiateCheckout');
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
    trackingSettings {
      facebookPixelId
      facebookEnabled
      tiktokPixelId
      tiktokEnabled
    }
  }
`;
