import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
      <div key={index} className={`mb-1 text-sm leading-relaxed ${indentClass} text-gray-700`}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={i} className="font-semibold text-gray-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code key={i} className="bg-gray-100 text-blue-700 px-1 rounded font-mono text-xs">
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

// Expandable insight component - fix truncation issue
const InsightExpandable = ({ insight }) => {
  const [expanded, setExpanded] = useState(false);
  const maxLength = 150;
  const isLong = insight && insight.length > maxLength;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
      <div className="flex items-start">
        <span className="text-yellow-600 mr-2 flex-shrink-0">💡</span>
        <div className="flex-1">
          <p className={`text-sm text-gray-700 ${!expanded && isLong ? 'line-clamp-3' : ''}`}>{insight}</p>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="text-yellow-700 hover:text-yellow-900 text-xs font-medium mt-1 underline">
              {expanded ? 'Show less' : 'Read more...'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const RecommendationCard = ({ rank, recommendation, isSelected, onSelect }) => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

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
        return '#1';
      case 2:
        return '#2';
      case 3:
        return '#3';
      default:
        return `#${rank}`;
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
    sessionStorage.setItem(
      'selectedStrategy',
      JSON.stringify({
        rank: rank,
        recommendation: recommendation,
        implementedAt: new Date().toISOString(),
      })
    );
    navigate('/production');
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-lg overflow-hidden transition-all ${isSelected ? 'ring-4 ring-blue-500 transform scale-105' : 'hover:shadow-xl'}`}>
        {/* Header with Rank */}
        <div className={`${getBadgeColor(rank)} text-white p-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Strategy {getMedalEmoji(rank)}</h3>
            <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full font-medium">Rank {rank}</span>
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
                  <span className="text-gray-600 block mb-1">Main Equipment:</span>
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

          {/* AI Insight - Expandable */}
          {recommendation.insight && <InsightExpandable insight={recommendation.insight} />}

          {/* Select Button */}
          <button onClick={handleSelectClick} className={`w-full py-3 rounded-md font-semibold transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
            {isSelected ? '✓ View Details & Selected' : 'Select This Strategy'}
          </button>
        </div>
      </div>

      {/* Detailed Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className={`${getBadgeColor(rank)} text-white p-6 rounded-t-xl flex justify-between items-center sticky top-0 z-10`}>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">Strategy {getMedalEmoji(rank)} - Comprehensive Analysis & Guidebook</h2>
                <p className="text-white text-opacity-90 mt-1 text-sm">Detailed Operational Plan & Financial Breakdown</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-8">
              {/* 1. Executive Summary */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h4 className="text-green-800 font-bold mb-1">Net Profit</h4>
                  <p className="text-2xl font-bold text-green-600">{recommendation.profit_display}</p>
                  <div className="text-xs text-green-700 mt-2">{renderMarkdown(recommendation.explanations?.FINANCIAL)}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 className="text-blue-800 font-bold mb-1">Production Target</h4>
                  <p className="text-2xl font-bold text-blue-600">{recommendation.total_tonase_display}</p>
                  <div className="text-xs text-blue-700 mt-2">{renderMarkdown(recommendation.explanations?.PRODUCTION)}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                  <h4 className="text-orange-800 font-bold mb-1">Fuel Efficiency</h4>
                  <p className="text-2xl font-bold text-orange-600">{recommendation.total_bbm_display}</p>
                  <div className="text-xs text-orange-700 mt-2">{renderMarkdown(recommendation.explanations?.FUEL)}</div>
                </div>
              </section>

              {/* 2. Operational Configuration & Rationale */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-gray-300 pb-2">Operational Configuration & Equipment</h3>
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Configuration Rationale</h4>
                    <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">{renderMarkdown(recommendation.explanations?.CONFIGURATION)}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Route Selection</h4>
                      <div className="bg-white p-3 rounded border border-gray-300">
                        <p className="font-medium text-blue-700">{recommendation.skenario.route}</p>
                        <div className="text-xs text-gray-600 mt-2 whitespace-pre-line leading-relaxed">{renderMarkdown(recommendation.explanations?.ROUTE)}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Vessel Status</h4>
                      <div className="bg-white p-3 rounded border border-gray-300">
                        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{renderMarkdown(recommendation.explanations?.VESSEL)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2.5 Flow Breakdown (Hulu → Hilir) */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-blue-200 pb-2">Production Flow Analysis (Upstream - Downstream)</h3>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200 shadow-sm">
                  <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{renderMarkdown(recommendation.explanations?.FLOW_BREAKDOWN)}</div>
                </div>
              </section>

              {/* 3. Detailed Equipment List */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="bg-gray-200 p-1 rounded mr-2">🚜</span> Equipment Allocation
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model / Name</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recommendation.detailed_equipment && recommendation.detailed_equipment.length > 0 ? (
                        recommendation.detailed_equipment.map((eq, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{eq.type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eq.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{eq.name}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
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
                <h3 className="text-xl font-bold text-gray-800 mb-4 border-b-2 border-green-200 pb-2">Financial Breakdown & Profitability Analysis</h3>
                <div className="bg-white rounded-lg p-6 border-2 border-green-200 shadow-sm">
                  <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed font-mono">{renderMarkdown(recommendation.explanations?.FINANCIAL)}</div>
                </div>
              </section>

              {/* 5. Efficiency & Risk Analysis */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Efficiency Analysis</h3>
                  <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">{renderMarkdown(recommendation.explanations?.EFFICIENCY)}</div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Delay Risk Analysis</h3>
                  <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-800">{renderMarkdown(recommendation.explanations?.DELAY_RISK)}</div>
                </div>
              </section>

              {/* 6. Safety Guidelines (SOP) */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="bg-gray-200 p-1 rounded mr-2">🛡️</span> Safety Guidelines (SOP)
                </h3>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {recommendation.safety_sop ? recommendation.safety_sop.split('|').map((sop, idx) => <li key={idx}>{sop.trim()}</li>) : <li>No specific SOP guidelines available.</li>}
                  </ul>
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 p-6 rounded-b-xl flex justify-end gap-4 sticky bottom-0 z-10 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-200 font-medium transition-colors">
                Close
              </button>
              <button onClick={handleConfirmSelect} className="px-6 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700 font-bold shadow-lg transition-colors flex items-center gap-2">
                <span>Select Strategy</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button onClick={handleImplementStrategy} className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-bold shadow-lg transition-colors flex items-center gap-2">
                <span>Implement Strategy</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecommendationCard;
