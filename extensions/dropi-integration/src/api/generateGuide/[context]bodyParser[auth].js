const bodyParser = require('body-parser');
module.exports = (request, response, delegate, next) => {
  bodyParser.json()(request, response, next);
};
