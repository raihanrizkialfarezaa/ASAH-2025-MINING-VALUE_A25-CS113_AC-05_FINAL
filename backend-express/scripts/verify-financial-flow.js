import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyFinancialParamFlow() {
  console.log('=== FINANCIAL PARAMETER FLOW VERIFICATION ===\n');

  try {
    const systemConfigs = await prisma.systemConfig.findMany({
      where: {
        configKey: {
          in: [
            'COAL_PRICE_IDR',
            'FUEL_PRICE_IDR',
            'VESSEL_PENALTY_IDR',
            'DEMURRAGE_COST_IDR',
            'OPERATOR_SALARY_IDR',
            'QUEUE_COST_PER_HOUR_IDR',
          ],
        },
      },
    });

    console.log('📊 Database Financial Parameters:');
    systemConfigs.forEach((config) => {
      console.log(`   ${config.configKey}: ${config.configValue}`);
    });

    const operators = await prisma.operator.findMany({
      select: {
        id: true,
        employeeNumber: true,
        salary: true,
      },
    });

    if (operators.length > 0 && operators[0].salary !== undefined) {
      const salaries = operators
        .map((op) => op.salary)
        .filter((s) => s !== null && s !== undefined);
      const avgSalary = salaries.reduce((a, b) => a + b, 0) / salaries.length;

      console.log(`\n👥 Operator Salary Analysis:`);
      console.log(`   Total Operators: ${operators.length}`);
      console.log(`   Operators with Salary: ${salaries.length}`);
      console.log(`   Average Salary: ${avgSalary.toLocaleString('id-ID')} IDR`);
      console.log(`   Min Salary: ${Math.min(...salaries).toLocaleString('id-ID')} IDR`);
      console.log(`   Max Salary: ${Math.max(...salaries).toLocaleString('id-ID')} IDR`);
    } else {
      console.log('\n⚠️ WARNING: No salary field found in operators table!');
      console.log('   Schema needs migration to add salary field.');
    }

    const trucks = await prisma.truck.findMany({
      select: {
        id: true,
        code: true,
        brand: true,
        capacity: true,
        fuelConsumption: true,
      },
      take: 5,
    });

    console.log(`\n🚛 Sample Truck Data:`);
    trucks.forEach((truck) => {
      console.log(
        `   ${truck.code} (${truck.brand}): Capacity=${truck.capacity}t, FuelRate=${truck.fuelConsumption}L/km`
      );
    });

    const excavators = await prisma.excavator.findMany({
      select: {
        id: true,
        code: true,
        model: true,
        bucketCapacity: true,
        productionRate: true,
      },
      take: 5,
    });

    console.log(`\n⛏️ Sample Excavator Data:`);
    excavators.forEach((exc) => {
      console.log(
        `   ${exc.code} (${exc.model}): BucketCap=${exc.bucketCapacity}m³, Rate=${exc.productionRate}t/min`
      );
    });

    const roads = await prisma.roadSegment.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        distance: true,
        gradient: true,
        roadCondition: true,
      },
      take: 5,
    });

    console.log(`\n🛣️ Sample Road Segment Data:`);
    roads.forEach((road) => {
      console.log(
        `   ${road.code} (${road.name}): Distance=${road.distance}km, Gradient=${road.gradient}%, Condition=${road.roadCondition}`
      );
    });

    console.log('\n✅ Financial parameter flow verification completed!');
    console.log('\nNext steps:');
    console.log('1. Ensure frontend sends financialParams in API request');
    console.log('2. Backend controller passes params to Python AI service');
    console.log('3. Python api.py forwards to simulator.py');
    console.log('4. simulator.py uses params dynamically (not hardcoded defaults)');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFinancialParamFlow();
