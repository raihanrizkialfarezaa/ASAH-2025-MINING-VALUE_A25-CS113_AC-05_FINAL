import axios from 'axios';

const BACKEND_URL = 'http://localhost:3000/api/v1';
const AI_URL = 'http://localhost:8000';

async function testMLDynamics() {
  console.log('\n=== TESTING ML-DRIVEN DYNAMIC RECOMMENDATIONS ===\n');

  const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
    username: 'admin',
    password: 'password123',
  });

  const token = loginResponse.data.data.token;

  const api = axios.create({
    baseURL: BACKEND_URL,
    timeout: 180000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('📡 Fetching reference data from database...');

  const [roadsRes, excavatorsRes, schedulesRes] = await Promise.all([
    api.get('/locations/road-segments?limit=10'),
    api.get('/excavators?limit=10'),
    api.get('/vessels/schedules?limit=5'),
  ]);

  const roads = roadsRes.data.data;
  const excavators = excavatorsRes.data.data;
  const schedules = schedulesRes.data.data;

  console.log(
    `   Found ${roads.length} roads, ${excavators.length} excavators, ${schedules.length} schedules\n`
  );

  const roadId1 = roads[0]?.id;
  const roadId2 = roads.length > 1 ? roads[1].id : roadId1;
  const excId1 = excavators[0]?.id;
  const excId2 = excavators.length > 1 ? excavators[1].id : excId1;
  const schedId = schedules[0]?.id;

  const testCases = [
    {
      name: 'Test 1: Road 1 + Excavator 1 + [5,10] trucks',
      payload: {
        weatherCondition: 'Cerah',
        roadCondition: 'GOOD',
        shift: 'SHIFT_1',
        targetRoadId: roadId1,
        targetExcavatorId: excId1,
        targetScheduleId: schedId,
        truckOptions: [5, 10],
        excavatorOptions: [1, 2],
      },
    },
    {
      name: 'Test 2: Road 2 + Excavator 1 + [5,10] trucks (ganti road)',
      payload: {
        weatherCondition: 'Cerah',
        roadCondition: 'GOOD',
        shift: 'SHIFT_1',
        targetRoadId: roadId2,
        targetExcavatorId: excId1,
        targetScheduleId: schedId,
        truckOptions: [5, 10],
        excavatorOptions: [1, 2],
      },
    },
    {
      name: 'Test 3: Road 1 + Excavator 2 + [5,10] trucks (ganti excavator)',
      payload: {
        weatherCondition: 'Cerah',
        roadCondition: 'GOOD',
        shift: 'SHIFT_1',
        targetRoadId: roadId1,
        targetExcavatorId: excId2,
        targetScheduleId: schedId,
        truckOptions: [5, 10],
        excavatorOptions: [1, 2],
      },
    },
    {
      name: 'Test 4: Hujan + Road 1 + Excavator 1 + [5,10] (ganti weather)',
      payload: {
        weatherCondition: 'Hujan Ringan',
        roadCondition: 'GOOD',
        shift: 'SHIFT_1',
        targetRoadId: roadId1,
        targetExcavatorId: excId1,
        targetScheduleId: schedId,
        truckOptions: [5, 10],
        excavatorOptions: [1, 2],
      },
    },
    {
      name: 'Test 5: FAIR + Road 1 + Excavator 1 + [5,10] (ganti road condition)',
      payload: {
        weatherCondition: 'Cerah',
        roadCondition: 'FAIR',
        shift: 'SHIFT_1',
        targetRoadId: roadId1,
        targetExcavatorId: excId1,
        targetScheduleId: schedId,
        truckOptions: [5, 10],
        excavatorOptions: [1, 2],
      },
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n🧪 ${testCase.name}`);
    console.log(`   Payload: ${JSON.stringify(testCase.payload)}`);

    try {
      const response = await api.post('/ai/recommendations', testCase.payload);

      if (response.data.success && response.data.data.top_3_strategies) {
        const strategies = response.data.data.top_3_strategies;

        const top1 = strategies[0];
        const key = Object.keys(top1)[0];
        const data = top1[key];

        const profit = data.KPI_PREDIKSI?.PROFIT || 'N/A';
        const production = data.KPI_PREDIKSI?.PRODUKSI || 'N/A';
        const trucks = data.INSTRUKSI_FLAT?.JUMLAH_DUMP_TRUCK || 'N/A';
        const excavators = data.INSTRUKSI_FLAT?.JUMLAH_EXCAVATOR || 'N/A';
        const route = data.INSTRUKSI_FLAT?.JALUR_ANGKUT || 'N/A';

        console.log(`   ✅ Top Strategy:`);
        console.log(`      - Profit: ${profit}`);
        console.log(`      - Production: ${production}`);
        console.log(`      - Trucks: ${trucks}`);
        console.log(`      - Excavators: ${excavators}`);
        console.log(`      - Route: ${route}`);

        results.push({
          test: testCase.name,
          profit: profit,
          production: production,
          trucks: trucks,
          excavators: excavators,
          route: route,
        });
      } else {
        console.log(`   ❌ No strategies returned`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n=== DYNAMICS ANALYSIS ===\n');

  console.log('📊 SUMMARY TABLE:');
  console.log('─'.repeat(100));
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.test}`);
    console.log(`   Profit: ${r.profit} | Production: ${r.production} | Route: ${r.route}`);
  });
  console.log('─'.repeat(100));

  if (results.length >= 2) {
    console.log('\n🔍 VARIABILITY CHECK:');

    const allProfits = results.map((r) => r.profit);
    const allProduction = results.map((r) => r.production);
    const allRoutes = results.map((r) => r.route);

    const uniqueProfits = [...new Set(allProfits)];
    const uniqueProduction = [...new Set(allProduction)];
    const uniqueRoutes = [...new Set(allRoutes)];

    console.log(`   - Unique Profit values: ${uniqueProfits.length}/${results.length}`);
    console.log(`   - Unique Production values: ${uniqueProduction.length}/${results.length}`);
    console.log(`   - Unique Routes: ${uniqueRoutes.length}/${results.length}`);

    if (uniqueProfits.length === 1) {
      console.log('\n   ⚠️⚠️⚠️ MASALAH: Semua profit IDENTIK! Sistem tidak dinamis!');
    } else if (uniqueProfits.length < results.length * 0.5) {
      console.log('\n   ⚠️ WARNING: Variasi profit rendah. Sistem kurang dinamis.');
    } else {
      console.log('\n   ✅✅✅ SUCCESS: Profit bervariasi! Sistem DINAMIS!');
    }

    if (uniqueRoutes.length === 1) {
      console.log('   ⚠️⚠️⚠️ MASALAH: Semua route IDENTIK! Database tidak digunakan!');
    } else {
      console.log(`   ✅ Route bervariasi (${uniqueRoutes.length} unique routes)`);
    }
  }

  console.log('\n=== TEST COMPLETE ===\n');
}

testMLDynamics().catch(console.error);
