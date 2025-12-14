-- DropForeignKey
ALTER TABLE "hauling_activities" DROP CONSTRAINT "hauling_activities_excavatorId_fkey";

-- AlterTable
ALTER TABLE "hauling_activities" ALTER COLUMN "excavatorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "hauling_activities" ADD CONSTRAINT "hauling_activities_excavatorId_fkey" FOREIGN KEY ("excavatorId") REFERENCES "excavators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
