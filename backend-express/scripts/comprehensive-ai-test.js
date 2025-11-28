import axios from 'axios';

const AI_SERVICE_URL = 'http://localhost:8000';
const BACKEND_URL = 'http://localhost:3000/api/v1';

async function comprehensiveTest() {
  console.log('=== COMPREHENSIVE AI SYSTEM TEST ===\n');

  const testCases = [
    {
      name: 'Test 1: Cerah + GOOD + 5,10 trucks',
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
      name: 'Test 2: Hujan Lebat + POOR + 5,10 trucks',
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
      name: 'Test 3: Cerah + GOOD + 15,20 trucks (DIFFERENT ALLOCATION)',
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
    {
      name: 'Test 4: Hujan Ringan + FAIR + 8,12 trucks',
      payload: {
        weatherCondition: 'Hujan Ringan',
        roadCondition: 'FAIR',
        shift: 'SHIFT_3',
        targetRoadId: 'cmig045r902s2i6obx20hoy6b',
        targetExcavatorId: 'cmig0484r05ddi6obwyjt7t4y',
        targetScheduleId: 'cmig04ay30782i6obij5gmgb5',
        truckOptions: [8, 12],
        excavatorOptions: [1, 3],
      },
    },
  ];

  const results = [];

  for (const test of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(test.name);
    console.log('='.repeat(70));
    console.log('Input Parameters:', JSON.stringify(test.payload, null, 2));

    try {
      const response = await axios.post(`${BACKEND_URL}/ai/recommendations`, test.payload, {
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success && response.data.data.top_3_strategies) {
        const strategies = response.data.data.top_3_strategies;

        console.log(`\n✅ SUCCESS - Received ${strategies.length} strategies\n`);

        const summary = strategies.map((strategy, index) => {
          const key = Object.keys(strategy)[0];
          const data = strategy[key];
          const kpi = data.KPI_PREDIKSI || {};
          const instruksi = data.INSTRUKSI_FLAT || {};

          const result = {
            strategy: index + 1,
            trucks: instruksi.JUMLAH_DUMP_TRUCK,
            excavators: instruksi.JUMLAH_EXCAVATOR,
            profit: kpi.PROFIT,
            production: kpi.PRODUKSI,
            fuelRatio: kpi.FUEL_RATIO,
            queueTime: kpi.IDLE_ANTRIAN,
          };

          console.log(`  Strategy ${index + 1}:`);
          console.log(`    Config: ${result.trucks} trucks, ${result.excavators} excavators`);
          console.log(`    Profit: ${result.profit}`);
          console.log(`    Production: ${result.production}`);
          console.log(`    Fuel Ratio: ${result.fuelRatio}`);
          console.log(`    Queue Time: ${result.queueTime}`);

          return result;
        });

        results.push({
          test: test.name,
          input: test.payload,
          output: summary,
        });
      } else {
        console.log('❌ No strategies returned');
      }
    } catch (error) {
      console.error('❌ ERROR:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('ANALYSIS: Checking if results are truly dynamic');
  console.log('='.repeat(70));

  if (results.length >= 2) {
    const result1 = results[0].output[0];
    const result2 = results[1].output[0];
    const result3 = results.length > 2 ? results[2].output[0] : null;

    console.log('\nComparing Test 1 vs Test 2 (Cerah vs Hujan):');
    console.log(
      `  Profit: ${result1.profit} vs ${result2.profit} - ${result1.profit !== result2.profit ? '✅ DIFFERENT' : '❌ SAME'}`
    );
    console.log(
      `  Production: ${result1.production} vs ${result2.production} - ${result1.production !== result2.production ? '✅ DIFFERENT' : '❌ SAME'}`
    );

    if (result3) {
      console.log('\nComparing Test 1 vs Test 3 (5,10 trucks vs 15,20 trucks):');
      console.log(
        `  Profit: ${result1.profit} vs ${result3.profit} - ${result1.profit !== result3.profit ? '✅ DIFFERENT' : '❌ SAME'}`
      );
      console.log(
        `  Production: ${result1.production} vs ${result3.production} - ${result1.production !== result3.production ? '✅ DIFFERENT' : '❌ SAME'}`
      );
    }

    const allSame = results.every(
      (r, i) =>
        i === 0 ||
        (r.output[0].profit === results[0].output[0].profit &&
          r.output[0].production === results[0].output[0].production)
    );

    if (allSame) {
      console.log(
        '\n❌❌❌ CRITICAL ISSUE: All results are IDENTICAL despite different parameters!'
      );
      console.log('The simulator is NOT responding to input changes.');
    } else {
      console.log('\n✅ SUCCESS: Results are DYNAMIC and change based on input parameters!');
    }
  }

  console.log('\n=== Test Complete ===');
}

comprehensiveTest().catch(console.error);
