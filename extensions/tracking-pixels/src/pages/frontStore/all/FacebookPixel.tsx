import React from 'react';

interface FacebookPixelProps {
  trackingSettings: {
    facebookPixelId: string | null;
    facebookEnabled: boolean;
  } | null;
}

export default function FacebookPixel({
  trackingSettings
}: FacebookPixelProps) {
  if (
    !trackingSettings ||
    !trackingSettings.facebookEnabled ||
    !trackingSettings.facebookPixelId
  ) {
    return null;
  }

  // Sanitize pixel ID to prevent XSS via dangerouslySetInnerHTML
  const pixelId = trackingSettings.facebookPixelId.replace(
    /[^a-zA-Z0-9]/g,
    ''
  );

  const pixelScript = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/es_LA/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
  `;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: pixelScript }} />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

export const layout = {
  areaId: 'head',
  sortOrder: 1
};

export const query = `
  query Query {
    trackingSettings {
      facebookPixelId
      facebookEnabled
    }
  }
`;
