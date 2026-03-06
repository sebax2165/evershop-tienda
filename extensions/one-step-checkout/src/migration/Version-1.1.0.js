import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // ──────────────────────────────────────────────
  // Table 1: cod_partial_payment_config
  // Module 10 - Partial Payments (Deposit + COD)
  // ──────────────────────────────────────────────
  await execute(connection, `
    CREATE TABLE IF NOT EXISTS "cod_partial_payment_config" (
      "config_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "product_id" INT DEFAULT NULL,
      "enabled" BOOLEAN DEFAULT FALSE,
      "deposit_type" VARCHAR DEFAULT 'percentage',
      "deposit_value" DECIMAL(12,4) DEFAULT 50,
      "min_order_total" DECIMAL(12,4) DEFAULT 0,
      "max_order_total" DECIMAL(12,4) DEFAULT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FK_PARTIAL_PAYMENT_PRODUCT" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE,
      CONSTRAINT "UQ_PARTIAL_PAYMENT_PRODUCT" UNIQUE ("product_id")
    )
  `);

  // ──────────────────────────────────────────────
  // Table 2: cod_conditional_rule
  // Module 4 Addition - Advanced conditional rules
  // ──────────────────────────────────────────────
  await execute(connection, `
    CREATE TABLE IF NOT EXISTS "cod_conditional_rule" (
      "rule_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
      "rule_type" VARCHAR NOT NULL,
      "operator" VARCHAR DEFAULT 'show',
      "conditions" JSONB NOT NULL,
      "priority" INT DEFAULT 0,
      "enabled" BOOLEAN DEFAULT TRUE,
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UQ_CONDITIONAL_RULE_UUID" UNIQUE ("uuid")
    )
  `);

  // ──────────────────────────────────────────────
  // Table 3: cod_otp_verification
  // Module 4 Addition - OTP persistent verification cache
  // ──────────────────────────────────────────────
  await execute(connection, `
    CREATE TABLE IF NOT EXISTS "cod_otp_verification" (
      "verification_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "phone" VARCHAR NOT NULL,
      "verified_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      "ip_address" VARCHAR DEFAULT NULL
    )
  `);

  await execute(connection, `
    CREATE INDEX IF NOT EXISTS "IDX_OTP_VERIFICATION_PHONE_EXPIRES"
    ON "cod_otp_verification" ("phone", "expires_at")
  `);

  // ──────────────────────────────────────────────
  // Table 4: cod_messaging_credit
  // Module 5 Addition - Messaging categories with balance
  // ──────────────────────────────────────────────
  await execute(connection, `
    CREATE TABLE IF NOT EXISTS "cod_messaging_credit" (
      "credit_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "balance_sms" DECIMAL(12,4) DEFAULT 0,
      "balance_wa_auth" DECIMAL(12,4) DEFAULT 0,
      "balance_wa_utility" DECIMAL(12,4) DEFAULT 0,
      "balance_wa_marketing" DECIMAL(12,4) DEFAULT 0,
      "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ──────────────────────────────────────────────
  // Table 5: cod_message_log
  // Tracking all sent messages
  // ──────────────────────────────────────────────
  await execute(connection, `
    CREATE TABLE IF NOT EXISTS "cod_message_log" (
      "log_id" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "category" VARCHAR NOT NULL,
      "recipient" VARCHAR NOT NULL,
      "message_type" VARCHAR DEFAULT NULL,
      "cost" DECIMAL(12,6) DEFAULT 0,
      "provider" VARCHAR DEFAULT 'telesign',
      "provider_ref" VARCHAR DEFAULT NULL,
      "status" VARCHAR DEFAULT 'sent',
      "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ──────────────────────────────────────────────
  // New settings in cod_settings
  // ──────────────────────────────────────────────
  const newSettings = [
    ['otp_channel', 'whatsapp'],
    ['otp_provider', 'telesign'],
    ['otp_persist_days', '7'],
    ['otp_timing', 'before'],
    ['otp_message_template', 'Tu codigo de verificacion es: {code}'],
    ['telesign_customer_id', ''],
    ['telesign_api_key', ''],
    ['partial_payment_enabled', 'false'],
    ['partial_payment_deposit_type', 'percentage'],
    ['partial_payment_deposit_value', '50']
  ];

  for (const [key, value] of newSettings) {
    await execute(connection, `
      INSERT INTO "cod_settings" ("setting_key", "setting_value")
      VALUES ('${key}', '${value}')
      ON CONFLICT DO NOTHING
    `);
  }

  // ──────────────────────────────────────────────
  // Seed one row in cod_messaging_credit with all zeros
  // ──────────────────────────────────────────────
  await execute(connection, `
    INSERT INTO "cod_messaging_credit" ("balance_sms", "balance_wa_auth", "balance_wa_utility", "balance_wa_marketing")
    SELECT 0, 0, 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM "cod_messaging_credit" LIMIT 1)
  `);
};
