import { getSetting } from '@evershop/evershop/setting/services';

export default {
  // Resolver for the standalone trackingSettings query (used by frontStore pixels)
  Query: {
    trackingSettings: async () => {
      const facebookPixelId = await getSetting('trackingFacebookPixelId', '');
      const facebookEnabled = await getSetting('trackingFacebookEnabled', '');
      const tiktokPixelId = await getSetting('trackingTiktokPixelId', '');
      const tiktokEnabled = await getSetting('trackingTiktokEnabled', '');

      return {
        facebookPixelId: facebookPixelId || null,
        facebookEnabled:
          facebookEnabled === '1' ||
          facebookEnabled === 'true' ||
          facebookEnabled === true,
        tiktokPixelId: tiktokPixelId || null,
        tiktokEnabled:
          tiktokEnabled === '1' ||
          tiktokEnabled === 'true' ||
          tiktokEnabled === true
      };
    }
  },
  // Field resolvers for the extended Setting type (used by admin settings page)
  // The Setting query returns all rows from the 'setting' table as an array.
  // Each resolver receives that array and finds the matching key.
  Setting: {
    trackingFacebookPixelId: (setting) => {
      const row = setting.find((s) => s.name === 'trackingFacebookPixelId');
      return row ? row.value : null;
    },
    trackingFacebookAccessToken: (setting) => {
      const row = setting.find(
        (s) => s.name === 'trackingFacebookAccessToken'
      );
      return row ? row.value : null;
    },
    trackingFacebookEnabled: (setting) => {
      const row = setting.find((s) => s.name === 'trackingFacebookEnabled');
      return row ? row.value : null;
    },
    trackingTiktokPixelId: (setting) => {
      const row = setting.find((s) => s.name === 'trackingTiktokPixelId');
      return row ? row.value : null;
    },
    trackingTiktokAccessToken: (setting) => {
      const row = setting.find(
        (s) => s.name === 'trackingTiktokAccessToken'
      );
      return row ? row.value : null;
    },
    trackingTiktokEnabled: (setting) => {
      const row = setting.find((s) => s.name === 'trackingTiktokEnabled');
      return row ? row.value : null;
    }
  }
};
