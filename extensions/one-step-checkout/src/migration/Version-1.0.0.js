import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  await execute(
    connection,
    `CREATE TABLE "product_checkout_config" (
  "config_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "product_id" INT NOT NULL UNIQUE,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "default_country" VARCHAR DEFAULT 'CO',
  "cod_fee" DECIMAL(12,4) DEFAULT 0,
  "thank_you_message" TEXT DEFAULT NULL,
  "show_email" BOOLEAN DEFAULT TRUE,
  "show_postcode" BOOLEAN DEFAULT TRUE,
  "show_urgency_timer" BOOLEAN DEFAULT FALSE,
  "urgency_timer_minutes" INT DEFAULT 15,
  "custom_button_text" VARCHAR DEFAULT 'Completar Pedido',
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_PRODUCT_CHECKOUT_CONFIG" FOREIGN KEY ("product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
};
