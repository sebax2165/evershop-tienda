import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Add missing columns to cod_form_version if they don't exist
  const columnsToAdd = [
    { table: 'cod_form_version', column: 'text_color', type: "VARCHAR DEFAULT '#1a1a2e'" },
    { table: 'cod_form_version', column: 'btn_hover_color', type: "VARCHAR DEFAULT '#c1121f'" },
    { table: 'cod_form_version', column: 'header_html', type: "TEXT DEFAULT ''" },
    { table: 'cod_form_version', column: 'footer_html', type: "TEXT DEFAULT ''" },
    { table: 'cod_form_version', column: 'assigned_products', type: "TEXT DEFAULT ''" },
    { table: 'cod_form_version', column: 'assigned_collections', type: "TEXT DEFAULT ''" },
    { table: 'cod_form_version', column: 'custom_button_text', type: "VARCHAR DEFAULT 'Completar Pedido'" }
  ];

  for (const col of columnsToAdd) {
    try {
      await execute(
        connection,
        `ALTER TABLE "${col.table}" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.type}`
      );
    } catch (e) {
      // Column may already exist, ignore
    }
  }

  // Add is_active column if missing (v1.0.0 used is_default)
  try {
    await execute(
      connection,
      `ALTER TABLE "cod_form_version" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT FALSE`
    );
  } catch (e) {
    // ignore
  }

  // Add position column to cod_form_custom_field if missing (v1.0.0 used sort_order)
  try {
    await execute(
      connection,
      `ALTER TABLE "cod_form_custom_field" ADD COLUMN IF NOT EXISTS "position" INT DEFAULT 0`
    );
  } catch (e) {
    // ignore
  }

  // Add is_active column to cod_form_custom_field if missing
  try {
    await execute(
      connection,
      `ALTER TABLE "cod_form_custom_field" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT TRUE`
    );
  } catch (e) {
    // ignore
  }

  // Add field_label alias column if missing (v1.0.0 used label)
  try {
    await execute(
      connection,
      `ALTER TABLE "cod_form_custom_field" ADD COLUMN IF NOT EXISTS "field_label" VARCHAR DEFAULT ''`
    );
  } catch (e) {
    // ignore
  }

  // Add field_placeholder column if missing (v1.0.0 used placeholder)
  try {
    await execute(
      connection,
      `ALTER TABLE "cod_form_custom_field" ADD COLUMN IF NOT EXISTS "field_placeholder" VARCHAR DEFAULT ''`
    );
  } catch (e) {
    // ignore
  }

  // Add field_options column if missing (v1.0.0 used options as JSONB)
  try {
    await execute(
      connection,
      `ALTER TABLE "cod_form_custom_field" ADD COLUMN IF NOT EXISTS "field_options" TEXT DEFAULT ''`
    );
  } catch (e) {
    // ignore
  }
};
