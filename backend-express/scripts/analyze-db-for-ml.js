import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

async function analyzeDatabase() {
  console.log('\n=== DATABASE ANALYSIS FOR ML RECOMMENDATIONS ===\n');

  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'password123',
    });

    const token = loginResponse.data.data.token;

    const api = axios.create({
      baseURL: BASE_URL,
      headers: { Authorization: `Bearer ${token}` },
    });

    const [
      trucksRes,
      excavatorsRes,
      operatorsRes,
      roadsRes,
      loadingRes,
      dumpingRes,
      vesselsRes,
      schedulesRes,
    ] = await Promise.all([
      api.get('/trucks?limit=1000'),
      api.get('/excavators?limit=1000'),
      api.get('/operators?limit=1000'),
      api.get('/locations/road-segments?limit=1000'),
      api.get('/locations/loading-points?limit=1000'),
      api.get('/locations/dumping-points?limit=1000'),
      api.get('/vessels?limit=1000'),
      api.get('/vessels/schedules?limit=100'),
    ]);

    const trucks = trucksRes.data.data.filter((t) => t.status === 'active');
    const excavators = excavatorsRes.data.data.filter((e) => e.status === 'active');
    const operators = operatorsRes.data.data.filter((o) => o.status === 'active');
    const roads = roadsRes.data.data;
    const loadingPoints = loadingRes.data.data;
    const dumpingPoints = dumpingRes.data.data;
    const vessels = vesselsRes.data.data.filter((v) => v.status === 'active');
    const schedules = schedulesRes.data.data;

    console.log('📊 AVAILABLE DATA FOR ML PROCESSING:');
    console.log(`   Trucks: ${trucks.length} active`);
    console.log(`   Excavators: ${excavators.length} active`);
    console.log(`   Operators: ${operators.length} active`);
    console.log(`   Road Segments: ${roads.length} total`);
    console.log(`   Loading Points: ${loadingPoints.length} total`);
    console.log(`   Dumping Points: ${dumpingPoints.length} total`);
    console.log(`   Vessels: ${vessels.length} active`);
    console.log(`   Schedules: ${schedules.length} upcoming`);

    console.log('\n🔍 SAMPLE DATA FOR VALIDATION:');
    console.log(
      '   Trucks:',
      trucks.slice(0, 3).map((t) => t.truck_code)
    );
    console.log(
      '   Excavators:',
      excavators.slice(0, 3).map((e) => e.excavator_code)
    );
    console.log(
      '   Roads:',
      roads.slice(0, 3).map((r) => `${r.segment_name} (${r.road_condition})`)
    );

    const uniqueRoadConditions = [...new Set(roads.map((r) => r.road_condition))];
    const uniqueFuelTypes = [...new Set(trucks.map((t) => t.fuel_type))];

    console.log('\n📈 DATA CHARACTERISTICS:');
    console.log(`   Road Conditions: ${uniqueRoadConditions.join(', ')}`);
    console.log(`   Fuel Types: ${uniqueFuelTypes.join(', ')}`);
    console.log(
      `   Avg Road Distance: ${(roads.reduce((sum, r) => sum + r.distance_km, 0) / roads.length).toFixed(2)} km`
    );
    console.log(
      `   Avg Truck Capacity: ${(trucks.reduce((sum, t) => sum + t.capacity, 0) / trucks.length).toFixed(2)} ton`
    );

    console.log('\n💡 POTENTIAL COMBINATIONS:');
    const potentialCombos =
      trucks.length *
      excavators.length *
      roads.length *
      loadingPoints.length *
      dumpingPoints.length;
    console.log(`   Mathematical Combinations: ${potentialCombos.toLocaleString()}`);
    console.log(
      `   Practical ML Scenarios: ~${Math.min(potentialCombos, 10000).toLocaleString()} (filtered by ML)`
    );
  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyzeDatabase().catch(console.error);
