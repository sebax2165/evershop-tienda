export default (request, response) => {
  request.locals = request.locals || {};
  request.locals.pageMetaInfo = {
    title: 'Panel de Control COD',
    description: 'Estadisticas del formulario COD'
  };
};
