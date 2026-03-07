export default (request, response) => {
  request.locals = request.locals || {};
  request.locals.pageMetaInfo = {
    title: 'Ofertas por Cantidad',
    description: 'Administrar ofertas por cantidad de productos COD'
  };
};
