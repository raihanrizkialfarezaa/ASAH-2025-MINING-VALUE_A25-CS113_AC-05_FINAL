import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING STRATEGY DATA STRUCTURE ===\n');

  const trucks = await prisma.truck.findMany({
    select: { id: true, code: true, capacity: true, status: true },
  });

  const excavators = await prisma.excavator.findMany({
    select: { id: true, code: true, bucketCapacity: true, status: true },
  });

  const operators = await prisma.operator.findMany({
    select: { id: true, employeeNumber: true, salary: true, status: true, userId: true },
  });

  const miningSites = await prisma.miningSite.findMany({
    select: { id: true, code: true, name: true },
  });

  const roads = await prisma.roadSegment.findMany({
    select: { id: true, startPoint: true, endPoint: true, distance: true },
  });

  const schedules = await prisma.sailingSchedule.findMany({
    take: 5,
    select: {
      id: true,
      vesselId: true,
      etaLoading: true,
      etsLoading: true,
      plannedQuantity: true,
      actualQuantity: true,
      status: true,
    },
  });

  console.log(`Trucks: ${trucks.length} total`);
  console.log(`Excavators: ${excavators.length} total`);
  console.log(`Operators: ${operators.length} total`);
  console.log(`Mining Sites: ${miningSites.length} total`);
  console.log(`Roads: ${roads.length} total`);
  console.log(`Schedules: ${schedules.length} total\n`);

  console.log('Sample Truck:', trucks[0]);
  console.log('Sample Excavator:', excavators[0]);
  console.log('Sample Operator:', operators[0]);
  console.log('Sample Mining Site:', miningSites[0]);
  console.log('Sample Road:', roads[0]);
  console.log('Sample Schedule:', schedules[0]);

  const avgOperatorSalary =
    operators.reduce((sum, op) => sum + (op.salary || 0), 0) / operators.length;
  console.log(`\nAverage Operator Salary: ${avgOperatorSalary.toLocaleString('id-ID')} IDR/month`);

  await prisma.$disconnect();
}

main().catch(console.error);
