import axios from 'axios';

const AI_API = 'http://localhost:8000';

async function testEnhancedRecommendations() {
  console.log('\n=== TESTING ENHANCED DYNAMIC AI RECOMMENDATIONS ===\n');

  console.log('Test 1: Minimal parameters (should generate many scenarios from DB)');
  const test1 = {
    fixed_conditions: {
      weatherCondition: 'Cerah',
      roadCondition: 'GOOD',
      shift: 'SHIFT_1',
      target_road_id: 'cmhsbjn8x02s2maft90hi31ty',
      target_excavator_id: 'cmhsbjpma05ddmaft5kv95dom',
    },
    decision_variables: {
      alokasi_truk: [5, 10],
      jumlah_excavator: [1, 2],
    },
  };

  try {
    console.log('\nSending Test 1...');
    const response1 = await axios.post(`${AI_API}/get_top_3_strategies`, test1);

    if (response1.data && response1.data.top_3_strategies) {
      const strategies = response1.data.top_3_strategies;
      console.log(`\n✅ Test 1: Received ${strategies.length} strategies\n`);

      strategies.forEach((strat, idx) => {
        const key = Object.keys(strat)[0];
        const data = strat[key];
        console.log(`Strategy ${idx + 1}:`);
        console.log(`  Trucks: ${data.INSTRUKSI_FLAT.JUMLAH_DUMP_TRUCK}`);
        console.log(`  Excavators: ${data.INSTRUKSI_FLAT.JUMLAH_EXCAVATOR}`);
        console.log(`  Route: ${data.INSTRUKSI_FLAT.JALUR_ANGKUT}`);
        console.log(`  Equipment: ${data.INSTRUKSI_FLAT.ALAT_MUAT_TARGET}`);
        console.log(
          `  Weather: ${data.INSTRUKSI_FLAT.JALUR_ANGKUT.includes('Cerah') ? 'N/A' : 'Check'}`
        );
        console.log(`  Profit: ${data.KPI_PREDIKSI.PROFIT}`);
        console.log(`  Production: ${data.KPI_PREDIKSI.PRODUKSI}`);
        console.log(`  Fuel Ratio: ${data.KPI_PREDIKSI.FUEL_RATIO}`);
        console.log('');
      });
    }

    console.log('\n---\n');
    console.log('Test 2: Different parameters (should generate completely different results)');
    const test2 = {
      fixed_conditions: {
        weatherCondition: 'Hujan Lebat',
        roadCondition: 'POOR',
        shift: 'SHIFT_2',
        target_road_id: 'cmhsbjn8x02s2maft90hi31ty',
        target_excavator_id: 'cmhsbjpma05ddmaft5kv95dom',
      },
      decision_variables: {
        alokasi_truk: [15, 20],
        jumlah_excavator: [2, 3],
      },
    };

    console.log('\nSending Test 2...');
    const response2 = await axios.post(`${AI_API}/get_top_3_strategies`, test2);

    if (response2.data && response2.data.top_3_strategies) {
      const strategies = response2.data.top_3_strategies;
      console.log(`\n✅ Test 2: Received ${strategies.length} strategies\n`);

      strategies.forEach((strat, idx) => {
        const key = Object.keys(strat)[0];
        const data = strat[key];
        console.log(`Strategy ${idx + 1}:`);
        console.log(`  Trucks: ${data.INSTRUKSI_FLAT.JUMLAH_DUMP_TRUCK}`);
        console.log(`  Excavators: ${data.INSTRUKSI_FLAT.JUMLAH_EXCAVATOR}`);
        console.log(`  Route: ${data.INSTRUKSI_FLAT.JALUR_ANGKUT}`);
        console.log(`  Equipment: ${data.INSTRUKSI_FLAT.ALAT_MUAT_TARGET}`);
        console.log(`  Profit: ${data.KPI_PREDIKSI.PROFIT}`);
        console.log(`  Production: ${data.KPI_PREDIKSI.PRODUKSI}`);
        console.log(`  Fuel Ratio: ${data.KPI_PREDIKSI.FUEL_RATIO}`);
        console.log('');
      });
    }

    console.log('\n✅ SUCCESS CRITERIA:');
    console.log('  ✓ Each test should return 3 unique strategies');
    console.log('  ✓ Strategies should vary in routes, equipment, weather');
    console.log('  ✓ Profit and production values should differ significantly');
    console.log('  ✓ Test 2 (bad conditions) should show lower profits than Test 1');
    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testEnhancedRecommendations();
