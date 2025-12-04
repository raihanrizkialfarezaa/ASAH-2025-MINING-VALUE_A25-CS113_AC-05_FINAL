import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3000/api/v1';
let authToken = null;

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'password123',
    });
    authToken = response.data.data.token;
    console.log('✅ Logged in successfully');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function fetchData(endpoint) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 100 },
    });
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching ${endpoint}:`, error.response?.data?.message || error.message);
    return null;
  }
}

async function analyzeDataStructure() {
  console.log('\n========== DATA STRUCTURE ANALYSIS ==========\n');

  const endpoints = [
    { name: 'Mining Sites', path: '/locations/mining-sites' },
    { name: 'Road Segments', path: '/locations/road-segments' },
    { name: 'Weather Logs', path: '/weather' },
    { name: 'Trucks', path: '/equipment/trucks' },
    { name: 'Excavators', path: '/equipment/excavators' },
    { name: 'Operators', path: '/operators' },
    { name: 'Hauling Activities', path: '/hauling/activities' },
    { name: 'Vessels', path: '/vessels' },
    { name: 'Sailing Schedules', path: '/vessels/schedules' },
    { name: 'Productions', path: '/production' },
  ];

  const dataMap = {};

  for (const ep of endpoints) {
    const result = await fetchData(ep.path);
    if (result && result.data) {
      const data = Array.isArray(result.data) ? result.data : [result.data];
      dataMap[ep.name] = data;
      console.log(`\n📊 ${ep.name}: ${data.length} records`);

      if (data.length > 0) {
        const sample = data[0];
        console.log(`   Sample keys: ${Object.keys(sample).slice(0, 10).join(', ')}`);

        if (ep.name === 'Mining Sites') {
          data.forEach((site) => {
            console.log(
              `   - ID: ${site.id} | ${site.code}: ${site.name} (Type: ${site.siteType})`
            );
          });
        }

        if (ep.name === 'Road Segments') {
          data.slice(0, 5).forEach((road) => {
            console.log(
              `   - ID: ${road.id} | ${road.code}: ${road.name} | Distance: ${road.distance}km | Condition: ${road.roadCondition} | MiningSite: ${road.miningSiteId}`
            );
          });
        }

        if (ep.name === 'Weather Logs') {
          data.slice(0, 3).forEach((w) => {
            console.log(
              `   - SiteID: ${w.miningSiteId} | Site: ${w.miningSite?.name || 'N/A'} | Condition: ${w.condition} | Temp: ${w.temperature}°C`
            );
          });
        }

        if (ep.name === 'Operators') {
          const byShift = {};
          data.forEach((op) => {
            const shift = op.shift || 'NO_SHIFT';
            byShift[shift] = (byShift[shift] || 0) + 1;
          });
          console.log(`   Operators by shift:`, byShift);
        }

        if (ep.name === 'Hauling Activities') {
          const byShift = {};
          data.forEach((h) => {
            const shift = h.shift || 'NO_SHIFT';
            byShift[shift] = (byShift[shift] || 0) + 1;
          });
          console.log(`   Hauling by shift:`, byShift);
        }

        if (ep.name === 'Sailing Schedules') {
          data.slice(0, 5).forEach((s) => {
            console.log(
              `   - ID: ${s.id} | Vessel: ${s.vessel?.name || s.vesselId} | ETS: ${s.etsLoading} | Qty: ${s.plannedQuantity}T | Status: ${s.status}`
            );
          });
        }
      }
    }
  }

  console.log('\n\n========== DATA RELATIONSHIP CHECK ==========\n');

  if (dataMap['Mining Sites'] && dataMap['Weather Logs']) {
    console.log('🔗 Mining Site to Weather mapping:');
    const siteWeather = {};
    dataMap['Weather Logs'].forEach((w) => {
      const siteId = w.miningSiteId;
      if (siteId) {
        if (!siteWeather[siteId]) siteWeather[siteId] = [];
        siteWeather[siteId].push({ condition: w.condition, riskLevel: w.riskLevel });
      }
    });

    dataMap['Mining Sites'].forEach((site) => {
      const weathers = siteWeather[site.id] || [];
      const latestWeather = weathers[0] || { condition: 'N/A', riskLevel: 'N/A' };
      console.log(
        `   ${site.name}: ${weathers.length} weather records, latest: ${latestWeather.condition} (Risk: ${latestWeather.riskLevel})`
      );
    });
  }

  if (dataMap['Road Segments'] && dataMap['Mining Sites']) {
    console.log('\n🔗 Road Segments by Mining Site:');
    const siteRoads = {};
    dataMap['Road Segments'].forEach((r) => {
      const siteId = r.miningSiteId;
      if (!siteRoads[siteId]) siteRoads[siteId] = [];
      siteRoads[siteId].push({
        id: r.id,
        code: r.code,
        condition: r.roadCondition,
        distance: r.distance,
      });
    });

    dataMap['Mining Sites'].forEach((site) => {
      const roads = siteRoads[site.id] || [];
      console.log(`   ${site.name}: ${roads.length} roads`);
      roads.slice(0, 2).forEach((r) => {
        console.log(`      - ID: ${r.id} | ${r.code}: ${r.distance}km, Condition: ${r.condition}`);
      });
    });
  }

  console.log('\n\n========== RECOMMENDATION STRATEGY DATA ==========\n');
  console.log('For AI Recommendations, we need:');
  console.log('1. Mining Site → Weather Condition mapping');
  console.log('2. Road Segment → Road Condition + Mining Site mapping');
  console.log('3. Shift → Operators filtering');
  console.log('4. Shift → Hauling Activities filtering');
  console.log('5. Vessel Schedule → Selected Schedule matching');

  console.log('\n✅ Analysis complete');
}

async function main() {
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('Cannot proceed without authentication');
    process.exit(1);
  }

  await analyzeDataStructure();
}

main().catch(console.error);
