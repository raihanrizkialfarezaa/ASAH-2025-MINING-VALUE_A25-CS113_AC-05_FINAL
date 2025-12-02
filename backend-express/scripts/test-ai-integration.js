import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api/v1';
const AI_SERVICE_URL = 'http://localhost:8000';

async function testAIIntegration() {
  try {
    console.log('=== TESTING AI INTEGRATION ===\n');

    console.log('1. Testing Python AI Service Health...');
    try {
      const aiHealth = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
      console.log('✓ AI Service healthy:', aiHealth.data);
    } catch (error) {
      console.log('✗ AI Service NOT responding:', error.message);
      console.log('  Make sure Python AI service is running on port 8000');
      return;
    }

    console.log('\n2. Testing Express Backend Health...');
    try {
      const backendHealth = await axios.get(`${API_URL}/ai/health`, { timeout: 5000 });
      console.log('✓ Backend health check:', backendHealth.data);
    } catch (error) {
      console.log('✗ Backend NOT responding:', error.message);
      return;
    }

    console.log('\n3. Getting authentication token...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'password123',
    });
    const token = loginResponse.data.data.token;
    console.log('✓ Authentication successful');

    const authHeader = {
      headers: { Authorization: `Bearer ${token}` },
    };

    console.log('\n4. Testing realtime-conditions endpoint...');
    try {
      const realtimeResponse = await axios.get(`${API_URL}/ai/realtime-conditions`, authHeader);
      console.log('✓ Realtime conditions retrieved:');
      console.log('  Weather:', realtimeResponse.data.data.weather.condition);
      console.log('  Available trucks:', realtimeResponse.data.data.operational.availableTrucks);
      console.log(
        '  Available excavators:',
        realtimeResponse.data.data.operational.availableExcavators
      );
    } catch (error) {
      console.log('✗ Realtime conditions failed:', error.response?.data || error.message);
      if (error.response?.status === 500) {
        console.log('  Error details:', error.response.data);
      }
    }

    console.log('\n5. Testing recommendations endpoint...');
    const roadSegment = await prisma.roadSegment.findFirst({
      where: { isActive: true },
    });
    const excavator = await prisma.excavator.findFirst({
      where: { status: 'IDLE' },
    });
    const schedule = await prisma.sailingSchedule.findFirst({
      where: { status: 'SCHEDULED' },
      orderBy: { etsLoading: 'asc' },
    });

    const recommendationPayload = {
      weatherCondition: 'Cerah',
      roadCondition: 'GOOD',
      shift: 'SHIFT_1',
      targetRoadId: roadSegment?.id || null,
      targetExcavatorId: excavator?.id || null,
      targetScheduleId: schedule?.id || null,
      minTrucks: 5,
      maxTrucks: 10,
      minExcavators: 1,
      maxExcavators: 2,
    };

    console.log('  Request payload:', JSON.stringify(recommendationPayload, null, 2));

    try {
      const recommendationResponse = await axios.post(
        `${API_URL}/ai/recommendations`,
        recommendationPayload,
        {
          ...authHeader,
          timeout: 60000,
        }
      );
      console.log('✓ Recommendations received successfully!');
      console.log(
        '  Number of strategies:',
        recommendationResponse.data.data?.top_3_strategies?.length || 0
      );
      if (recommendationResponse.data.data?.top_3_strategies?.length > 0) {
        const firstStrategy = recommendationResponse.data.data.top_3_strategies[0];
        console.log('  First strategy rank:', firstStrategy.rank);
        console.log('  Total tonase:', firstStrategy.total_tonase);
        console.log('  Net profit:', firstStrategy.net_profit_idr);
      }
    } catch (error) {
      console.log('✗ Recommendations failed:', error.response?.data || error.message);
      if (error.response?.status === 500) {
        console.log('  Error details:', JSON.stringify(error.response.data, null, 2));
      }
      if (error.code === 'ETIMEDOUT') {
        console.log('  Request timed out - AI service may be processing');
      }
    }

    console.log('\n=== TEST COMPLETE ===');
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testAIIntegration();
