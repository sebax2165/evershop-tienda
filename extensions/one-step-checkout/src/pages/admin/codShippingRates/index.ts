export default (request, response) => {
  request.locals = request.locals || {};
  request.locals.pageMetaInfo = {
    title: 'Tarifas de Envio',
    description: 'Administrar tarifas de envio para pedidos COD'
  };
};
