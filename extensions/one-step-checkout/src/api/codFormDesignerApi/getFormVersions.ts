import { select } from '@evershop/postgres-query-builder';
import { pool } from '@evershop/evershop/lib/postgres';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  if (request.method !== 'GET') {
    return next();
  }

  try {
    const versions = await select()
      .from('cod_form_version')
      .orderBy('form_version_id', 'ASC')
      .execute(pool);

    const result = [];
    for (const version of versions) {
      const fields = await select()
        .from('cod_form_custom_field')
        .where('form_version_id', '=', version.form_version_id)
        .orderBy('sort_order', 'ASC')
        .execute(pool);

      result.push({
        id: version.form_version_id,
        version_name: version.name,
        is_active: version.is_active ?? version.is_default ?? false,
        bg_color: version.bg_color,
        text_color: version.text_color || '#1a1a2e',
        btn_bg_color: version.btn_bg_color,
        btn_text_color: version.btn_text_color,
        btn_hover_color: version.btn_hover_color,
        border_radius: version.border_radius,
        custom_css: version.custom_css || '',
        header_html: version.header_html || version.custom_html_top || '',
        footer_html: version.footer_html || version.custom_html_bottom || '',
        assigned_products: version.assigned_products || '',
        assigned_collections: version.assigned_collections || '',
        custom_button_text: version.custom_button_text || 'Completar Pedido',
        fields: fields.map((f) => ({
          id: f.field_id,
          field_type: f.field_type,
          field_label: f.field_label || f.label,
          field_placeholder: f.field_placeholder || f.placeholder || '',
          field_options: f.field_options || (f.options ? JSON.stringify(f.options) : ''),
          is_required: f.is_required,
          position: f.position ?? f.sort_order ?? 0,
          is_active: f.is_active ?? true
        }))
      });
    }

    response.status(OK);
    return response.json({
      success: true,
      data: result
    });
  } catch (e) {
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
