-- AlterTable
ALTER TABLE "excavators" ADD COLUMN     "fuelConsumption" DOUBLE PRECISION DEFAULT 50.0,
ADD COLUMN     "maintenanceCost" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "productionRate" DOUBLE PRECISION DEFAULT 5.0;

-- AlterTable
ALTER TABLE "operators" ADD COLUMN     "salary" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "production_records" ADD COLUMN     "equipmentAllocation" JSONB;

-- AlterTable
ALTER TABLE "trucks" ADD COLUMN     "averageSpeed" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
ADD COLUMN     "fuelConsumption" DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN     "maintenanceCost" DOUBLE PRECISION DEFAULT 0.0;
