import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import aiService from '../../services/aiService';
import {
  Award,
  Trophy,
  Medal,
  Truck,
  Shovel,
  Route,
  DollarSign,
  Package,
  Fuel,
  Clock,
  Gauge,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  ArrowRight,
  Layers,
  Ship,
  Shield,
  MapPin,
  CloudSun,
  RefreshCw,
  Sparkles,
  Target,
  BarChart3,
  Workflow,
  Activity,
  Zap,
} from 'lucide-react';

// Helper to render rich markdown (bold, code, lists, indentation)
const renderMarkdown = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, index) => {
    let indentClass = '';
    if (line.startsWith('      ')) indentClass = 'pl-12';
    else if (line.startsWith('   ')) indentClass = 'pl-6';
    else if (line.startsWith('-') || line.match(/^\d+\./)) indentClass = 'pl-3';

    const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);

    return (
      <div key={index} className={`mb-1 text-sm leading-relaxed ${indentClass} text-slate-300`}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={i} className="font-semibold text-slate-100">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={i} className="bg-slate-800/50 text-sky-400 px-1 rounded font-mono text-xs">
                {part.slice(1, -1)}
              </code>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  });
};

// Expandable insight component - blue theme
const InsightExpandable = ({ insight }) => {
  const [expanded, setExpanded] = useState(false);
  const maxLength = 150;
  const isLong = insight && insight.length > maxLength;

  return (
    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
      <div className="flex items-start">
        <div className="p-1 sm:p-1.5 bg-cyan-500/20 rounded-lg mr-2 sm:mr-3 mt-0.5 flex-shrink-0">
          <Lightbulb className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs sm:text-sm text-slate-300 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>{insight}</p>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="text-cyan-400 hover:text-cyan-300 text-xs font-medium mt-2 flex items-center gap-1 transition-colors">
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Read more...
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const RecommendationCard = ({ rank, recommendation, isSelected, onSelect, selectedParams }) => {
  const [showModal, setShowModal] = useState(false);
  const [showHaulingConfirmModal, setShowHaulingConfirmModal] = useState(false);
  const [isApplyingHauling, setIsApplyingHauling] = useState(false);
  const navigate = useNavigate();

  const getBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return 'from-amber-500 to-yellow-600';
      case 2:
        return 'from-slate-400 to-slate-500';
      case 3:
        return 'from-orange-500 to-amber-600';
      default:
        return 'from-blue-500 to-cyan-600';
    }
  };

  const getRankIcon = (rank) => {
    const iconClass = 'w-6 h-6';
    switch (rank) {
      case 1:
        return <Trophy className={`${iconClass} text-yellow-300`} strokeWidth={2} />;
      case 2:
        return <Medal className={`${iconClass} text-slate-200`} strokeWidth={2} />;
      case 3:
        return <Award className={`${iconClass} text-orange-200`} strokeWidth={2} />;
      default:
        return <Award className={`${iconClass} text-blue-300`} strokeWidth={2} />;
    }
  };

  const handleSelectClick = () => {
    setShowModal(true);
  };

  const handleConfirmSelect = () => {
    setShowModal(false);
    onSelect();
  };

  const handleImplementStrategy = () => {
    const hasRecommendedEquipment = recommendation.detailed_equipment && recommendation.detailed_equipment.length > 0;
    const hasHaulingData = recommendation.hauling_data?.has_hauling_data;

    if (hasRecommendedEquipment || hasHaulingData) {
      setShowHaulingConfirmModal(true);
    } else {
      proceedToProduction();
    }
  };

  const proceedToProduction = () => {
    const strategyData = {
      rank: rank,
      recommendation: recommendation,
      implementedAt: new Date().toISOString(),
      useHaulingData: recommendation.hauling_data?.has_hauling_data || false,
      haulingActivityIds: recommendation.hauling_data?.hauling_analysis?.hauling_activity_ids || [],
      haulingAggregated: recommendation.hauling_data?.hauling_analysis?.aggregated || null,
      equipmentAllocation: recommendation.hauling_data?.hauling_analysis?.equipment_allocation || null,
      miningSiteId: recommendation.miningSiteId || selectedParams?.miningSiteId || null,
      weatherCondition: recommendation.weatherCondition || selectedParams?.weatherCondition || 'CERAH',
      roadCondition: recommendation.roadCondition || selectedParams?.roadCondition || 'GOOD',
      shift: recommendation.shift || selectedParams?.shift || 'SHIFT_1',
    };

    sessionStorage.setItem('selectedStrategy', JSON.stringify(strategyData));
    navigate('/production');
  };

  const handleHaulingConfirm = async (action) => {
    setIsApplyingHauling(true);

    try {
      const truckEquip = recommendation.detailed_equipment?.filter((e) => e.type === 'Truck') || [];
      const excavatorEquip = recommendation.detailed_equipment?.filter((e) => e.type === 'Excavator') || [];

      const truckIds = truckEquip.map((e) => e.id);
      const excavatorIds = excavatorEquip.map((e) => e.id);

      const raw = recommendation.raw_data || {};
      const haulingData = recommendation.hauling_data?.hauling_analysis || {};

      const operatorIds = haulingData.equipment_allocation?.operator_ids || [];

      const firstHaulingId = recommendation.hauling_data?.hauling_analysis?.hauling_activity_ids?.[0] || null;

      // Get Production Target from recommendation
      const productionTarget = parseFloat(raw.total_tonase) || parseFloat(recommendation.total_tonase) || 270; // Default 270 ton

      const params = {
        action: action,
        existingHaulingId: action === 'update' ? firstHaulingId : null,
        recommendation: {
          rank,
          strategy_objective: raw.strategy_objective || 'AI Recommended Configuration',
        },
        truckIds: truckIds.length > 0 ? truckIds : haulingData.equipment_allocation?.truck_ids || [],
        excavatorIds: excavatorIds.length > 0 ? excavatorIds : haulingData.equipment_allocation?.excavator_ids || [],
        operatorIds: operatorIds,
        loadingPointId: haulingData.loading_point_id || null,
        dumpingPointId: haulingData.dumping_point_id || null,
        roadSegmentId: raw.target_road_id || null,
        shift: raw.shift || 'SHIFT_1',
        loadWeight: null, // Kosongkan untuk admin mengisi
        targetWeight: 30, // Fallback, akan dihitung di backend dari totalProductionTarget
        totalProductionTarget: productionTarget, // Production Target untuk dibagi ke setiap hauling
        distance: raw.distance_km || haulingData.aggregated?.avg_distance || 3,
      };

      const result = await aiService.applyHaulingRecommendation(params);

      if (result.success) {
        const alertMessage =
          action === 'update'
            ? `Hauling activity updated successfully! Activity: ${result.data.updatedActivity?.activityNumber}`
            : `${result.data.createdCount} hauling activities created successfully! Target Weight per hauling: ${result.data.targetWeightPerHauling?.toFixed(2)} ton`;

        window.alert(alertMessage);

        // Get values from backend result (calculated with actual equipment fuel consumption)
        const truckCount = params.truckIds?.length || 1;
        const excavatorCount = params.excavatorIds?.length || 1;
        const distance = parseFloat(params.distance) || 3;
        const targetWeightPerHauling = result.data.targetWeightPerHauling || params.totalProductionTarget / truckCount;

        // Use total fuel calculated by backend using actual equipment fuelConsumption data
        const totalFuelLiter = result.data.totalCalculatedFuel || 0;

        // Calculate Avg Cycle Time from hauling activities
        const avgCycleTimeMinutes = result.data.createdActivities?.[0]?.truck?.averageSpeed
          ? ((distance * 2) / result.data.createdActivities[0].truck.averageSpeed) * 60 + 8 // travel + loading time
          : 15; // default

        // Calculate utilization rate (operating hours / available hours)
        const shiftHours = 8;
        const totalOperatingMinutes = avgCycleTimeMinutes * truckCount;
        const availableMinutes = shiftHours * 60;
        const utilizationRate = Math.min((totalOperatingMinutes / availableMinutes) * 100, 100);

        // Get equipment fuel rates from created activities for reference
        const firstActivity = result.data.createdActivities?.[0];
        const truckFuelRate = firstActivity?.truck?.fuelConsumption || 1.0;
        const excavatorFuelRate = firstActivity?.excavator?.fuelConsumption || 50;

        const strategyData = {
          rank: rank,
          recommendation: recommendation,
          implementedAt: new Date().toISOString(),
          useHaulingData: true,
          haulingActivityIds: action === 'update' ? [result.data.updatedActivity?.id] : result.data.createdActivities?.map((a) => a.id) || [],
          haulingAggregated: {
            total_tonase: params.totalProductionTarget,
            total_trips: truckCount,
            total_distance_km: distance * 2 * truckCount,
            total_fuel_liter: totalFuelLiter,
            avg_cycle_time_minutes: avgCycleTimeMinutes,
            avg_load_weight: 0,
            target_weight_per_hauling: targetWeightPerHauling,
            trucks_operating: truckCount,
            excavators_operating: excavatorCount,
            utilization_rate_percent: utilizationRate,
            shift: params.shift,
            weatherCondition: recommendation.weatherCondition || selectedParams?.weatherCondition || 'CERAH',
            roadCondition: recommendation.roadCondition || selectedParams?.roadCondition || 'GOOD',
            calculation_params: {
              truck_fuel_rate_lkm: truckFuelRate,
              excavator_fuel_rate_lhr: excavatorFuelRate,
              speed_loaded_kmh: firstActivity?.truck?.averageSpeed || 20,
              speed_empty_kmh: 30,
              production_target: params.totalProductionTarget,
              target_per_hauling: targetWeightPerHauling,
            },
          },
          equipmentAllocation: {
            truck_ids: params.truckIds,
            excavator_ids: params.excavatorIds,
            operator_ids: params.operatorIds,
          },
          haulingApplied: true,
          haulingResult: result.data,
          miningSiteId: recommendation.miningSiteId || selectedParams?.miningSiteId || null,
          weatherCondition: recommendation.weatherCondition || selectedParams?.weatherCondition || 'CERAH',
          roadCondition: recommendation.roadCondition || selectedParams?.roadCondition || 'GOOD',
          shift: recommendation.shift || selectedParams?.shift || 'SHIFT_1',
        };

        sessionStorage.setItem('selectedStrategy', JSON.stringify(strategyData));
        setShowHaulingConfirmModal(false);
        navigate('/production');
      }
    } catch (error) {
      console.error('Failed to apply hauling recommendation:', error);
      window.alert(`Failed to apply hauling recommendation: ${error.message}`);
    } finally {
      setIsApplyingHauling(false);
    }
  };

  const handleSkipHauling = () => {
    setShowHaulingConfirmModal(false);
    proceedToProduction();
  };

  return (
    <>
      <div
        className={`rounded-xl sm:rounded-2xl border bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl overflow-hidden transition-all duration-300 shadow-xl ${
          isSelected ? 'ring-2 ring-blue-500 border-blue-500/50 transform scale-[1.02] shadow-blue-500/20' : 'border-slate-700/50 hover:border-slate-600/50 hover:shadow-2xl'
        }`}
      >
        {/* Header with Rank */}
        <div className={`bg-gradient-to-r ${getBadgeColor(rank)} text-white p-3 sm:p-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {getRankIcon(rank)}
              <h3 className="text-lg sm:text-xl font-bold">Strategy #{rank}</h3>
            </div>
            <span className="text-xs sm:text-sm bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium">Rank {rank}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Mining Site Info */}
          {selectedParams?.miningSiteId && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="flex items-center text-xs sm:text-sm gap-2">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-blue-300 font-medium">Mining Site:</span>
                <span className="text-blue-200 truncate">{selectedParams.miningSiteName || selectedParams.miningSiteId}</span>
              </div>
              {selectedParams?.weatherCondition && (
                <div className="flex items-center text-xs sm:text-sm mt-1.5 sm:mt-2 gap-2">
                  <CloudSun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" strokeWidth={1.5} />
                  <span className="text-blue-300 font-medium">Weather:</span>
                  <span className="text-blue-200">{selectedParams.weatherCondition}</span>
                </div>
              )}
            </div>
          )}

          {/* Scenario Configuration */}
          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
            <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
              Configuration
            </h4>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-400" strokeWidth={1.5} />
                  <span className="text-slate-400">Trucks:</span>
                  <span className="font-semibold text-slate-200">{recommendation.skenario.alokasi_truk}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shovel className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                  <span className="text-slate-400">Excavators:</span>
                  <span className="font-semibold text-slate-200">{recommendation.skenario.jumlah_excavator}</span>
                </div>
              </div>
              {recommendation.skenario.route && (
                <div className="pt-3 border-t border-slate-700/50">
                  <div className="flex items-start gap-2">
                    <Route className="w-4 h-4 text-blue-400 mt-0.5" strokeWidth={1.5} />
                    <div>
                      <span className="text-slate-400 block text-xs mb-1">Route:</span>
                      <div className="font-medium text-xs text-blue-300 break-words">{recommendation.skenario.route}</div>
                    </div>
                  </div>
                </div>
              )}
              {recommendation.skenario.equipment && (
                <div className="pt-3 border-t border-slate-700/50">
                  <div className="flex items-start gap-2">
                    <Shovel className="w-4 h-4 text-cyan-400 mt-0.5" strokeWidth={1.5} />
                    <div>
                      <span className="text-slate-400 block text-xs mb-1">Main Equipment:</span>
                      <div className="font-medium text-xs text-cyan-300 break-words">{recommendation.skenario.equipment}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <span className="text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
                Net Profit
              </span>
              <span className="font-bold text-emerald-400 text-lg">{recommendation.profit_display}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                Production Target
              </span>
              <span className="font-semibold text-blue-300">{recommendation.total_tonase_display}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
                Fuel Consumption
              </span>
              <span className="font-semibold text-amber-400">{recommendation.total_bbm_display}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
                Est. Vessel Completion
              </span>
              <span className="font-semibold text-cyan-300">{recommendation.cycle_time_avg_display}</span>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-center">
              <div className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">
                <Gauge className="w-3 h-3" />
                Efficiency
              </div>
              <div className="text-lg font-bold text-blue-400">{recommendation.efisiensi_display}</div>
            </div>
            <div className="bg-slate-700/30 border border-slate-600/30 p-3 rounded-xl text-center">
              <div className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Delay Risk
              </div>
              <div className="text-lg font-bold text-slate-300">{recommendation.delay_probability_avg ? `${(recommendation.delay_probability_avg * 100).toFixed(1)}%` : 'N/A'}</div>
            </div>
          </div>

          {/* AI Insight - Expandable */}
          {recommendation.insight && <InsightExpandable insight={recommendation.insight} />}

          {/* Select Button */}
          <button
            onClick={handleSelectClick}
            className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              isSelected ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50 hover:border-blue-500/30'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-5 h-5" />
                View Details & Selected
              </>
            ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                Select This Strategy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Detailed Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${getBadgeColor(rank)} text-white p-6 rounded-t-2xl flex justify-between items-center sticky top-0 z-10`}>
              <div className="flex items-center gap-4">
                {getRankIcon(rank)}
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">Strategy #{rank} - Analysis & Guidebook</h2>
                  <p className="text-white/80 mt-1 text-sm">Detailed Operational Plan & Financial Breakdown</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/20 rounded-xl p-2.5 transition-colors">
                <X className="w-6 h-6" strokeWidth={2} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-8">
              {/* 1. Executive Summary */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
                    <h4 className="text-emerald-300 font-bold">Net Profit</h4>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{recommendation.profit_display}</p>
                  <div className="text-xs text-emerald-400/80 mt-3">{renderMarkdown(recommendation.explanations?.FINANCIAL)}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                    <h4 className="text-blue-300 font-bold">Production Target</h4>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{recommendation.total_tonase_display}</p>
                  <div className="text-xs text-blue-400/80 mt-3">{renderMarkdown(recommendation.explanations?.PRODUCTION)}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Fuel className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                    <h4 className="text-amber-300 font-bold">Fuel Efficiency</h4>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{recommendation.total_bbm_display}</p>
                  <div className="text-xs text-amber-400/80 mt-3">{renderMarkdown(recommendation.explanations?.FUEL)}</div>
                </div>
              </section>

              {/* 2. Operational Configuration & Rationale */}
              <section>
                <h3 className="text-xl font-bold text-slate-100 mb-4 border-b-2 border-blue-500/30 pb-3 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <Layers className="w-5 h-5 text-blue-400" strokeWidth={2} />
                  </div>
                  Operational Configuration & Equipment
                </h3>
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5">
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      Configuration Rationale
                    </h4>
                    <div className="text-slate-300 text-sm whitespace-pre-line leading-relaxed">{renderMarkdown(recommendation.explanations?.CONFIGURATION)}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-700/50">
                    <div>
                      <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                        <Route className="w-4 h-4 text-blue-400" />
                        Route Selection
                      </h4>
                      <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl">
                        <p className="font-medium text-blue-400">{recommendation.skenario.route}</p>
                        <div className="text-xs text-slate-400 mt-3 whitespace-pre-line leading-relaxed">{renderMarkdown(recommendation.explanations?.ROUTE)}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                        <Ship className="w-4 h-4 text-cyan-400" />
                        Vessel Status
                      </h4>
                      <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl">
                        <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{renderMarkdown(recommendation.explanations?.VESSEL)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2.5 Flow Breakdown (Hulu → Hilir) */}
              <section>
                <h3 className="text-xl font-bold text-slate-100 mb-4 border-b-2 border-cyan-500/30 pb-3 flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-xl">
                    <Workflow className="w-5 h-5 text-cyan-400" strokeWidth={2} />
                  </div>
                  Production Flow Analysis (Upstream - Downstream)
                </h3>
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-6 shadow-lg">
                  <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{renderMarkdown(recommendation.explanations?.FLOW_BREAKDOWN)}</div>
                </div>
              </section>

              {/* 3. Detailed Equipment List */}
              <section>
                <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-sky-500/20 rounded-xl">
                    <Truck className="w-5 h-5 text-sky-400" strokeWidth={2} />
                  </div>
                  Equipment Allocation
                </h3>
                <div className="bg-slate-900/30 border border-slate-700/50 rounded-2xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-700/50">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Unit ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Model / Name</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-900/30 divide-y divide-slate-700/50">
                      {recommendation.detailed_equipment && recommendation.detailed_equipment.length > 0 ? (
                        recommendation.detailed_equipment.map((eq, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200 flex items-center gap-2">
                              {eq.type === 'Truck' ? <Truck className="w-4 h-4 text-sky-400" /> : <Shovel className="w-4 h-4 text-cyan-400" />}
                              {eq.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">{eq.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{eq.name}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-6 py-8 text-center text-sm text-slate-500">
                            No detailed equipment data available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 4. Financial Breakdown */}
              <section>
                <h3 className="text-xl font-bold text-slate-100 mb-4 border-b-2 border-emerald-500/30 pb-3 flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-emerald-400" strokeWidth={2} />
                  </div>
                  Financial Breakdown & Profitability Analysis
                </h3>
                <div className="bg-slate-900/30 rounded-2xl p-6 border-2 border-emerald-500/20 shadow-lg">
                  <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed font-mono">{renderMarkdown(recommendation.explanations?.FINANCIAL)}</div>
                </div>
              </section>

              {/* 5. Efficiency & Risk Analysis */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" strokeWidth={2} />
                    Efficiency Analysis
                  </h3>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl text-sm text-blue-300">{renderMarkdown(recommendation.explanations?.EFFICIENCY)}</div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" strokeWidth={2} />
                    Delay Risk Analysis
                  </h3>
                  <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl text-sm text-amber-300">{renderMarkdown(recommendation.explanations?.DELAY_RISK)}</div>
                </div>
              </section>

              {/* 6. Hauling Activities Integration */}
              {recommendation.hauling_data && recommendation.hauling_data.has_hauling_data && (
                <section>
                  <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-xl">
                      <Package className="w-5 h-5 text-cyan-400" strokeWidth={2} />
                    </div>
                    Matching Hauling Activities
                    <span className="ml-2 text-sm font-normal text-cyan-400 bg-cyan-500/20 px-3 py-1 rounded-full">{recommendation.hauling_data.hauling_activity_count} activities found</span>
                  </h3>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-5 space-y-5">
                    {/* Aggregated Metrics from Hauling Data */}
                    {recommendation.hauling_data.hauling_analysis?.aggregated && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900/50 border border-cyan-500/20 p-4 rounded-xl">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            Actual Tonase
                          </p>
                          <p className="text-xl font-bold text-cyan-400 mt-1">{recommendation.hauling_data.hauling_analysis.aggregated.total_tonase?.toFixed(0) || 0} ton</p>
                        </div>
                        <div className="bg-slate-900/50 border border-blue-500/20 p-4 rounded-xl">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            Total Trips
                          </p>
                          <p className="text-xl font-bold text-blue-400 mt-1">{recommendation.hauling_data.hauling_analysis.aggregated.total_trips || 0}</p>
                        </div>
                        <div className="bg-slate-900/50 border border-amber-500/20 p-4 rounded-xl">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Fuel className="w-3 h-3" />
                            Fuel Used
                          </p>
                          <p className="text-xl font-bold text-amber-400 mt-1">{recommendation.hauling_data.hauling_analysis.aggregated.total_fuel_liter?.toFixed(0) || 0} L</p>
                        </div>
                        <div className="bg-slate-900/50 border border-sky-500/20 p-4 rounded-xl">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Avg Cycle Time
                          </p>
                          <p className="text-xl font-bold text-sky-400 mt-1">{recommendation.hauling_data.hauling_analysis.aggregated.avg_cycle_time_minutes?.toFixed(1) || 0} min</p>
                        </div>
                      </div>
                    )}

                    {/* Equipment Used from Hauling */}
                    {recommendation.hauling_data.hauling_analysis?.equipment_allocation && (
                      <div className="bg-slate-900/50 border border-slate-700/50 p-5 rounded-xl">
                        <h4 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-cyan-400" />
                          Equipment from Actual Hauling Data
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <p className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                              <Truck className="w-4 h-4 text-sky-400" />
                              Trucks ({recommendation.hauling_data.hauling_analysis.equipment_allocation.truck_ids?.length || 0})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {recommendation.hauling_data.hauling_analysis.equipment_allocation.truck_details?.slice(0, 5).map((truck, idx) => (
                                <span key={idx} className="bg-sky-500/20 text-sky-400 text-xs px-3 py-1.5 rounded-lg font-medium">
                                  {truck.code || truck.id.slice(0, 8)}
                                </span>
                              ))}
                              {(recommendation.hauling_data.hauling_analysis.equipment_allocation.truck_ids?.length || 0) > 5 && (
                                <span className="text-slate-500 text-xs py-1.5">+{(recommendation.hauling_data.hauling_analysis.equipment_allocation.truck_ids?.length || 0) - 5} more</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                              <Shovel className="w-4 h-4 text-cyan-400" />
                              Excavators ({recommendation.hauling_data.hauling_analysis.equipment_allocation.excavator_ids?.length || 0})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {recommendation.hauling_data.hauling_analysis.equipment_allocation.excavator_details?.slice(0, 5).map((exc, idx) => (
                                <span key={idx} className="bg-cyan-500/20 text-cyan-400 text-xs px-3 py-1.5 rounded-lg font-medium">
                                  {exc.code || exc.id.slice(0, 8)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-cyan-400 bg-cyan-500/20 border border-cyan-500/30 p-4 rounded-xl flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> This strategy includes {recommendation.hauling_data.hauling_activity_count} real hauling activities that match your criteria. When you implement this strategy, the production record will be
                        created from actual hauling data instead of simulated estimates.
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* 7. Safety Guidelines (SOP) */}
              <section>
                <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <Shield className="w-5 h-5 text-blue-400" strokeWidth={2} />
                  </div>
                  Safety Guidelines (SOP)
                </h3>
                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-5 rounded-r-xl">
                  <ul className="space-y-3 text-slate-300">
                    {recommendation.safety_sop ? (
                      recommendation.safety_sop.split('|').map((sop, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                          <span>{sop.trim()}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-slate-500 shrink-0" />
                        <span className="text-slate-500">No specific SOP guidelines available.</span>
                      </li>
                    )}
                  </ul>
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-800/50 border-t border-slate-700/50 p-6 rounded-b-2xl flex justify-end gap-4 sticky bottom-0 z-10">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl text-slate-400 hover:bg-slate-700/50 font-medium transition-colors">
                Close
              </button>
              <button onClick={handleConfirmSelect} className="px-6 py-2.5 rounded-xl bg-slate-700 text-white hover:bg-slate-600 font-bold shadow-lg transition-colors flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>Select Strategy</span>
              </button>
              <button
                onClick={handleImplementStrategy}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Implement Strategy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showHaulingConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Layers className="w-6 h-6" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Hauling Data Configuration</h2>
                  <p className="text-blue-200 mt-1 text-sm">Choose how to apply the AI recommended equipment configuration</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5">
                <h3 className="font-semibold text-blue-300 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Recommended Equipment
                </h3>
                <div className="grid grid-cols-2 gap-5 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-500/20 rounded-lg">
                      <Truck className="w-5 h-5 text-sky-400" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Trucks</span>
                      <p className="font-bold text-sky-400 text-lg">{recommendation.skenario?.alokasi_truk || recommendation.detailed_equipment?.filter((e) => e.type === 'Truck').length || 0} Unit</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Shovel className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Excavators</span>
                      <p className="font-bold text-cyan-400 text-lg">{recommendation.skenario?.jumlah_excavator || recommendation.detailed_equipment?.filter((e) => e.type === 'Excavator').length || 0} Unit</p>
                    </div>
                  </div>
                </div>
                {recommendation.detailed_equipment && recommendation.detailed_equipment.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-blue-500/20">
                    <p className="text-xs text-blue-400 mb-3">Recommended Equipment IDs:</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendation.detailed_equipment.slice(0, 10).map((eq, idx) => (
                        <span key={idx} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${eq.type === 'Truck' ? 'bg-sky-500/20 text-sky-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                          {eq.id.slice(0, 12)}...
                        </span>
                      ))}
                      {recommendation.detailed_equipment.length > 10 && <span className="text-xs text-slate-500 py-1.5">+{recommendation.detailed_equipment.length - 10} more</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">
                  <strong>Important:</strong> This action will create or update hauling activities in the database with the AI recommended equipment configuration.
                </p>
              </div>

              <div className="space-y-4">
                <p className="font-medium text-slate-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-400" />
                  Select an action:
                </p>

                {recommendation.hauling_data?.hauling_analysis?.hauling_activity_ids?.length > 0 && (
                  <button onClick={() => handleHaulingConfirm('update')} disabled={isApplyingHauling} className="w-full p-5 border-2 border-sky-500/30 rounded-2xl hover:bg-sky-500/10 transition-all text-left disabled:opacity-50 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-sky-500/20 rounded-xl group-hover:bg-sky-500/30 transition-colors">
                          <RefreshCw className="w-6 h-6 text-sky-400" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sky-300">Update Existing Hauling Activity</h4>
                          <p className="text-sm text-slate-400 mt-1">Update hauling activity {recommendation.hauling_data?.hauling_analysis?.hauling_activity_ids?.[0]?.slice(0, 12)}...</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-sky-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                )}

                <button onClick={() => handleHaulingConfirm('create')} disabled={isApplyingHauling} className="w-full p-5 border-2 border-blue-500/30 rounded-2xl hover:bg-blue-500/10 transition-all text-left disabled:opacity-50 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
                        <Sparkles className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-300">Create New Hauling Activities</h4>
                        <p className="text-sm text-slate-400 mt-1">Create {recommendation.skenario?.alokasi_truk || 1} new hauling activities based on AI recommendations</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                <button onClick={handleSkipHauling} disabled={isApplyingHauling} className="w-full p-5 border-2 border-slate-700/50 rounded-2xl hover:bg-slate-800/50 transition-all text-left disabled:opacity-50 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-slate-700/50 rounded-xl group-hover:bg-slate-700/70 transition-colors">
                        <ArrowRight className="w-6 h-6 text-slate-400" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-300">Skip Hauling Update</h4>
                        <p className="text-sm text-slate-500 mt-1">Go directly to production creation without modifying hauling data</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {isApplyingHauling && (
                <div className="flex items-center justify-center py-5 bg-slate-800/30 rounded-xl">
                  <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                  <span className="ml-3 text-slate-400">Applying hauling recommendation...</span>
                </div>
              )}
            </div>

            <div className="bg-slate-800/50 px-6 py-4 rounded-b-2xl border-t border-slate-700/50 flex justify-end">
              <button onClick={() => setShowHaulingConfirmModal(false)} disabled={isApplyingHauling} className="px-6 py-2.5 rounded-xl text-slate-400 hover:bg-slate-700/50 font-medium transition-colors disabled:opacity-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecommendationCard;
