export default async (request, response, next) => {
  try {
    // Set page meta info
    request.locals = request.locals || {};
    request.locals.pageInfo = {
      title: 'Configuracion Dropi',
      description: 'Configurar la integracion con Dropi dropshipping'
    };
    next();
  } catch (e) {
    next(e);
  }
};
