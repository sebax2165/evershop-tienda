export default (request, response) => {
  request.locals = request.locals || {};
  request.locals.pageMetaInfo = {
    title: 'Pedidos Abandonados',
    description: 'Ver pedidos abandonados del formulario COD'
  };
};
