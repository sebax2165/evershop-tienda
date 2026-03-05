import sanitize from 'sanitize-html';
import { v4 as uuidv4 } from 'uuid';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';
import { CMSPageCollection } from '../../../services/CMSPageCollection.js';
import { getCmsPagesBaseQuery } from '../../../services/getCmsPagesBaseQuery.js';

export default {
  Query: {
    cmsPage: async (root, { id }, { pool }) => {
      const query = getCmsPagesBaseQuery();
      query.where('cms_page_id', '=', id);
      const page = await query.load(pool);
      return page ? camelCase(page) : null;
    },
    cmsPages: async (_, { filters = [] }, { user }) => {
      const query = getCmsPagesBaseQuery();
      const root = new CMSPageCollection(query);
      await root.init(filters, !!user);
      return root;
    },
    currentCmsPage: async (_, args, { currentRoute, pool }) => {
      if (currentRoute?.id !== 'cmsPageView') {
        return null;
      }
      const { params } = currentRoute;
      if (!params || !params.url_key) {
        return null;
      }
      const query = getCmsPagesBaseQuery();
      query.where('cms_page_description.url_key', '=', params.url_key);
      const page = await query.load(pool);
      return page ? camelCase(page) : null;
    }
  },
  CmsPage: {
    url: ({ urlKey }) => buildUrl('cmsPageView', { url_key: urlKey }),
    editUrl: ({ uuid }) => buildUrl('cmsPageEdit', { id: uuid }),
    updateApi: (page) => buildUrl('updateCmsPage', { id: page.uuid }),
    deleteApi: (page) => buildUrl('deleteCmsPage', { id: page.uuid }),
    content: ({ content }) => {
      try {
        const json = JSON.parse(content);
        // Loop through each row and find the columns with raw block type. Use dompurify to sanitize the HTML content.
        json.forEach((row: any) => {
          row.columns.forEach((column: any) => {
            column.data.blocks.forEach((block: any) => {
              if (block.type === 'raw' && block.data.html) {
                const replacements = {
                  '&lt;': '<',
                  '&gt;': '>'
                };
                const jsonText = block.data.html
                  ? block.data.html.replace(
                      /&lt;|&gt;/g,
                      (match) => replacements[match]
                    )
                  : '';
                block.data.html = sanitize(jsonText);
              }
            });
          });
        });
        return json;
      } catch (e) {
        // This is for backward compatibility. If the content is not a JSON string then it is a raw HTML block
        const rowId = `r__${uuidv4()}`;
        return [
          {
            size: 1,
            id: rowId,
            columns: [
              {
                id: 'c__c5d90067-c786-4324-8e24-8e30520ac3d7',
                size: 1,
                data: {
                  time: 1723347125344,
                  blocks: [
                    {
                      id: 'AU89ItzUa7',
                      type: 'raw',
                      data: {
                        html: content
                      }
                    }
                  ],
                  version: '2.30.2'
                }
              }
            ]
          }
        ];
      }
    }
  }
};
