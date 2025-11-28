import axios from 'axios';

const AI_API = 'http://localhost:8000';

async function testCurrentBehavior() {
  console.log('\n=== TESTING CURRENT AI BEHAVIOR ===\n');

  const testPayload = {
    fixed_conditions: {
      weatherCondition: 'Cerah',
      roadCondition: 'GOOD',
      shift: 'SHIFT_1',
      target_road_id: 'cmhsbjn8x02s2maft90hi31ty',
      target_excavator_id: 'cmhsbjpma05ddmaft5kv95dom',
    },
    decision_variables: {
      alokasi_truk: [5],
      jumlah_excavator: [1],
    },
  };

  try {
    console.log('Sending request to AI API...');
    const response = await axios.post(`${AI_API}/get_top_3_strategies`, testPayload);

    if (response.data && response.data.top_3_strategies) {
      const strategies = response.data.top_3_strategies;
      console.log(`\n✅ Received ${strategies.length} strategies\n`);

      strategies.forEach((strat, idx) => {
        const key = Object.keys(strat)[0];
        const data = strat[key];
        console.log(`Strategy ${idx + 1}:`);
        console.log(`  Trucks: ${data.INSTRUKSI_FLAT.JUMLAH_DUMP_TRUCK}`);
        console.log(`  Excavators: ${data.INSTRUKSI_FLAT.JUMLAH_EXCAVATOR}`);
        console.log(`  Profit: ${data.KPI_PREDIKSI.PROFIT}`);
        console.log(`  Production: ${data.KPI_PREDIKSI.PRODUKSI}`);
        console.log('');
      });

      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   - Only generating combinations from input parameters');
      console.log('   - With alokasi_truk=[5] and jumlah_excavator=[1]');
      console.log('   - We only get 1 scenario (5 trucks, 1 excavator)');
      console.log(
        '   - System should test MULTIPLE truck IDs, road IDs, excavator IDs from database'
      );
      console.log('   - Should generate dozens of unique strategies, not just 1-3!\n');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCurrentBehavior();
