export default (request, response) => {
  request.locals = request.locals || {};
  request.locals.pageMetaInfo = {
    title: 'Gestion de Upsells',
    description: 'Administrar upsells de productos COD'
  };
};
