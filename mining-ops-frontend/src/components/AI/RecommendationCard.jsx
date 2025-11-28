import React from 'react';

const RecommendationCard = ({ rank, recommendation, isSelected, onSelect }) => {
  const getBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500';
      case 2:
        return 'bg-gray-400';
      case 3:
        return 'bg-orange-600';
      default:
        return 'bg-blue-500';
    }
  };

  const getMedalEmoji = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '📊';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all ${isSelected ? 'ring-4 ring-blue-500 transform scale-105' : 'hover:shadow-xl'}`}>
      {/* Header with Rank */}
      <div className={`${getBadgeColor(rank)} text-white p-4`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">
            {getMedalEmoji(rank)} Strategy {rank}
          </h3>
          <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">Rank #{rank}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Scenario Details */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-semibold text-gray-700 mb-2">Configuration</h4>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600">Trucks:</span>
                <span className="font-semibold ml-2">{recommendation.skenario.alokasi_truk}</span>
              </div>
              <div>
                <span className="text-gray-600">Excavators:</span>
                <span className="font-semibold ml-2">{recommendation.skenario.jumlah_excavator}</span>
              </div>
            </div>
            {recommendation.skenario.route && (
              <div className="pt-2 border-t">
                <span className="text-gray-600 block mb-1">Route:</span>
                <div className="font-semibold text-xs text-blue-700 break-words">{recommendation.skenario.route}</div>
              </div>
            )}
            {recommendation.skenario.equipment && (
              <div className="pt-2 border-t">
                <span className="text-gray-600 block mb-1">Equipment:</span>
                <div className="font-semibold text-xs text-green-700 break-words">{recommendation.skenario.equipment}</div>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2 border-b">
            <span className="text-gray-600">Net Profit</span>
            <span className="font-bold text-green-600 text-lg">{recommendation.profit_display}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Production</span>
            <span className="font-semibold">{recommendation.total_tonase_display}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Fuel Consumption</span>
            <span className="font-semibold text-red-600">{recommendation.total_bbm_display}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-600">Est. Vessel Completion</span>
            <span className="font-semibold">{recommendation.cycle_time_avg_display}</span>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="bg-blue-50 p-3 rounded text-center">
            <div className="text-xs text-gray-600 mb-1">Efficiency</div>
            <div className="text-lg font-bold text-blue-600">{recommendation.efisiensi_display}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded text-center">
            <div className="text-xs text-gray-600 mb-1">Delay Risk</div>
            <div className="text-lg font-bold text-purple-600">{recommendation.delay_probability_avg ? `${(recommendation.delay_probability_avg * 100).toFixed(1)}%` : 'N/A'}</div>
          </div>
        </div>

        {/* AI Insight */}
        {recommendation.insight && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-start">
              <span className="text-yellow-600 mr-2">💡</span>
              <p className="text-sm text-gray-700">{recommendation.insight}</p>
            </div>
          </div>
        )}

        {/* Select Button */}
        <button onClick={onSelect} className={`w-full py-3 rounded-md font-semibold transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
          {isSelected ? '✓ Selected' : 'Select This Strategy'}
        </button>
      </div>
    </div>
  );
};

export default RecommendationCard;
