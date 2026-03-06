import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';

export default (request) => {
  setPageMetaInfo(request, {
    title: 'Dominio personalizado',
    description: 'Dominio personalizado'
  });
};
