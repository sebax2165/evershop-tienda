import { execute } from '@evershop/postgres-query-builder';
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
      // Update existing version using correct column names from v1.0.0
      await execute(connection, `
        UPDATE "cod_form_version"
        SET "name" = $1,
            "bg_color" = $2,
            "btn_bg_color" = $3,
            "btn_text_color" = $4,
            "border_radius" = $5,
            "custom_css" = $6,
            "custom_html_top" = $7,
            "custom_html_bottom" = $8,
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "form_version_id" = $9
      `, [
        version_name || 'Default',
        bg_color || '#ffffff',
        btn_bg_color || '#e63946',
        btn_text_color || '#ffffff',
        border_radius ?? 8,
        custom_css || '',
        header_html || '',
        footer_html || '',
        versionId
      ]);

      // Update optional columns that may have been added by v1.2.0 migration
      const optionalUpdates = [
        { col: 'text_color', val: text_color || '#1a1a2e' },
        { col: 'btn_hover_color', val: btn_hover_color || '#c1121f' },
        { col: 'header_html', val: header_html || '' },
        { col: 'footer_html', val: footer_html || '' },
        { col: 'assigned_products', val: assigned_products || '' },
        { col: 'assigned_collections', val: assigned_collections || '' },
        { col: 'custom_button_text', val: custom_button_text || 'Completar Pedido' },
        { col: 'is_active', val: is_active ?? false }
      ];

      for (const upd of optionalUpdates) {
        try {
          await execute(connection, `
            UPDATE "cod_form_version" SET "${upd.col}" = $1 WHERE "form_version_id" = $2
          `, [upd.val, versionId]);
        } catch (e) {
          // Column may not exist yet, skip
        }
      }
    } else {
      // Insert new version
      const result = await execute(connection, `
        INSERT INTO "cod_form_version"
        ("name", "is_default", "bg_color", "btn_bg_color", "btn_text_color", "border_radius", "custom_css", "custom_html_top", "custom_html_bottom")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING "form_version_id"
      `, [
        version_name || 'Default',
        is_active ?? false,
        bg_color || '#ffffff',
        btn_bg_color || '#e63946',
        btn_text_color || '#ffffff',
        border_radius ?? 8,
        custom_css || '',
        header_html || '',
        footer_html || ''
      ]);
      versionId = result.rows[0].form_version_id;

      // Set optional columns if they exist
      const optionalSets = [
        { col: 'text_color', val: text_color || '#1a1a2e' },
        { col: 'btn_hover_color', val: btn_hover_color || '#c1121f' },
        { col: 'assigned_products', val: assigned_products || '' },
        { col: 'assigned_collections', val: assigned_collections || '' },
        { col: 'custom_button_text', val: custom_button_text || 'Completar Pedido' },
        { col: 'is_active', val: is_active ?? false }
      ];

      for (const upd of optionalSets) {
        try {
          await execute(connection, `
            UPDATE "cod_form_version" SET "${upd.col}" = $1 WHERE "form_version_id" = $2
          `, [upd.val, versionId]);
        } catch (e) {
          // Column may not exist
        }
      }
    }

    // If activating, deactivate others
    if (is_active) {
      try {
        await execute(connection, `
          UPDATE "cod_form_version" SET "is_default" = FALSE WHERE "form_version_id" != $1
        `, [versionId]);
        await execute(connection, `
          UPDATE "cod_form_version" SET "is_active" = FALSE WHERE "form_version_id" != $1
        `, [versionId]);
      } catch (e) {
        // is_active column may not exist
      }
    }

    // Delete and reinsert custom fields
    if (Array.isArray(fields)) {
      await execute(connection, `
        DELETE FROM "cod_form_custom_field" WHERE "form_version_id" = $1
      `, [versionId]);

      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        await execute(connection, `
          INSERT INTO "cod_form_custom_field"
          ("form_version_id", "field_type", "label", "placeholder", "is_required", "sort_order")
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          versionId,
          f.field_type || 'text',
          f.field_label || f.label || '',
          f.field_placeholder || f.placeholder || '',
          f.is_required ?? false,
          f.position ?? f.sort_order ?? i
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
