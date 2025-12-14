import prisma from '../src/config/database.js';

async function main() {
  const sql = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'hauling_activities'
      AND column_name = 'excavatorOperatorId'
  ) THEN
    ALTER TABLE "hauling_activities" ADD COLUMN "excavatorOperatorId" TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hauling_activities_excavatorOperatorId_fkey'
  ) THEN
    ALTER TABLE "hauling_activities"
      ADD CONSTRAINT "hauling_activities_excavatorOperatorId_fkey"
      FOREIGN KEY ("excavatorOperatorId")
      REFERENCES "operators"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'hauling_activities'
      AND indexname = 'hauling_activities_excavatorOperatorId_idx'
  ) THEN
    CREATE INDEX "hauling_activities_excavatorOperatorId_idx" ON "hauling_activities"("excavatorOperatorId");
  END IF;
END$$;
`;

  await prisma.$executeRawUnsafe(sql);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.stdout.write('OK: migrated hauling_activities.excavatorOperatorId\n');
  })
  .catch(async (err) => {
    process.stderr.write(`FAILED: ${err?.message || String(err)}\n`);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
