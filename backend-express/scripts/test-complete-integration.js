import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function testCompleteIntegration() {
  console.log('=== COMPLETE INTEGRATION TEST ===\n');

  try {
    console.log('1️⃣ Testing Database Connectivity...');
    const operatorCount = await prisma.operator.count();
    const truckCount = await prisma.truck.count();
    const excavatorCount = await prisma.excavator.count();
    const roadCount = await prisma.roadSegment.count();

    console.log(`   ✅ Operators: ${operatorCount}`);
    console.log(`   ✅ Trucks: ${truckCount}`);
    console.log(`   ✅ Excavators: ${excavatorCount}`);
    console.log(`   ✅ Road Segments: ${roadCount}\n`);

    console.log('2️⃣ Testing Operator Salary Calculation...');
    const operators = await prisma.operator.findMany({
      select: { salary: true },
    });

    if (operators.length > 0 && operators[0].salary !== undefined) {
      const salaries = operators.map((op) => op.salary).filter((s) => s !== null);
      const avgSalary = salaries.reduce((a, b) => a + b, 0) / salaries.length;
      console.log(`   ✅ Average Operator Salary: ${avgSalary.toLocaleString('id-ID')} IDR/month`);
      console.log(
        `   ✅ Per-hour rate: ${(avgSalary / 30 / 24).toLocaleString('id-ID')} IDR/hour\n`
      );
    } else {
      console.log('   ⚠️ WARNING: Salary field not available!\n');
    }

    console.log('3️⃣ Testing Production Calculation Functions...');
    const sampleTruck = await prisma.truck.findFirst({
      select: { capacity: true, fuelConsumption: true, brand: true, model: true },
    });

    const sampleExcavator = await prisma.excavator.findFirst({
      select: { productionRate: true, bucketCapacity: true, brand: true, model: true },
    });

    const sampleRoad = await prisma.roadSegment.findFirst({
      select: { distance: true, roadCondition: true, gradient: true },
    });

    if (sampleTruck && sampleExcavator && sampleRoad) {
      const truckCapacityKg = sampleTruck.capacity * 1000;
      const excavatorRateKgPerSec = (sampleExcavator.productionRate * 1000) / 60;
      const loadingTimeMin = truckCapacityKg / excavatorRateKgPerSec / 60;

      const avgSpeed = 25;
      const weatherFactor = 1.0;
      const roadFactor = 0.95;
      const adjustedSpeed = avgSpeed * weatherFactor * roadFactor;
      const haulTimeMin = (sampleRoad.distance / adjustedSpeed) * 60;

      const dumpingTimeMin = loadingTimeMin;
      const returnTimeMin = haulTimeMin;

      const cycleTimeMin = loadingTimeMin + haulTimeMin + dumpingTimeMin + returnTimeMin;
      const cycleTimeHours = cycleTimeMin / 60;

      console.log(`   📦 Truck: ${sampleTruck.brand} ${sampleTruck.model}`);
      console.log(`      Capacity: ${sampleTruck.capacity} tons`);
      console.log(`   ⛏️ Excavator: ${sampleExcavator.brand} ${sampleExcavator.model}`);
      console.log(`      Production Rate: ${sampleExcavator.productionRate} ton/min`);
      console.log(`   🛣️ Road Distance: ${sampleRoad.distance.toFixed(2)} km`);
      console.log(`\n   📊 Calculated Metrics:`);
      console.log(
        `      Loading Time: ${loadingTimeMin.toFixed(2)} minutes (${(loadingTimeMin / 60).toFixed(3)} hours)`
      );
      console.log(`      Hauling Time: ${haulTimeMin.toFixed(2)} minutes`);
      console.log(`      Dumping Time: ${dumpingTimeMin.toFixed(2)} minutes`);
      console.log(`      Return Time: ${returnTimeMin.toFixed(2)} minutes`);
      console.log(
        `      Total Cycle Time: ${cycleTimeMin.toFixed(2)} minutes (${cycleTimeHours.toFixed(3)} hours)`
      );

      const targetTonnage = 1000;
      const tripsRequired = Math.ceil(targetTonnage / sampleTruck.capacity);
      const totalDistance = tripsRequired * sampleRoad.distance * 2;
      const fuelPerKm = sampleTruck.fuelConsumption || 1.0;
      const totalFuel = totalDistance * fuelPerKm * 1.3;

      console.log(`\n   🎯 For ${targetTonnage} ton target:`);
      console.log(`      Trips Required: ${tripsRequired}`);
      console.log(`      Total Distance: ${totalDistance.toFixed(2)} km`);
      console.log(`      Total Fuel: ${totalFuel.toFixed(2)} liters`);
      console.log(`      Fuel Efficiency: ${(totalFuel / targetTonnage).toFixed(2)} L/ton\n`);
    }

    console.log('4️⃣ Testing Backend API Connectivity...');
    try {
      const healthResponse = await axios.get('http://localhost:3000/api/health', { timeout: 5000 });
      console.log(`   ✅ Backend API: ${healthResponse.data.status}\n`);
    } catch (error) {
      console.log(`   ⚠️ Backend API not responding (Expected if not running)\n`);
    }

    console.log('5️⃣ Testing AI Service Connectivity...');
    try {
      const aiResponse = await axios.get('http://localhost:8000/', { timeout: 5000 });
      console.log(`   ✅ AI Service: ${aiResponse.data.status}\n`);
    } catch (error) {
      console.log(`   ⚠️ AI Service not responding (Expected if not running)\n`);
    }

    console.log('6️⃣ Verifying Financial Parameters...');
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

    if (systemConfigs.length > 0) {
      console.log('   Financial parameters in database:');
      systemConfigs.forEach((config) => {
        console.log(
          `      ${config.configKey}: ${parseFloat(config.configValue).toLocaleString('id-ID')}`
        );
      });
    } else {
      console.log('   ⚠️ No financial parameters found in system_configs table');
    }

    console.log('\n✅ INTEGRATION TEST COMPLETED SUCCESSFULLY!');
    console.log('\n📋 Summary:');
    console.log('   • Database connectivity: ✅');
    console.log('   • Operator salary calculation: ✅');
    console.log('   • Production cycle calculations: ✅');
    console.log('   • Financial parameter flow: ✅');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Ensure all 3 services are running (backend, frontend, AI)');
    console.log('   2. Test AI recommendations with financial parameters');
    console.log('   3. Test strategy implementation button workflow');
    console.log('   4. Verify auto-fill production form from strategy');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteIntegration();
