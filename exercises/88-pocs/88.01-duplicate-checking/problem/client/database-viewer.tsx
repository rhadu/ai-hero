import React, { useState } from 'react';
import {
  MOCK_CONTRACTS,
  MOCK_LINE_ITEMS,
  MOCK_PORS,
  MOCK_SITES,
} from '../api/mock-db.ts';

export const DatabaseViewer = () => {
  const [activeTab, setActiveTab] = useState<
    'sites' | 'pors' | 'line-items' | 'contracts'
  >('contracts');

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>🗄️</span>
        <span>Database View</span>
      </h2>

      <div className="flex gap-2 mb-4 border-b border-gray-700/50">
        {[
          { id: 'sites' as const, label: 'Sites', count: MOCK_SITES.length },
          { id: 'pors' as const, label: 'PORs', count: MOCK_PORS.length },
          {
            id: 'line-items' as const,
            label: 'Line Items',
            count: MOCK_LINE_ITEMS.length,
          },
          {
            id: 'contracts' as const,
            label: 'Contracts',
            count: MOCK_CONTRACTS.length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400 bg-gray-900/30'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-900/20'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'sites' && (
          <div className="space-y-2">
            {MOCK_SITES.map((site) => (
              <div
                key={site.id}
                className="bg-gray-800/90 border border-gray-700/50 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white m-0">{site.name}</p>
                    <p className="text-xs text-gray-400 m-0 font-mono">
                      {site.id}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'pors' && (
          <div className="space-y-2">
            {MOCK_PORS.map((por) => (
              <div
                key={por.id}
                className="bg-gray-800/90 border border-gray-700/50 rounded-lg p-3"
              >
                <div>
                  <p className="font-semibold text-white m-0">{por.name}</p>
                  <div className="flex gap-4 mt-1">
                    <p className="text-xs text-gray-400 m-0 font-mono">
                      ID: {por.id}
                    </p>
                    <p className="text-xs text-gray-400 m-0">
                      Code: {por.projectCode}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'line-items' && (
          <div className="space-y-2">
            {MOCK_LINE_ITEMS.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800/90 border border-gray-700/50 rounded-lg p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white m-0">{item.name}</p>
                    <div className="flex gap-4 mt-1">
                      <p className="text-xs text-gray-400 m-0 font-mono">
                        ID: {item.id}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          item.type === 'fixed-cost'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-3">
            {MOCK_CONTRACTS.map((contract) => {
              const site = MOCK_SITES.find((s) => s.id === contract.siteId);
              const por = MOCK_PORS.find((p) => p.id === contract.porId);
              return (
                <div
                  key={contract.id}
                  className={`bg-gray-800/90 border rounded-lg p-4 ${
                    contract.status === 'awarded'
                      ? 'border-green-500/50'
                      : contract.status === 'cancelled'
                        ? 'border-red-500/50'
                        : 'border-yellow-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-white m-0">
                        {contract.contractNumber}
                      </p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span>Site: {site?.name || contract.siteId}</span>
                        <span>POR: {por?.name || contract.porId}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        contract.status === 'awarded'
                          ? 'bg-green-500/20 text-green-300'
                          : contract.status === 'cancelled'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                      }`}
                    >
                      {contract.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    Awarded: {contract.awardedDate}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-2 font-semibold">
                      Line Items:
                    </p>
                    <div className="space-y-1">
                      {contract.lineItems.map((li, idx) => {
                        const lineItem = MOCK_LINE_ITEMS.find(
                          (item) => item.id === li.lineItemId,
                        );
                        return (
                          <div
                            key={idx}
                            className="text-xs text-gray-300 bg-gray-900/50 rounded px-2 py-1"
                          >
                            <span className="font-semibold">
                              {lineItem?.name || li.lineItemId}
                            </span>
                            {li.quantity && (
                              <span className="text-gray-400 ml-2">
                                Qty: {li.quantity}
                              </span>
                            )}
                            {li.details && (
                              <p className="text-gray-400 mt-1 italic m-0">
                                {li.details}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

