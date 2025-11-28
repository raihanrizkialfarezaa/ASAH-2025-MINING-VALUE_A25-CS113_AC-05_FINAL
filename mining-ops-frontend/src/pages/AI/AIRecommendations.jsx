import React, { useState, useEffect } from 'react';
import aiService from '../../services/aiService';
import RecommendationCard from '../../components/AI/RecommendationCard';
import ParameterForm from '../../components/AI/ParameterForm';
import ChatbotWidget from '../../components/AI/ChatbotWidget';
import RealtimeStatus from '../../components/AI/RealtimeStatus';
import { toast } from 'react-toastify';

const AIRecommendations = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [aiServiceHealth, setAiServiceHealth] = useState(null);

  useEffect(() => {
    loadInitialData();
    // Refresh realtime data every 30 seconds
    const interval = setInterval(loadRealtimeData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInitialData = async () => {
    await Promise.all([checkAIHealth(), loadRealtimeData()]);
  };

  const checkAIHealth = async () => {
    try {
      const health = await aiService.checkHealth();
      setAiServiceHealth(health.data);

      if (health.data.status === 'offline') {
        toast.warning('AI Service is offline. Please start the AI service.');
      }
    } catch (error) {
      toast.error('Failed to connect to AI service');
      setAiServiceHealth({ status: 'offline' });
    }
  };

  const loadRealtimeData = async () => {
    try {
      const response = await aiService.getRealtimeConditions();
      if (response.success && response.data) {
        setRealtimeData(response.data);
      }
    } catch (error) {
      console.error('Failed to load realtime data:', error);
    }
  };

  const handleGetRecommendations = async (params) => {
    setLoading(true);
    setRecommendations(null);
    setSelectedStrategy(null);

    // Extract financial parameters and structure them for the API
    const financialParams = {
      HargaJualBatuBara: params.coalPrice || 900000,
      HargaSolar: params.fuelPrice || 15000,
      BiayaAntrianPerJam: params.queueCost || 100000,
      BiayaDemurragePerJam: params.demurrageCost || 50000000,
      BiayaRataRataInsiden: params.incidentCost || 500000,
      BiayaPenaltiKeterlambatanKapal: 100000000, // Default value for major penalty
    };

    const uniqueParams = {
      ...params,
      financialParams, // Add the structured financial params
      _cacheBreaker: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };

    console.log('[AIRecommendations] Sending request with params:', uniqueParams);

    try {
      const result = await aiService.getRecommendations(uniqueParams);

      console.log('[AIRecommendations] Raw response:', JSON.stringify(result, null, 2));

      if (result.success && result.data.top_3_strategies) {
        const mappedRecommendations = result.data.top_3_strategies
          .map((item, index) => {
            const key = Object.keys(item).find((k) => k.startsWith('OPSI_'));
            const data = item[key];

            if (!data) return null;

            const mapped = {
              skenario: {
                alokasi_truk: data.INSTRUKSI_FLAT?.JUMLAH_DUMP_TRUCK || 'N/A',
                jumlah_excavator: data.INSTRUKSI_FLAT?.JUMLAH_EXCAVATOR || 'N/A',
                route: data.INSTRUKSI_FLAT?.JALUR_ANGKUT || 'N/A',
                equipment: data.INSTRUKSI_FLAT?.ALAT_MUAT_TARGET || 'N/A',
              },
              profit_display: data.KPI_PREDIKSI?.PROFIT || 'N/A',
              total_tonase_display: data.KPI_PREDIKSI?.PRODUKSI || 'N/A',
              total_bbm_display: data.KPI_PREDIKSI?.FUEL_RATIO || 'N/A',
              cycle_time_avg_display: data.KPI_PREDIKSI?.ESTIMASI_DURASI || 'N/A',
              efisiensi_display: data.KPI_PREDIKSI?.IDLE_ANTRIAN || 'N/A',
              delay_probability_avg: 0,
              insight: `${data.ANALISIS_KAPAL || ''} ${data.SOP_KESELAMATAN || ''}`.trim(),
              ship_analysis: data.ANALISIS_KAPAL || '',
              safety_sop: data.SOP_KESELAMATAN || '',
              _uniqueId: `${Date.now()}_${index}`,
            };

            console.log(`[AIRecommendations] Mapped strategy ${index + 1}:`, mapped);

            return mapped;
          })
          .filter(Boolean);

        console.log('[AIRecommendations] Setting recommendations:', mappedRecommendations);
        setRecommendations(mappedRecommendations);
        toast.success(`Generated ${mappedRecommendations.length} unique strategies from database!`);
      } else {
        console.error('[AIRecommendations] Invalid response structure:', result);
        toast.error('No recommendations returned');
      }
    } catch (error) {
      console.error('[AIRecommendations] Error:', error);
      toast.error(error.response?.data?.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStrategy = async (index, strategy) => {
    setSelectedStrategy(index);

    try {
      // Save recommendation selection
      await aiService.saveRecommendation({
        scenario: strategy.skenario,
        recommendations: recommendations,
        selectedStrategy: index,
      });

      toast.success(`Strategy ${index + 1} selected and saved`);
    } catch (error) {
      console.error('Failed to save strategy selection:', error);
      toast.error('Failed to save selection');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Strategic Recommendations</h1>
        <p className="text-gray-600">Get data-driven recommendations for optimal mining operations</p>
      </div>

      {/* AI Service Status */}
      {aiServiceHealth && (
        <div className={`mb-4 p-4 rounded-lg ${aiServiceHealth.status === 'online' ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'}`}>
          <div className="flex items-center">
            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${aiServiceHealth.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-semibold">AI Service: {aiServiceHealth.status === 'online' ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      )}

      {/* Real-time Status Dashboard */}
      {realtimeData && <RealtimeStatus data={realtimeData} />}

      {/* Parameter Input Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Simulation Parameters</h2>
        <ParameterForm onSubmit={handleGetRecommendations} realtimeData={realtimeData} loading={loading} />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Running AI simulation...</p>
          <p className="text-sm text-gray-500">This may take 30-60 seconds</p>
        </div>
      )}

      {/* Recommendations Display */}
      {recommendations && !loading && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Top 3 Strategic Options</h2>
            <button onClick={loadRealtimeData} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm">
              Refresh Data
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((rec, index) => (
              <RecommendationCard key={index} rank={index + 1} recommendation={rec} isSelected={selectedStrategy === index} onSelect={() => handleSelectStrategy(index, rec)} />
            ))}
          </div>

          {/* Strategy Comparison Table */}
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Strategy Comparison</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                    {recommendations.map((_, index) => (
                      <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Strategy {index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Trucks</td>
                    {recommendations.map((rec, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rec.skenario.alokasi_truk}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Excavators</td>
                    {recommendations.map((rec, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rec.skenario.jumlah_excavator}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Net Profit</td>
                    {recommendations.map((rec, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rec.profit_display}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total Production</td>
                    {recommendations.map((rec, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rec.total_tonase_display}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Fuel Consumption</td>
                    {recommendations.map((rec, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rec.total_bbm_display}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Widget - Always visible */}
      <ChatbotWidget context={recommendations} aiServiceStatus={aiServiceHealth?.status} />
    </div>
  );
};

export default AIRecommendations;
