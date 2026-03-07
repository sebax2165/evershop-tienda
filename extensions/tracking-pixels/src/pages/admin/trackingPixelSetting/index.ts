export default (request) => {
  request.locals = request.locals || {};
  request.locals.pageMetaInfo = {
    title: 'Pixeles de Seguimiento',
    description: 'Configuracion de Facebook Pixel y TikTok Pixel'
  };
};
