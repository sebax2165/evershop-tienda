import { select, insert, del, execute } from '@evershop/postgres-query-builder';
import { pool, getConnection } from '@evershop/evershop/lib/postgres';
import { commit, rollback } from '@evershop/postgres-query-builder';
import {
  OK,
  INTERNAL_SERVER_ERROR
} from '@evershop/evershop/lib/util/httpStatus';

export default async (request, response, next) => {
  if (request.method !== 'POST') {
    return next();
  }

  const connection = await getConnection(pool);

  try {
    const body = request.body || {};
    const {
      id,
      version_name,
      is_active,
      bg_color,
      text_color,
      btn_bg_color,
      btn_text_color,
      btn_hover_color,
      border_radius,
      custom_css,
      header_html,
      footer_html,
      assigned_products,
      assigned_collections,
      custom_button_text,
      fields
    } = body;

    let versionId = id;

    if (versionId) {
      // Update existing version
      await execute(connection, `
        UPDATE "cod_form_version"
        SET "version_name" = $1,
            "is_active" = $2,
            "bg_color" = $3,
            "text_color" = $4,
            "btn_bg_color" = $5,
            "btn_text_color" = $6,
            "btn_hover_color" = $7,
            "border_radius" = $8,
            "custom_css" = $9,
            "header_html" = $10,
            "footer_html" = $11,
            "assigned_products" = $12,
            "assigned_collections" = $13,
            "custom_button_text" = $14,
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = $15
      `, [
        version_name || 'Default',
        is_active ?? false,
        bg_color || '#ffffff',
        text_color || '#1a1a2e',
        btn_bg_color || '#e63946',
        btn_text_color || '#ffffff',
        btn_hover_color || '#c1121f',
        border_radius ?? 8,
        custom_css || '',
        header_html || '',
        footer_html || '',
        assigned_products || '',
        assigned_collections || '',
        custom_button_text || 'Completar Pedido',
        versionId
      ]);
    } else {
      // Insert new version
      const result = await execute(connection, `
        INSERT INTO "cod_form_version"
        ("version_name", "is_active", "bg_color", "text_color", "btn_bg_color", "btn_text_color", "btn_hover_color", "border_radius", "custom_css", "header_html", "footer_html", "assigned_products", "assigned_collections", "custom_button_text")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING "id"
      `, [
        version_name || 'Default',
        is_active ?? false,
        bg_color || '#ffffff',
        text_color || '#1a1a2e',
        btn_bg_color || '#e63946',
        btn_text_color || '#ffffff',
        btn_hover_color || '#c1121f',
        border_radius ?? 8,
        custom_css || '',
        header_html || '',
        footer_html || '',
        assigned_products || '',
        assigned_collections || '',
        custom_button_text || 'Completar Pedido'
      ]);
      versionId = result.rows[0].id;
    }

    // If activating this version, deactivate all others
    if (is_active) {
      await execute(connection, `
        UPDATE "cod_form_version" SET "is_active" = FALSE WHERE "id" != $1
      `, [versionId]);
    }

    // Delete existing custom fields and reinsert
    if (Array.isArray(fields)) {
      await execute(connection, `
        DELETE FROM "cod_form_custom_field" WHERE "form_version_id" = $1
      `, [versionId]);

      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        await execute(connection, `
          INSERT INTO "cod_form_custom_field"
          ("form_version_id", "field_type", "field_label", "field_placeholder", "field_options", "is_required", "position", "is_active")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          versionId,
          f.field_type || 'text',
          f.field_label || '',
          f.field_placeholder || '',
          f.field_options || '',
          f.is_required ?? false,
          f.position ?? i,
          f.is_active ?? true
        ]);
      }
    }

    await commit(connection);

    response.status(OK);
    return response.json({
      success: true,
      message: 'Version del formulario guardada correctamente',
      data: { id: versionId }
    });
  } catch (e) {
    await rollback(connection);
    response.status(INTERNAL_SERVER_ERROR);
    return response.json({
      success: false,
      message: e.message
    });
  }
};
