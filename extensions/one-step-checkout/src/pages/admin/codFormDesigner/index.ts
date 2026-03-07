export default (request, response) => {
  request.locals = request.locals || {};
  request.locals.pageMetaInfo = {
    title: 'Disenador de Formulario',
    description: 'Disenador visual del formulario COD'
  };
};
