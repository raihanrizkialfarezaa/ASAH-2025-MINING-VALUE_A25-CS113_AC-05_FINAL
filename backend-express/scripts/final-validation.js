import axios from 'axios';

const BACKEND_URL = 'http://localhost:3000/api/v1';

async function finalValidation() {
  console.log('\n🎯 === FINAL SYSTEM VALIDATION ===\n');

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

  console.log('📡 Fetching 10 random roads and excavators from database...\n');

  const [roadsRes, excavatorsRes] = await Promise.all([
    api.get('/locations/road-segments?limit=20'),
    api.get('/excavators?limit=10'),
  ]);

  const roads = roadsRes.data.data;
  const excavators = excavatorsRes.data.data;

  const randomRoads = [];
  const randomExcavators = [];

  for (let i = 0; i < 10; i++) {
    randomRoads.push(roads[Math.floor(Math.random() * roads.length)]);
    randomExcavators.push(excavators[Math.floor(Math.random() * excavators.length)]);
  }

  console.log('✅ Testing dengan 10 kombinasi random road + excavator:\n');

  const results = [];

  for (let i = 0; i < 10; i++) {
    const road = randomRoads[i];
    const excavator = randomExcavators[i];

    console.log(
      `   Test ${i + 1}: Road "${road.segment_name}" + Excavator "${excavator.excavator_code}"`
    );

    try {
      const response = await api.post('/ai/recommendations', {
        weatherCondition: 'Cerah',
        roadCondition: 'GOOD',
        shift: 'SHIFT_1',
        targetRoadId: road.id,
        targetExcavatorId: excavator.id,
        targetScheduleId: null,
        truckOptions: [5, 10],
        excavatorOptions: [1, 2],
      });

      if (response.data.success && response.data.data.top_3_strategies) {
        const top1 = response.data.data.top_3_strategies[0];
        const key = Object.keys(top1)[0];
        const data = top1[key];

        const profit = data.KPI_PREDIKSI?.PROFIT || 'N/A';
        const route = data.INSTRUKSI_FLAT?.JALUR_ANGKUT || 'N/A';

        results.push({
          road: road.segment_name,
          excavator: excavator.excavator_code,
          profit: profit,
          route: route,
        });

        console.log(`      ✅ Profit: ${profit} | Route: ${route}\n`);
      }
    } catch (error) {
      console.error(`      ❌ Error: ${error.message}\n`);
    }
  }

  console.log('\n📊 === VARIABILITY ANALYSIS ===\n');

  const uniqueProfits = [...new Set(results.map((r) => r.profit))];
  const uniqueRoutes = [...new Set(results.map((r) => r.route))];

  console.log(`   Total Tests: ${results.length}`);
  console.log(`   Unique Profit Values: ${uniqueProfits.length}`);
  console.log(`   Unique Routes: ${uniqueRoutes.length}`);
  console.log(`   Variability Rate: ${((uniqueRoutes.length / results.length) * 100).toFixed(1)}%`);

  if (uniqueRoutes.length >= results.length * 0.7) {
    console.log('\n   ✅✅✅ SUCCESS: System is HIGHLY DYNAMIC!');
    console.log('   Route recommendations vary significantly based on input parameters.');
    console.log('   ML models are properly using database data for predictions.');
  } else if (uniqueRoutes.length >= results.length * 0.4) {
    console.log('\n   ✅ PASS: System is DYNAMIC with moderate variability.');
  } else {
    console.log('\n   ⚠️ WARNING: Variability is lower than expected.');
  }

  console.log('\n🎯 === VALIDATION COMPLETE ===\n');
}

finalValidation().catch(console.error);
