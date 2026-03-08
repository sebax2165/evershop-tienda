import bodyParser from 'body-parser';
export default async (request, response, next) => {
  bodyParser.json()(request, response, next);
};
