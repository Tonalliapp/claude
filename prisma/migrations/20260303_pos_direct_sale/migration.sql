-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('dine_in', 'takeout', 'counter', 'delivery');

-- AlterTable: make table_id optional
ALTER TABLE "orders" ALTER COLUMN "table_id" DROP NOT NULL;

-- AlterTable: add order_type with default
ALTER TABLE "orders" ADD COLUMN "order_type" "OrderType" NOT NULL DEFAULT 'dine_in';

-- AlterTable: add customer_name
ALTER TABLE "orders" ADD COLUMN "customer_name" VARCHAR(255);

-- CreateIndex
CREATE INDEX "orders_tenant_id_order_type_idx" ON "orders"("tenant_id", "order_type");
