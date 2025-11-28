import axios from 'axios';

async function testBackendChatbot() {
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin',
      password: 'password123',
    });

    const token = loginResponse.data.data.token;
    console.log('Login successful. Token obtained.');

    // 2. Send Chatbot Request
    const mockContext = [
      {
        skenario: { alokasi_truk: '10 Unit', jumlah_excavator: '2 Unit' },
        profit_display: '1.5 Miliar IDR',
        total_tonase_display: '15,000 Ton',
        total_bbm_display: '0.8 L/Ton',
        cycle_time_avg_display: '12.5 Menit',
        efisiensi_display: '95%',
        delay_probability_avg: 0,
        insight: 'Kapal: MV Borneo | Status: LOADING',
      },
    ];

    const payload = {
      question: 'Strategi mana yang paling untung?',
      context: mockContext,
    };

    console.log('Sending request to Backend Chatbot with Context...');
    const response = await axios.post('http://localhost:3000/api/v1/ai/chatbot', payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('Response received:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the backend running?');
    }
  }
}

testBackendChatbot();
