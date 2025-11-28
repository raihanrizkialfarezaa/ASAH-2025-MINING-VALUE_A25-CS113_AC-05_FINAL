import axios from 'axios';

const AI_SERVICE_URL = 'http://localhost:8000';

async function testAIEndpoint() {
  console.log('=== Testing AI Service Endpoint ===\n');

  const testPayloads = [
    {
      name: 'Test 1: Cerah + Good',
      data: {
        fixed_conditions: {
          weatherCondition: 'Cerah',
          roadCondition: 'GOOD',
          shift: 'SHIFT_1',
          target_road_id: 'cmig045r902s2i6obx20hoy6b',
          target_excavator_id: 'cmig0484r05ddi6obwyjt7t4y',
          target_schedule_id: 'cmig04ay30782i6obij5gmgb5',
          simulation_start_date: new Date().toISOString(),
        },
        decision_variables: {
          alokasi_truk: [5, 10],
          jumlah_excavator: [1, 2],
        },
      },
    },
    {
      name: 'Test 2: Hujan + Poor',
      data: {
        fixed_conditions: {
          weatherCondition: 'Hujan Lebat',
          roadCondition: 'POOR',
          shift: 'SHIFT_2',
          target_road_id: 'cmig045r902s2i6obx20hoy6b',
          target_excavator_id: 'cmig0484r05ddi6obwyjt7t4y',
          target_schedule_id: 'cmig04ay30782i6obij5gmgb5',
          simulation_start_date: new Date().toISOString(),
        },
        decision_variables: {
          alokasi_truk: [5, 10],
          jumlah_excavator: [1, 2],
        },
      },
    },
  ];

  for (const test of testPayloads) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(test.name);
    console.log('='.repeat(60));

    try {
      const response = await axios.post(`${AI_SERVICE_URL}/get_top_3_strategies`, test.data, {
        timeout: 120000,
      });

      const strategies = response.data.top_3_strategies;

      console.log(`\nReceived ${strategies.length} strategies:\n`);

      strategies.forEach((strategy, index) => {
        const key = Object.keys(strategy)[0];
        const data = strategy[key];
        const kpi = data.KPI_PREDIKSI || {};
        const instruksi = data.INSTRUKSI_FLAT || {};

        console.log(`Strategy ${index + 1}:`);
        console.log(`  Trucks: ${instruksi.JUMLAH_DUMP_TRUCK}`);
        console.log(`  Excavators: ${instruksi.JUMLAH_EXCAVATOR}`);
        console.log(`  Profit: ${kpi.PROFIT}`);
        console.log(`  Production: ${kpi.PRODUKSI}`);
        console.log(`  Fuel Ratio: ${kpi.FUEL_RATIO}`);
        console.log(`  Queue Time: ${kpi.IDLE_ANTRIAN}`);
        console.log('');
      });
    } catch (error) {
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response:', error.response.data);
      }
    }
  }

  console.log('\n=== Test Complete ===');
}

testAIEndpoint();
