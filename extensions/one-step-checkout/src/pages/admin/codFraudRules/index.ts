export default (request, response) => {
  request.locals = request.locals || {};
  request.locals.pageMetaInfo = {
    title: 'Prevencion de Fraude',
    description: 'Administrar reglas de prevencion de fraude COD'
  };
};
