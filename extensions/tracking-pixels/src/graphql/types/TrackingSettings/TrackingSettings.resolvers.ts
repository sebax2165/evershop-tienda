import { getSetting } from '@evershop/evershop/setting/services';

export default {
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
  }
};
