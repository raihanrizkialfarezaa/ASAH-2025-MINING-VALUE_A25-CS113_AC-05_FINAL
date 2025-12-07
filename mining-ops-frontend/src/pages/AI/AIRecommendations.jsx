import React, { useState, useEffect } from 'react';
import aiService from '../../services/aiService';
import RecommendationCard from '../../components/AI/RecommendationCard';
import ParameterForm from '../../components/AI/ParameterForm';
import RealtimeStatus from '../../components/AI/RealtimeStatus';
import { toast } from 'react-toastify';
import { Brain, Zap, RefreshCw, Truck, Shovel, TrendingUp, Package, Fuel, Loader2, BarChart3, CheckCircle2, XCircle, Settings2 } from 'lucide-react';

const AIRecommendations = () => {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [aiServiceHealth, setAiServiceHealth] = useState(null);
  const [lastSelectedParams, setLastSelectedParams] = useState(null);

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
    setLastSelectedParams(params);

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
              detailed_equipment: data.DETAILED_EQUIPMENT || [],
              explanations: data.EXPLANATIONS || {},
              financial_breakdown: data.FINANCIAL_BREAKDOWN || {},
              raw_data: data.RAW_DATA || {},
              miningSiteId: params.miningSiteId || null,
              weatherCondition: params.weatherCondition || 'CERAH',
              roadCondition: params.roadCondition || 'GOOD',
              shift: params.shift || 'SHIFT_1',
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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4 mb-3">
          <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl sm:rounded-2xl border border-blue-500/20">
            <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">AI Strategic Recommendations</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Get data-driven recommendations for optimal mining operations</p>
          </div>
        </div>
      </div>

      {/* AI Service Status */}
      {aiServiceHealth && (
        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl backdrop-blur-sm ${aiServiceHealth.status === 'online' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${aiServiceHealth.status === 'online' ? 'bg-blue-500/20' : 'bg-rose-500/20'}`}>
                {aiServiceHealth.status === 'online' ? <CheckCircle2 className="w-5 h-5 text-blue-400" strokeWidth={1.5} /> : <XCircle className="w-5 h-5 text-rose-400" strokeWidth={1.5} />}
              </div>
              <div>
                <span className={`font-semibold text-sm sm:text-base ${aiServiceHealth.status === 'online' ? 'text-blue-300' : 'text-rose-300'}`}>AI Service: {aiServiceHealth.status === 'online' ? 'Online & Ready' : 'Offline'}</span>
                <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{aiServiceHealth.status === 'online' ? 'Multi-objective optimization engine active' : 'Please start the AI service to get recommendations'}</p>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${aiServiceHealth.status === 'online' ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 animate-pulse ${aiServiceHealth.status === 'online' ? 'bg-blue-400' : 'bg-rose-400'}`}></span>
              {aiServiceHealth.status === 'online' ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Status Dashboard */}
      {realtimeData && <RealtimeStatus data={realtimeData} />}

      {/* Parameter Input Form */}
      <div className="rounded-xl sm:rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur-sm p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="p-2 bg-blue-500/20 rounded-xl">
            <Settings2 className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Simulation Parameters</h2>
        </div>
        <ParameterForm onSubmit={handleGetRecommendations} realtimeData={realtimeData} loading={loading} />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-10 sm:py-16 rounded-xl sm:rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-slate-900/50 backdrop-blur-sm">
          <div className="relative inline-flex">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" strokeWidth={1.5} />
            </div>
          </div>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg font-medium text-slate-200">Running AI Simulation...</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 sm:mt-2 px-4">Analyzing multi-objective optimization scenarios</p>
          <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4 text-blue-400 text-xs sm:text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Estimated time: 30-60 seconds</span>
          </div>
        </div>
      )}

      {/* Recommendations Display */}
      {recommendations && !loading && (
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
                <Zap className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">Top 3 Strategic Options</h2>
            </div>
            <button
              onClick={loadRealtimeData}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-sm text-blue-400 font-medium transition-all hover:scale-105"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recommendations.map((rec, index) => (
              <RecommendationCard key={index} rank={index + 1} recommendation={rec} isSelected={selectedStrategy === index} onSelect={() => handleSelectStrategy(index, rec)} selectedParams={lastSelectedParams} />
            ))}
          </div>

          {/* Strategy Comparison Table */}
          <div className="mt-6 sm:mt-8 rounded-xl sm:rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-100">Strategy Comparison</h3>
              </div>
            </div>
            <div className="p-3 sm:p-6">
              <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-blue-400 uppercase tracking-wider">Metric</th>
                      {recommendations.map((_, index) => (
                        <th key={index} className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <span
                            className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg ${
                              index === 0 ? 'bg-blue-500/20 text-blue-400' : index === 1 ? 'bg-sky-500/20 text-sky-400' : 'bg-cyan-500/20 text-cyan-400'
                            }`}
                          >
                            <span className="hidden sm:inline">#{index + 1}</span>
                            <span className="sm:hidden">#</span>
                            <span className="hidden sm:inline">Strategy</span>
                            <span className="sm:hidden">{index + 1}</span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-slate-800/30 transition-colors border-b border-slate-700/30">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-sky-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="hidden sm:inline">Trucks</span>
                          <span className="sm:hidden">Trk</span>
                        </div>
                      </td>
                      {recommendations.map((rec, index) => (
                        <td key={index} className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-300 font-medium">
                          {rec.skenario.alokasi_truk} <span className="text-slate-500 text-xs hidden sm:inline">units</span>
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors border-b border-slate-700/30">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <Shovel className="w-4 h-4 text-cyan-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="hidden sm:inline">Excavators</span>
                          <span className="sm:hidden">Exc</span>
                        </div>
                      </td>
                      {recommendations.map((rec, index) => (
                        <td key={index} className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-300 font-medium">
                          {rec.skenario.jumlah_excavator} <span className="text-slate-500 text-xs hidden sm:inline">units</span>
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors border-b border-slate-700/30">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="hidden sm:inline">Net Profit</span>
                          <span className="sm:hidden">Profit</span>
                        </div>
                      </td>
                      {recommendations.map((rec, index) => (
                        <td key={index} className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-blue-400 font-semibold">
                          {rec.profit_display}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors border-b border-slate-700/30">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-sky-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="hidden sm:inline">Total Production</span>
                          <span className="sm:hidden">Prod</span>
                        </div>
                      </td>
                      {recommendations.map((rec, index) => (
                        <td key={index} className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-sky-400 font-semibold">
                          {rec.total_tonase_display}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-cyan-400 flex-shrink-0" strokeWidth={1.5} />
                          <span className="hidden sm:inline">Fuel Consumption</span>
                          <span className="sm:hidden">Fuel</span>
                        </div>
                      </td>
                      {recommendations.map((rec, index) => (
                        <td key={index} className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-cyan-400 font-semibold">
                          {rec.total_bbm_display}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
