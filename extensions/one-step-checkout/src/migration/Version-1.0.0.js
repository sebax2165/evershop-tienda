import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // 1. Form configuration per product (enhanced)
  await execute(
    connection,
    `DROP TABLE IF EXISTS "product_checkout_config"`
  );
  await execute(
    connection,
    `CREATE TABLE "product_checkout_config" (
  "config_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "product_id" INT NOT NULL UNIQUE,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "form_mode" VARCHAR DEFAULT 'popup',
  "default_country" VARCHAR DEFAULT 'CO',
  "cod_fee" DECIMAL(12,4) DEFAULT 0,
  "cod_fee_sku" VARCHAR DEFAULT NULL,
  "form_version_id" INT DEFAULT NULL,
  "show_email" BOOLEAN DEFAULT TRUE,
  "show_address2" BOOLEAN DEFAULT FALSE,
  "show_postcode" BOOLEAN DEFAULT TRUE,
  "show_notes" BOOLEAN DEFAULT FALSE,
  "show_discount_code" BOOLEAN DEFAULT FALSE,
  "show_whatsapp_btn" BOOLEAN DEFAULT FALSE,
  "show_prepaid_btn" BOOLEAN DEFAULT FALSE,
  "show_sticky_btn" BOOLEAN DEFAULT TRUE,
  "whatsapp_number" VARCHAR DEFAULT NULL,
  "submit_button_text" VARCHAR DEFAULT 'Confirmar Pedido',
  "thank_you_message" TEXT DEFAULT NULL,
  "thank_you_redirect_url" VARCHAR DEFAULT NULL,
  "thank_you_redirect_delay" INT DEFAULT 0,
  "show_urgency_timer" BOOLEAN DEFAULT FALSE,
  "urgency_timer_minutes" INT DEFAULT 15,
  "max_qty_per_order" INT DEFAULT 10,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_PRODUCT_CHECKOUT_CONFIG" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );

  // 2. Form visual versions (for A/B testing and customization)
  await execute(
    connection,
    `CREATE TABLE "cod_form_version" (
  "form_version_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR NOT NULL,
  "is_default" BOOLEAN DEFAULT FALSE,
  "bg_color" VARCHAR DEFAULT '#ffffff',
  "btn_bg_color" VARCHAR DEFAULT NULL,
  "btn_text_color" VARCHAR DEFAULT '#ffffff',
  "btn_hover_color" VARCHAR DEFAULT NULL,
  "border_color" VARCHAR DEFAULT NULL,
  "label_color" VARCHAR DEFAULT NULL,
  "price_color" VARCHAR DEFAULT NULL,
  "border_radius" INT DEFAULT 8,
  "font_family" VARCHAR DEFAULT NULL,
  "custom_css" TEXT DEFAULT NULL,
  "custom_html_top" TEXT DEFAULT NULL,
  "custom_html_bottom" TEXT DEFAULT NULL,
  "field_order" JSONB DEFAULT '["full_name","telephone","email","country","province","city","address_1","postcode"]',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "COD_FORM_VERSION_UUID_UNIQUE" UNIQUE ("uuid")
)`
  );

  // 3. Custom form fields
  await execute(
    connection,
    `CREATE TABLE "cod_form_custom_field" (
  "field_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "form_version_id" INT DEFAULT NULL,
  "field_type" VARCHAR NOT NULL DEFAULT 'text',
  "label" VARCHAR NOT NULL,
  "placeholder" VARCHAR DEFAULT NULL,
  "options" JSONB DEFAULT NULL,
  "is_required" BOOLEAN DEFAULT FALSE,
  "sort_order" INT DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_CUSTOM_FIELD_FORM_VERSION" FOREIGN KEY ("form_version_id") REFERENCES "cod_form_version" ("form_version_id") ON DELETE CASCADE
)`
  );

  // 4. Quantity offers
  await execute(
    connection,
    `CREATE TABLE "cod_quantity_offer" (
  "offer_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" INT NOT NULL,
  "quantity" INT NOT NULL,
  "discount_type" VARCHAR NOT NULL DEFAULT 'percentage',
  "discount_value" DECIMAL(12,4) NOT NULL,
  "badge_text" VARCHAR DEFAULT NULL,
  "is_preselected" BOOLEAN DEFAULT FALSE,
  "sort_order" INT DEFAULT 0,
  "enabled" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "COD_QTY_OFFER_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_QTY_OFFER_PRODUCT" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );

  // 5. Upsells (1-tick pre-purchase and 1-click post-purchase)
  await execute(
    connection,
    `CREATE TABLE "cod_upsell" (
  "upsell_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trigger_product_id" INT NOT NULL,
  "offer_product_id" INT NOT NULL,
  "upsell_type" VARCHAR NOT NULL DEFAULT 'one_tick',
  "title" VARCHAR DEFAULT NULL,
  "description" TEXT DEFAULT NULL,
  "discount_type" VARCHAR DEFAULT 'percentage',
  "discount_value" DECIMAL(12,4) DEFAULT 0,
  "show_timer" BOOLEAN DEFAULT FALSE,
  "timer_seconds" INT DEFAULT 60,
  "sort_order" INT DEFAULT 0,
  "enabled" BOOLEAN DEFAULT TRUE,
  "ab_variant" VARCHAR DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "COD_UPSELL_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_UPSELL_TRIGGER_PRODUCT" FOREIGN KEY ("trigger_product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE,
  CONSTRAINT "FK_UPSELL_OFFER_PRODUCT" FOREIGN KEY ("offer_product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );

  // 6. Downsells
  await execute(
    connection,
    `CREATE TABLE "cod_downsell" (
  "downsell_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "upsell_id" INT NOT NULL,
  "offer_product_id" INT NOT NULL,
  "title" VARCHAR DEFAULT NULL,
  "description" TEXT DEFAULT NULL,
  "discount_type" VARCHAR DEFAULT 'percentage',
  "discount_value" DECIMAL(12,4) DEFAULT 0,
  "enabled" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "COD_DOWNSELL_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "FK_DOWNSELL_UPSELL" FOREIGN KEY ("upsell_id") REFERENCES "cod_upsell" ("upsell_id") ON DELETE CASCADE,
  CONSTRAINT "FK_DOWNSELL_OFFER_PRODUCT" FOREIGN KEY ("offer_product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );

  // 7. Abandoned orders
  await execute(
    connection,
    `CREATE TABLE "cod_abandoned_order" (
  "abandoned_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" INT DEFAULT NULL,
  "customer_name" VARCHAR DEFAULT NULL,
  "customer_phone" VARCHAR DEFAULT NULL,
  "customer_email" VARCHAR DEFAULT NULL,
  "form_data" JSONB DEFAULT NULL,
  "cart_total" DECIMAL(12,4) DEFAULT 0,
  "recovery_status" VARCHAR DEFAULT 'pending',
  "recovery_channel" VARCHAR DEFAULT NULL,
  "utm_source" VARCHAR DEFAULT NULL,
  "utm_medium" VARCHAR DEFAULT NULL,
  "utm_campaign" VARCHAR DEFAULT NULL,
  "utm_term" VARCHAR DEFAULT NULL,
  "utm_content" VARCHAR DEFAULT NULL,
  "ip_address" VARCHAR DEFAULT NULL,
  "user_agent" TEXT DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "COD_ABANDONED_UUID_UNIQUE" UNIQUE ("uuid")
)`
  );

  // 8. Fraud prevention - blocked users
  await execute(
    connection,
    `CREATE TABLE "cod_blocked_user" (
  "block_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "block_type" VARCHAR NOT NULL,
  "block_value" VARCHAR NOT NULL,
  "reason" VARCHAR DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "COD_BLOCK_UNIQUE" UNIQUE ("block_type", "block_value")
)`
  );

  // 9. Fraud prevention - rate limits
  await execute(
    connection,
    `CREATE TABLE "cod_order_attempt" (
  "attempt_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "ip_address" VARCHAR DEFAULT NULL,
  "phone" VARCHAR DEFAULT NULL,
  "email" VARCHAR DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)`
  );
  await execute(
    connection,
    `CREATE INDEX "IDX_ORDER_ATTEMPT_IP" ON "cod_order_attempt" ("ip_address", "created_at")`
  );
  await execute(
    connection,
    `CREATE INDEX "IDX_ORDER_ATTEMPT_PHONE" ON "cod_order_attempt" ("phone", "created_at")`
  );

  // 10. OTP codes
  await execute(
    connection,
    `CREATE TABLE "cod_otp_code" (
  "otp_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "phone" VARCHAR NOT NULL,
  "code" VARCHAR NOT NULL,
  "attempts" INT DEFAULT 0,
  "verified" BOOLEAN DEFAULT FALSE,
  "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)`
  );

  // 11. Pixel tracking configuration
  await execute(
    connection,
    `CREATE TABLE "cod_pixel" (
  "pixel_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "pixel_type" VARCHAR NOT NULL,
  "pixel_identifier" VARCHAR NOT NULL,
  "pixel_token" VARCHAR DEFAULT NULL,
  "conversion_label" VARCHAR DEFAULT NULL,
  "enabled" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)`
  );

  // 12. COD shipping rates
  await execute(
    connection,
    `CREATE TABLE "cod_shipping_rate" (
  "rate_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "country" VARCHAR NOT NULL,
  "province" VARCHAR DEFAULT NULL,
  "min_order_value" DECIMAL(12,4) DEFAULT 0,
  "max_order_value" DECIMAL(12,4) DEFAULT NULL,
  "min_weight" DECIMAL(12,4) DEFAULT 0,
  "max_weight" DECIMAL(12,4) DEFAULT NULL,
  "rate_amount" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "free_shipping_threshold" DECIMAL(12,4) DEFAULT NULL,
  "enabled" BOOLEAN DEFAULT TRUE,
  "sort_order" INT DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)`
  );

  // 13. Upsell analytics / A/B test results
  await execute(
    connection,
    `CREATE TABLE "cod_upsell_event" (
  "event_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "upsell_id" INT NOT NULL,
  "order_id" INT DEFAULT NULL,
  "event_type" VARCHAR NOT NULL,
  "ab_variant" VARCHAR DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_UPSELL_EVENT_UPSELL" FOREIGN KEY ("upsell_id") REFERENCES "cod_upsell" ("upsell_id") ON DELETE CASCADE
)`
  );

  // 14. General settings for the COD system
  await execute(
    connection,
    `CREATE TABLE "cod_settings" (
  "setting_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "setting_key" VARCHAR NOT NULL UNIQUE,
  "setting_value" TEXT DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)`
  );

  // Seed default settings
  await execute(
    connection,
    `INSERT INTO "cod_settings" ("setting_key", "setting_value") VALUES
  ('fraud_max_orders_per_ip_24h', '5'),
  ('fraud_max_orders_per_phone_24h', '3'),
  ('fraud_max_orders_per_email_24h', '3'),
  ('otp_enabled', 'false'),
  ('otp_provider', 'twilio'),
  ('otp_expiry_minutes', '5'),
  ('otp_max_attempts', '3'),
  ('google_places_api_key', ''),
  ('whatsapp_default_number', ''),
  ('abandoned_recovery_delay_minutes', '30'),
  ('abandoned_recovery_enabled', 'false')`
  );
};
