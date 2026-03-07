import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // ──────────────────────────────────────────────
  // Table: cod_form_version
  // Form Designer - visual form versions
  // ──────────────────────────────────────────────
  await execute(connection, `
    CREATE TABLE IF NOT EXISTS "cod_form_version" (
      "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "store_id" INT DEFAULT 0,
      "version_name" VARCHAR NOT NULL DEFAULT 'Default',
      "is_active" BOOLEAN DEFAULT FALSE,
      "bg_color" VARCHAR DEFAULT '#ffffff',
      "text_color" VARCHAR DEFAULT '#1a1a2e',
      "btn_bg_color" VARCHAR DEFAULT '#e63946',
      "btn_text_color" VARCHAR DEFAULT '#ffffff',
      "btn_hover_color" VARCHAR DEFAULT '#c1121f',
      "border_radius" INT DEFAULT 8,
      "custom_css" TEXT DEFAULT '',
      "header_html" TEXT DEFAULT '',
      "footer_html" TEXT DEFAULT '',
      "assigned_products" TEXT DEFAULT '',
      "assigned_collections" TEXT DEFAULT '',
      "custom_button_text" VARCHAR DEFAULT 'Completar Pedido',
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ──────────────────────────────────────────────
  // Table: cod_form_custom_field
  // Custom fields for form versions
  // ──────────────────────────────────────────────
  await execute(connection, `
    CREATE TABLE IF NOT EXISTS "cod_form_custom_field" (
      "id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "store_id" INT DEFAULT 0,
      "form_version_id" INT NOT NULL,
      "field_type" VARCHAR NOT NULL DEFAULT 'text',
      "field_label" VARCHAR NOT NULL,
      "field_placeholder" VARCHAR DEFAULT '',
      "field_options" TEXT DEFAULT '',
      "is_required" BOOLEAN DEFAULT FALSE,
      "position" INT DEFAULT 0,
      "is_active" BOOLEAN DEFAULT TRUE,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FK_CUSTOM_FIELD_FORM_VERSION" FOREIGN KEY ("form_version_id") REFERENCES "cod_form_version" ("id") ON DELETE CASCADE
    )
  `);

  await execute(connection, `
    CREATE INDEX IF NOT EXISTS "IDX_CUSTOM_FIELD_VERSION"
    ON "cod_form_custom_field" ("form_version_id", "position")
  `);
};
