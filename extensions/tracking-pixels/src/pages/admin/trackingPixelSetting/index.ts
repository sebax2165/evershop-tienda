import { setPageMetaInfo } from '@evershop/evershop/cms/services';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'Pixeles de Seguimiento',
    description: 'Configuracion de Facebook Pixel y TikTok Pixel'
  });
};
