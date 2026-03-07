import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Add missing indexes for fraud check performance
  await execute(connection, `
    CREATE INDEX IF NOT EXISTS "IDX_ORDER_ATTEMPT_EMAIL"
    ON "cod_order_attempt" ("email", "created_at")
  `);

  await execute(connection, `
    CREATE INDEX IF NOT EXISTS "IDX_OTP_CODE_PHONE_CREATED"
    ON "cod_otp_code" ("phone", "created_at")
  `);

  await execute(connection, `
    CREATE INDEX IF NOT EXISTS "IDX_ABANDONED_ORDER_EMAIL"
    ON "cod_abandoned_order" ("customer_email", "created_at")
  `);

  await execute(connection, `
    CREATE INDEX IF NOT EXISTS "IDX_ABANDONED_ORDER_PHONE"
    ON "cod_abandoned_order" ("customer_phone", "created_at")
  `);

  // Add columns missing from cod_upsell_event that the code references
  try {
    await execute(connection, `
      ALTER TABLE "cod_upsell_event"
      ADD COLUMN IF NOT EXISTS "product_id" INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "qty" INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "price" DECIMAL(12,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "upsell_type" VARCHAR DEFAULT NULL
    `);
  } catch (e) {
    // Columns may already exist
  }

  // Add error_message column to cod_message_log for logging failures
  try {
    await execute(connection, `
      ALTER TABLE "cod_message_log"
      ADD COLUMN IF NOT EXISTS "error_message" TEXT DEFAULT NULL
    `);
  } catch (e) {
    // Column may already exist
  }

  // Add updated_at to cod_conditional_rule for audit trail
  try {
    await execute(connection, `
      ALTER TABLE "cod_conditional_rule"
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);
  } catch (e) {
    // Column may already exist
  }
};
