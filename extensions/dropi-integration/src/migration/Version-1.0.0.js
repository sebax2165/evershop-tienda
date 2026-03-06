import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // 1. Dropi configuration per store
  await execute(
    connection,
    `CREATE TABLE "dropi_config" (
  "config_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "api_key" TEXT NOT NULL DEFAULT '',
  "environment" VARCHAR NOT NULL DEFAULT 'test',
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "auto_sync" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DROPI_CONFIG_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "DROPI_CONFIG_ENV_CHECK" CHECK ("environment" IN ('test', 'production'))
)`
  );

  // 2. Dropi order sync tracking
  await execute(
    connection,
    `CREATE TABLE "dropi_order_sync" (
  "sync_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "evershop_order_id" INT NOT NULL,
  "dropi_order_id" VARCHAR DEFAULT NULL,
  "dropi_guide_number" VARCHAR DEFAULT NULL,
  "status" VARCHAR NOT NULL DEFAULT 'pending',
  "dropi_status" VARCHAR DEFAULT NULL,
  "request_payload" JSONB DEFAULT NULL,
  "response_payload" JSONB DEFAULT NULL,
  "error_message" TEXT DEFAULT NULL,
  "synced_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DROPI_ORDER_SYNC_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "DROPI_ORDER_SYNC_STATUS_CHECK" CHECK ("status" IN ('pending', 'synced', 'failed', 'cancelled'))
)`
  );
  await execute(
    connection,
    `CREATE INDEX "IDX_DROPI_SYNC_ORDER" ON "dropi_order_sync" ("evershop_order_id")`
  );
  await execute(
    connection,
    `CREATE INDEX "IDX_DROPI_SYNC_DROPI_ORDER" ON "dropi_order_sync" ("dropi_order_id")`
  );

  // 3. Product mapping: EverShop product_id <-> Dropi product_id
  await execute(
    connection,
    `CREATE TABLE "dropi_product_map" (
  "map_id" INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1) PRIMARY KEY,
  "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
  "evershop_product_id" INT NOT NULL,
  "dropi_product_id" INT NOT NULL,
  "dropi_variation_id" INT DEFAULT NULL,
  "dropi_product_name" VARCHAR DEFAULT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DROPI_PRODUCT_MAP_UUID_UNIQUE" UNIQUE ("uuid"),
  CONSTRAINT "DROPI_PRODUCT_MAP_UNIQUE" UNIQUE ("evershop_product_id"),
  CONSTRAINT "FK_DROPI_PRODUCT_MAP_PRODUCT" FOREIGN KEY ("evershop_product_id") REFERENCES "product" ("product_id") ON DELETE CASCADE
)`
  );
};
