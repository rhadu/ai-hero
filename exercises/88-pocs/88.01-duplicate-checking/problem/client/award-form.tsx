import React, { useState } from 'react';
import {
  MOCK_CONTRACTS,
  MOCK_LINE_ITEMS,
  MOCK_PORS,
  MOCK_SITES,
  type AwardData,
  type LineItem,
} from '../api/mock-db.ts';

export const AwardForm = ({
  onSubmit,
}: {
  onSubmit: (awardData: AwardData) => void;
}) => {
  const [siteId, setSiteId] = useState('site-001');
  const [porId, setPorId] = useState('por-001');
  const [selectedLineItems, setSelectedLineItems] = useState<
    Array<{
      lineItemId: string;
      quantity?: number;
      details?: string;
    }>
  >([
    {
      lineItemId: 'line-001',
      details:
        'Install fiber optic cable infrastructure to connect building to main network',
    },
    { lineItemId: 'line-002', quantity: 1 },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      siteId,
      porId,
      lineItems: selectedLineItems,
    });
  };

  const addLineItem = () => {
    const firstLineItemId = MOCK_LINE_ITEMS[0]?.id;
    if (firstLineItemId) {
      setSelectedLineItems([
        ...selectedLineItems,
        { lineItemId: firstLineItemId },
      ]);
    }
  };

  const removeLineItem = (index: number) => {
    setSelectedLineItems(selectedLineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (
    index: number,
    updates: Partial<{
      lineItemId: string;
      quantity?: number;
      details?: string;
    }>,
  ) => {
    const updated = [...selectedLineItems];
    const currentItem = updated[index];
    if (currentItem) {
      updated[index] = {
        lineItemId: updates.lineItemId ?? currentItem.lineItemId,
        quantity: updates.quantity !== undefined ? updates.quantity : currentItem.quantity,
        details: updates.details !== undefined ? updates.details : currentItem.details,
      };
      setSelectedLineItems(updated);
    }
  };

  const selectedSite = MOCK_SITES.find((s) => s.id === siteId);
  const selectedPOR = MOCK_PORS.find((p) => p.id === porId);

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>📋</span>
        <span>Create Award</span>
      </h2>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            Site
          </label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="w-full p-3 bg-gray-800/90 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {MOCK_SITES.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.id})
              </option>
            ))}
          </select>
          {selectedSite && (
            <p className="text-xs text-gray-400 mt-1">ID: {selectedSite.id}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            POR (Project Order Request)
          </label>
          <select
            value={porId}
            onChange={(e) => setPorId(e.target.value)}
            className="w-full p-3 bg-gray-800/90 border border-gray-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {MOCK_PORS.map((por) => (
              <option key={por.id} value={por.id}>
                {por.name} ({por.projectCode})
              </option>
            ))}
          </select>
          {selectedPOR && (
            <div className="text-xs text-gray-400 mt-1">
              <p>ID: {selectedPOR.id}</p>
              <p>Project Code: {selectedPOR.projectCode}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-gray-300">
            Line Items
          </label>
          <button
            type="button"
            onClick={addLineItem}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add Line Item
          </button>
        </div>

        <div className="space-y-3">
          {selectedLineItems.map((item, index) => {
            const lineItem = MOCK_LINE_ITEMS.find((li) => li.id === item.lineItemId);
            return (
              <div
                key={index}
                className="bg-gray-800/90 border border-gray-700/50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <select
                      value={item.lineItemId}
                      onChange={(e) =>
                        updateLineItem(index, { lineItemId: e.target.value })
                      }
                      className="w-full p-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {MOCK_LINE_ITEMS.map((li) => (
                        <option key={li.id} value={li.id}>
                          {li.name} ({li.type})
                        </option>
                      ))}
                    </select>
                    {lineItem && (
                      <p className="text-xs text-gray-400 mt-1">
                        Type: {lineItem.type}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Remove line item"
                  >
                    ✕
                  </button>
                </div>

                {lineItem?.type === 'fixed-cost' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) =>
                        updateLineItem(index, {
                          quantity: parseInt(e.target.value) || undefined,
                        })
                      }
                      className="w-full p-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="Enter quantity"
                    />
                  </div>
                )}

                {lineItem?.type === 'variable-cost' && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Details (Required for duplicate detection)
                    </label>
                    <textarea
                      value={item.details || ''}
                      onChange={(e) =>
                        updateLineItem(index, { details: e.target.value })
                      }
                      className="w-full p-2 bg-gray-900/50 border border-gray-700/50 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                      rows={2}
                      placeholder="Describe the work to be performed..."
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Check for Duplicates
      </button>
    </form>
  );
};

