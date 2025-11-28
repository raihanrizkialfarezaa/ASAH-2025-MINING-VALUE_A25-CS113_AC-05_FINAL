/**
 * Test Multi-Objective Optimization
 * Validates that 3 strategies have genuinely different KPIs:
 * - Strategy 1: Maximize Profit (should have highest profit)
 * - Strategy 2: Minimize Cycle Time (should have fastest operation)
 * - Strategy 3: Minimize Distance (should have shortest route)
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';
const AI_SERVICE_BASE = 'http://localhost:8000';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
}

async function testMultiObjective() {
  logSection('🚀 MULTI-OBJECTIVE OPTIMIZATION TEST');

  try {
    // Test Case 1: Different Weather Conditions
    log('\n📊 Test Case 1: Cerah Weather (Optimal Conditions)', 'cyan');
    const cerahParams = {
      fixed_conditions: {
        weatherCondition: 'Cerah',
        roadCondition: 'GOOD',
        shift: 'SHIFT_1',
        target_road_id: null,
        target_excavator_id: null,
        target_schedule_id: null,
        simulation_start_date: new Date().toISOString(),
      },
      decision_variables: {
        min_trucks: 5,
        max_trucks: 15,
        min_excavators: 1,
        max_excavators: 3,
      },
    };

    log('Calling AI service...', 'yellow');
    const cerahResponse = await axios.post(`${AI_SERVICE_BASE}/get_top_3_strategies`, cerahParams);

    const cerahStrategies = cerahResponse.data.top_3_strategies;
    log(`✅ Received ${cerahStrategies.length} strategies`, 'green');

    // Debug: Log raw response
    log('\n🔍 Raw Response Structure:', 'yellow');
    console.log(JSON.stringify(cerahStrategies[0], null, 2).substring(0, 500));

    // Validate Multi-Objective Trade-offs
    logSection('🎯 MULTI-OBJECTIVE VALIDATION (Cerah)');

    const s1 = cerahStrategies[0]; // Max Profit
    const s2 = cerahStrategies[1]; // Min Cycle Time
    const s3 = cerahStrategies[2]; // Min Distance

    log('\nStrategy 1: MAXIMIZE PROFIT', 'bright');
    log(`  Profit         : Rp ${formatNumber(s1.profit_rp)}`);
    log(`  Production     : ${formatNumber(s1.total_production_ton)} Ton`);
    log(`  Cycle Time     : ${s1.cycle_time_hours?.toFixed(2) || 'N/A'} hours`);
    log(`  Distance       : ${s1.distance_km?.toFixed(2) || 'N/A'} km`);
    log(`  Fuel/Ton       : ${s1.fuel_per_ton?.toFixed(2) || 'N/A'} L/Ton`);
    log(`  Z-Score Profit : ${s1.Z_SCORE_PROFIT?.toFixed(2) || 'N/A'}`);
    log(`  Trucks         : ${s1.alokasi_truk}`);
    log(`  Excavators     : ${s1.jumlah_excavator}`);
    log(`  Road           : ${s1.road_segment_name || 'N/A'}`);

    log('\nStrategy 2: MINIMIZE CYCLE TIME (Fastest)', 'bright');
    log(`  Profit         : Rp ${formatNumber(s2.profit_rp)}`);
    log(`  Production     : ${formatNumber(s2.total_production_ton)} Ton`);
    log(`  Cycle Time     : ${s2.cycle_time_hours?.toFixed(2) || 'N/A'} hours`);
    log(`  Distance       : ${s2.distance_km?.toFixed(2) || 'N/A'} km`);
    log(`  Fuel/Ton       : ${s2.fuel_per_ton?.toFixed(2) || 'N/A'} L/Ton`);
    log(`  Z-Score Profit : ${s2.Z_SCORE_PROFIT?.toFixed(2) || 'N/A'}`);
    log(`  Trucks         : ${s2.alokasi_truk}`);
    log(`  Excavators     : ${s2.jumlah_excavator}`);
    log(`  Road           : ${s2.road_segment_name || 'N/A'}`);

    log('\nStrategy 3: MINIMIZE DISTANCE (Shortest Route)', 'bright');
    log(`  Profit         : Rp ${formatNumber(s3.profit_rp)}`);
    log(`  Production     : ${formatNumber(s3.total_production_ton)} Ton`);
    log(`  Cycle Time     : ${s3.cycle_time_hours?.toFixed(2) || 'N/A'} hours`);
    log(`  Distance       : ${s3.distance_km?.toFixed(2) || 'N/A'} km`);
    log(`  Fuel/Ton       : ${s3.fuel_per_ton?.toFixed(2) || 'N/A'} L/Ton`);
    log(`  Z-Score Profit : ${s3.Z_SCORE_PROFIT?.toFixed(2) || 'N/A'}`);
    log(`  Trucks         : ${s3.alokasi_truk}`);
    log(`  Excavators     : ${s3.jumlah_excavator}`);
    log(`  Road           : ${s3.road_segment_name || 'N/A'}`);

    // Trade-off Analysis
    logSection('⚖️  TRADE-OFF ANALYSIS');

    const profitDiff = ((s1.profit_rp - s2.profit_rp) / s1.profit_rp) * 100;
    const cycleTimeDiff = ((s1.cycle_time_hours - s2.cycle_time_hours) / s1.cycle_time_hours) * 100;
    const distanceDiff = ((s1.distance_km - s3.distance_km) / s1.distance_km) * 100;

    log('\n📈 Trade-off Metrics:', 'cyan');
    log(`  Strategy 1 (Profit) vs Strategy 2 (Speed):`);
    log(`    ➤ Profit difference: ${profitDiff.toFixed(2)}% (S1 should be higher)`);
    log(`    ➤ Cycle time difference: ${cycleTimeDiff.toFixed(2)}% (S2 should be faster)`);

    log(`\n  Strategy 1 (Profit) vs Strategy 3 (Distance):`);
    log(
      `    ➤ Profit difference: ${(((s1.profit_rp - s3.profit_rp) / s1.profit_rp) * 100).toFixed(2)}% (S1 should be higher)`
    );
    log(`    ➤ Distance difference: ${distanceDiff.toFixed(2)}% (S3 should be shorter)`);

    // Validation Checks
    logSection('✅ VALIDATION CHECKS');

    const checks = {
      profit_ranking: s1.profit_rp >= s2.profit_rp && s1.profit_rp >= s3.profit_rp,
      speed_ranking:
        s2.cycle_time_hours <= s1.cycle_time_hours && s2.cycle_time_hours <= s3.cycle_time_hours,
      distance_ranking: s3.distance_km <= s1.distance_km && s3.distance_km <= s2.distance_km,
      strategies_different:
        s1.road_segment_name !== s2.road_segment_name || s1.alokasi_truk !== s2.alokasi_truk,
      all_metrics_present:
        s1.cycle_time_hours && s2.cycle_time_hours && s3.distance_km && s1.distance_km,
    };

    log(
      `\n1. Profit Ranking: ${checks.profit_ranking ? '✅ PASS' : '❌ FAIL'}`,
      checks.profit_ranking ? 'green' : 'red'
    );
    log(`   Strategy 1 has highest profit: ${checks.profit_ranking}`);

    log(
      `\n2. Speed Ranking: ${checks.speed_ranking ? '✅ PASS' : '❌ FAIL'}`,
      checks.speed_ranking ? 'green' : 'red'
    );
    log(`   Strategy 2 has lowest cycle time: ${checks.speed_ranking}`);

    log(
      `\n3. Distance Ranking: ${checks.distance_ranking ? '✅ PASS' : '❌ FAIL'}`,
      checks.distance_ranking ? 'green' : 'red'
    );
    log(`   Strategy 3 has shortest distance: ${checks.distance_ranking}`);

    log(
      `\n4. Strategies Different: ${checks.strategies_different ? '✅ PASS' : '❌ FAIL'}`,
      checks.strategies_different ? 'green' : 'red'
    );
    log(`   Strategies use different configurations: ${checks.strategies_different}`);

    log(
      `\n5. All Metrics Present: ${checks.all_metrics_present ? '✅ PASS' : '❌ FAIL'}`,
      checks.all_metrics_present ? 'green' : 'red'
    );
    log(`   cycle_time_hours, distance_km populated: ${checks.all_metrics_present}`);

    const allPassed = Object.values(checks).every((check) => check === true);

    // Test Case 2: Extreme Weather
    log('\n\n📊 Test Case 2: Hujan Lebat Weather (Challenging Conditions)', 'cyan');
    const hujanParams = {
      ...cerahParams,
      fixed_conditions: {
        ...cerahParams.fixed_conditions,
        weatherCondition: 'Hujan Lebat',
        roadCondition: 'POOR',
      },
    };

    log('Calling AI service...', 'yellow');
    const hujanResponse = await axios.post(`${AI_SERVICE_BASE}/get_top_3_strategies`, hujanParams);

    const hujanStrategies = hujanResponse.data.top_3_strategies;
    log(`✅ Received ${hujanStrategies.length} strategies`, 'green');

    const h1 = hujanStrategies[0];
    const h2 = hujanStrategies[1];
    const h3 = hujanStrategies[2];

    log('\n🌧️  Weather Impact Comparison:', 'cyan');
    log(`  Cerah Profit (S1)       : Rp ${formatNumber(s1.profit_rp)}`);
    log(`  Hujan Lebat Profit (S1) : Rp ${formatNumber(h1.profit_rp)}`);
    log(
      `  Impact                  : ${(((s1.profit_rp - h1.profit_rp) / s1.profit_rp) * 100).toFixed(2)}% reduction`
    );

    log(`\n  Cerah Cycle Time (S2)   : ${s2.cycle_time_hours?.toFixed(2) || 'N/A'} hours`);
    log(`  Hujan Cycle Time (S2)   : ${h2.cycle_time_hours?.toFixed(2) || 'N/A'} hours`);
    log(
      `  Impact                  : ${(((h2.cycle_time_hours - s2.cycle_time_hours) / s2.cycle_time_hours) * 100).toFixed(2)}% increase`
    );

    // Final Summary
    logSection('📋 FINAL SUMMARY');

    if (allPassed) {
      log('✅ ALL VALIDATION CHECKS PASSED!', 'green');
      log('\nMulti-Objective Optimization is working correctly:', 'green');
      log('  ✅ Strategy 1 maximizes profit', 'green');
      log('  ✅ Strategy 2 minimizes cycle time', 'green');
      log('  ✅ Strategy 3 minimizes distance', 'green');
      log('  ✅ All strategies have different configurations', 'green');
      log('  ✅ All metrics are populated', 'green');
    } else {
      log('❌ SOME VALIDATION CHECKS FAILED!', 'red');
      log('\nPlease review the failed checks above.', 'yellow');
    }

    log('\n🎯 Recommendation:', 'cyan');
    log('  - Use Strategy 1 for maximum profit (best for revenue targets)');
    log('  - Use Strategy 2 for fastest operations (best for tight deadlines)');
    log('  - Use Strategy 3 for fuel efficiency (best for cost reduction)');

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    log('\n❌ TEST FAILED!', 'red');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'red');
      log(`Message: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`Error: ${error.message}`, 'red');
    }
    process.exit(1);
  }
}

// Run test
testMultiObjective();
