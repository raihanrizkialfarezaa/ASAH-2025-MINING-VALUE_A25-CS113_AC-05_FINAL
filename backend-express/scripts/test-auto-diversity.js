import axios from 'axios';

const BACKEND_URL = 'http://localhost:3000/api/v1';

async function testAutoDiversity() {
  console.log('\n🎯 === TESTING AUTO DIVERSITY MODE (No Target Selection) ===\n');

  const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
    username: 'admin',
    password: 'password123',
  });

  const token = loginResponse.data.data.token;

  const api = axios.create({
    baseURL: BACKEND_URL,
    timeout: 240000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('🧪 Test 1: AUTO MODE (No targetRoadId, No targetExcavatorId)\n');
  console.log('   Expected: 3 DIFFERENT strategies with diverse routes & excavators\n');

  try {
    const response = await api.post('/ai/recommendations', {
      weatherCondition: 'Cerah',
      roadCondition: 'GOOD',
      shift: 'SHIFT_1',
      targetRoadId: null,
      targetExcavatorId: null,
      targetScheduleId: null,
      truckOptions: [5, 10],
      excavatorOptions: [1, 2],
    });

    if (response.data.success && response.data.data.top_3_strategies) {
      const strategies = response.data.data.top_3_strategies;

      console.log('✅ Received 3 strategies:\n');

      const results = [];

      strategies.forEach((strat, i) => {
        const key = Object.keys(strat)[0];
        const data = strat[key];

        const profit = data.KPI_PREDIKSI?.PROFIT || 'N/A';
        const production = data.KPI_PREDIKSI?.PRODUKSI || 'N/A';
        const route = data.INSTRUKSI_FLAT?.JALUR_ANGKUT || 'N/A';
        const equipment = data.INSTRUKSI_FLAT?.ALAT_MUAT_TARGET || 'N/A';
        const trucks = data.INSTRUKSI_FLAT?.JUMLAH_DUMP_TRUCK || 'N/A';
        const excavators = data.INSTRUKSI_FLAT?.JUMLAH_EXCAVATOR || 'N/A';

        console.log(`Strategy ${i + 1}:`);
        console.log(`   Profit: ${profit}`);
        console.log(`   Production: ${production}`);
        console.log(`   Trucks: ${trucks}, Excavators: ${excavators}`);
        console.log(`   Route: ${route}`);
        console.log(`   Equipment: ${equipment}`);
        console.log('');

        results.push({
          profit,
          production,
          route,
          equipment,
          trucks,
          excavators,
        });
      });

      console.log('📊 DIVERSITY ANALYSIS:\n');

      const uniqueRoutes = [...new Set(results.map((r) => r.route))];
      const uniqueEquipment = [...new Set(results.map((r) => r.equipment))];
      const uniqueProfits = [...new Set(results.map((r) => r.profit))];
      const uniqueConfigs = [...new Set(results.map((r) => `${r.trucks}_${r.excavators}`))];

      console.log(`   Unique Routes: ${uniqueRoutes.length}/3`);
      console.log(`   Unique Equipment: ${uniqueEquipment.length}/3`);
      console.log(`   Unique Truck/Exc Configs: ${uniqueConfigs.length}/3`);
      console.log(`   Unique Profits: ${uniqueProfits.length}/3`);

      if (uniqueRoutes.length === 1 && uniqueEquipment.length === 1) {
        console.log('\n   ❌❌❌ FAILED: All 3 strategies are IDENTICAL!');
        console.log('   Problem: System not exploring database diversity');
      } else if (uniqueRoutes.length === 3 && uniqueEquipment.length === 3) {
        console.log('\n   ✅✅✅ PERFECT: All 3 strategies are UNIQUE!');
        console.log('   Success: System properly exploring database combinations');
      } else if (uniqueRoutes.length >= 2 || uniqueEquipment.length >= 2) {
        console.log('\n   ✅ GOOD: Strategies show diversity');
        console.log(
          `   ${uniqueRoutes.length} different routes, ${uniqueEquipment.length} different equipment`
        );
      } else {
        console.log('\n   ⚠️ PARTIAL: Some diversity detected but can be improved');
      }

      console.log('\n   Routes found:');
      uniqueRoutes.forEach((route, i) => {
        console.log(`      ${i + 1}. ${route}`);
      });

      console.log('\n   Equipment found:');
      uniqueEquipment.forEach((eq, i) => {
        console.log(`      ${i + 1}. ${eq}`);
      });
    } else {
      console.log('❌ No strategies returned');
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n🎯 === TEST COMPLETE ===\n');
}

testAutoDiversity().catch(console.error);
