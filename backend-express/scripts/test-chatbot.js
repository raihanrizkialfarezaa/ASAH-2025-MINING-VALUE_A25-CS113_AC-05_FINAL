import axios from 'axios';

async function testChatbot() {
  try {
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
      pertanyaan_user: 'Strategi mana yang paling untung?',
      top_3_strategies_context: mockContext,
    };

    console.log('Sending request to AI Service Chatbot with Context...');
    const response = await axios.post('http://localhost:8000/ask_chatbot', payload);

    console.log('Response received:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testChatbot();
