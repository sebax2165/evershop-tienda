export default (request, response) => {
  request.locals = request.locals || {};
  request.locals.pageMetaInfo = {
    title: 'Configuracion COD',
    description: 'Configuracion general del formulario COD'
  };
};
