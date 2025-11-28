import axios from 'axios';

const BACKEND_URL = 'http://localhost:3000/api/v1';

async function loginAndTest() {
  console.log('=== Logging in as admin ===\n');

  const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
    username: 'admin',
    password: 'password123',
  });

  const token = loginResponse.data.data.token;
  console.log('✅ Login successful!\n');

  const api = axios.create({
    baseURL: BACKEND_URL,
    timeout: 120000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const testCases = [
    {
      name: 'Test 1: Cerah + GOOD + [5,10] trucks',
      payload: {
        weatherCondition: 'Cerah',
        roadCondition: 'GOOD',
        shift: 'SHIFT_1',
        targetRoadId: 'cmig045r902s2i6obx20hoy6b',
        targetExcavatorId: 'cmig0484r05ddi6obwyjt7t4y',
        targetScheduleId: 'cmig04ay30782i6obij5gmgb5',
        truckOptions: [5, 10],
        excavatorOptions: [1, 2],
      },
    },
    {
      name: 'Test 2: Hujan Lebat + POOR + [5,10] trucks',
      payload: {
        weatherCondition: 'Hujan Lebat',
        roadCondition: 'POOR',
        shift: 'SHIFT_2',
        targetRoadId: 'cmig045r902s2i6obx20hoy6b',
        targetExcavatorId: 'cmig0484r05ddi6obwyjt7t4y',
        targetScheduleId: 'cmig04ay30782i6obij5gmgb5',
        truckOptions: [5, 10],
        excavatorOptions: [1, 2],
      },
    },
    {
      name: 'Test 3: Cerah + GOOD + [15,20] trucks (DIFFERENT)',
      payload: {
        weatherCondition: 'Cerah',
        roadCondition: 'GOOD',
        shift: 'SHIFT_1',
        targetRoadId: 'cmig045r902s2i6obx20hoy6b',
        targetExcavatorId: 'cmig0484r05ddi6obwyjt7t4y',
        targetScheduleId: 'cmig04ay30782i6obij5gmgb5',
        truckOptions: [15, 20],
        excavatorOptions: [2, 3],
      },
    },
  ];

  const results = [];

  for (const test of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(test.name);
    console.log('='.repeat(70));

    try {
      const response = await api.post('/ai/recommendations', test.payload);

      if (response.data.success && response.data.data.top_3_strategies) {
        const strategies = response.data.data.top_3_strategies;

        console.log(`✅ Received ${strategies.length} strategies\n`);

        const summary = strategies.map((strategy, index) => {
          const key = Object.keys(strategy)[0];
          const data = strategy[key];
          const kpi = data.KPI_PREDIKSI || {};
          const instruksi = data.INSTRUKSI_FLAT || {};

          const result = {
            trucks: instruksi.JUMLAH_DUMP_TRUCK,
            excavators: instruksi.JUMLAH_EXCAVATOR,
            profit: kpi.PROFIT,
            production: kpi.PRODUKSI,
            fuelRatio: kpi.FUEL_RATIO,
            queueTime: kpi.IDLE_ANTRIAN,
          };

          console.log(`  Strategy ${index + 1}:`);
          console.log(`    ${result.trucks} trucks, ${result.excavators} excavators`);
          console.log(`    Profit: ${result.profit} | Production: ${result.production}`);
          console.log(`    Fuel: ${result.fuelRatio} | Queue: ${result.queueTime}`);

          return result;
        });

        results.push({
          test: test.name,
          topStrategy: summary[0],
        });
      }
    } catch (error) {
      console.error('❌ ERROR:', error.message);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('FINAL ANALYSIS');
  console.log('='.repeat(70));

  if (results.length >= 3) {
    console.log(
      '\nTest 1 Top Strategy (Cerah + [5,10]):',
      JSON.stringify(results[0].topStrategy, null, 2)
    );
    console.log(
      '\nTest 2 Top Strategy (Hujan + [5,10]):',
      JSON.stringify(results[1].topStrategy, null, 2)
    );
    console.log(
      '\nTest 3 Top Strategy (Cerah + [15,20]):',
      JSON.stringify(results[2].topStrategy, null, 2)
    );

    const test1 = results[0].topStrategy;
    const test2 = results[1].topStrategy;
    const test3 = results[2].topStrategy;

    console.log('\n--- Comparison Analysis ---');
    console.log(
      `Test 1 vs 2 (Cerah vs Hujan): Profit ${test1.profit} vs ${test2.profit} → ${test1.profit !== test2.profit ? '✅ DIFFERENT' : '❌ SAME'}`
    );
    console.log(
      `Test 1 vs 3 (5,10 vs 15,20): Profit ${test1.profit} vs ${test3.profit} → ${test1.profit !== test3.profit ? '✅ DIFFERENT' : '❌ SAME'}`
    );
    console.log(
      `Test 1 vs 2 (Cerah vs Hujan): Prod ${test1.production} vs ${test2.production} → ${test1.production !== test2.production ? '✅ DIFFERENT' : '❌ SAME'}`
    );
    console.log(
      `Test 1 vs 3 (5,10 vs 15,20): Prod ${test1.production} vs ${test3.production} → ${test1.production !== test3.production ? '✅ DIFFERENT' : '❌ SAME'}`
    );

    const allSame = test1.profit === test2.profit && test2.profit === test3.profit;

    if (allSame) {
      console.log('\n❌❌❌ CRITICAL: Results are IDENTICAL! Simulator is NOT dynamic!');
    } else {
      console.log('\n✅✅✅ SUCCESS: Results are DYNAMIC and responsive to parameters!');
    }
  }
}

loginAndTest().catch(console.error);
