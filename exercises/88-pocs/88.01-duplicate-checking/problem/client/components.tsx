import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { DuplicateCheckMessage } from '../api/chat.ts';

export const Wrapper = (props: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col w-full py-8 px-4 mx-auto min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <div className="max-w-4xl mx-auto">{props.children}</div>
    </div>
  );
};

export const Message = ({
  role,
  parts,
}: {
  role: string;
  parts: DuplicateCheckMessage['parts'];
}) => {
  const prefix = role === 'user' ? '**You:**' : '**AI:**';

  let text = parts
    .map((part) => {
      if (part.type === 'text') {
        return part.text;
      }
      return '';
    })
    .join('');

  // Clean up encoded award data messages for display
  if (
    role === 'user' &&
    text.startsWith('CHECK_DUPLICATES_AWARD_DATA:')
  ) {
    try {
      const jsonStr = text.replace(
        'CHECK_DUPLICATES_AWARD_DATA:',
        '',
      );
      const awardData = JSON.parse(jsonStr) as {
        siteId: string;
        porId: string;
        lineItems: Array<{
          lineItemId: string;
          quantity?: number;
          details?: string;
        }>;
      };

      // Format as a nice readable message
      const siteName =
        awardData.siteId === 'site-001'
          ? 'Downtown Tower A'
          : awardData.siteId === 'site-002'
            ? 'Suburban Office Complex'
            : awardData.siteId === 'site-003'
              ? 'Airport Terminal'
              : awardData.siteId;
      const porName =
        awardData.porId === 'por-001'
          ? 'Fiber Infrastructure Upgrade'
          : awardData.porId === 'por-002'
            ? 'Network Equipment Refresh'
            : awardData.porId === 'por-003'
              ? '5G Tower Installation'
              : awardData.porId;

      text = `Check for duplicates in this award:\n\nSite: ${siteName} (${awardData.siteId})\nPOR: ${porName} (${awardData.porId})\n\nLine Items:\n${awardData.lineItems
        .map((li, idx) => {
          const lineItemName =
            li.lineItemId === 'line-001'
              ? 'Fiber Optic Cable Installation'
              : li.lineItemId === 'line-002'
                ? 'Network Switch'
                : li.lineItemId === 'line-003'
                  ? 'Tower Foundation'
                  : li.lineItemId === 'line-004'
                    ? 'Site Preparation'
                    : li.lineItemId === 'line-005'
                      ? 'Equipment Rack'
                      : li.lineItemId;
          return `  ${idx + 1}. ${lineItemName}${li.quantity ? ` (Qty: ${li.quantity})` : ''}${li.details ? `\n     Details: ${li.details}` : ''}`;
        })
        .join('\n')}`;
    } catch {
      // If parsing fails, just show a generic message
      text = 'Check for duplicates in this award';
    }
  }

  // Find duplicate warning and summary data parts
  const duplicateWarning = parts.find(
    (p) => p.type === 'data-duplicate-warning',
  );

  const duplicateSummary = parts.find(
    (p) => p.type === 'data-duplicate-summary',
  );

  const isUser = role === 'user';

  return (
    <div className="my-6">
      {text && (
        <div
          className={`mb-6 ${
            isUser
              ? 'ml-auto max-w-[85%]'
              : 'mr-auto max-w-[85%]'
          }`}
        >
          <div
            className={`rounded-2xl px-5 py-4 shadow-lg ${
              isUser
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                : 'bg-gray-800/90 border border-gray-700/50 text-gray-100'
            }`}
          >
            <div
              className={`prose prose-invert prose-sm max-w-none ${
                isUser
                  ? 'prose-headings:text-white prose-p:text-white'
                  : ''
              }`}
            >
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {duplicateSummary && 'data' in duplicateSummary && (
        <div
          className={`relative overflow-hidden rounded-xl mb-6 p-6 shadow-xl border-2 backdrop-blur-sm ${
            duplicateSummary.data.warningLevel === 'high'
              ? 'bg-gradient-to-br from-red-950/40 to-red-900/30 border-red-500/50'
              : duplicateSummary.data.warningLevel === 'medium'
                ? 'bg-gradient-to-br from-amber-950/40 to-yellow-900/30 border-amber-500/50'
                : 'bg-gradient-to-br from-orange-950/40 to-orange-900/30 border-orange-500/50'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl"></div>
          <div className="relative flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                  duplicateSummary.data.warningLevel === 'high'
                    ? 'bg-red-500/20'
                    : duplicateSummary.data.warningLevel ===
                        'medium'
                      ? 'bg-amber-500/20'
                      : 'bg-orange-500/20'
                }`}
              >
                ⚠️
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-3 text-white">
                Duplicate Warning Summary
              </h3>
              <div className="space-y-2">
                <p className="text-base text-gray-200 m-0">
                  Found{' '}
                  <span className="font-bold text-white text-lg">
                    {duplicateSummary.data.totalDuplicates}
                  </span>{' '}
                  duplicate line item(s) out of{' '}
                  <span className="font-bold text-white text-lg">
                    {duplicateSummary.data.totalLineItems}
                  </span>{' '}
                  total line items.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    Warning Level:
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                      duplicateSummary.data.warningLevel ===
                      'high'
                        ? 'bg-red-500/30 text-red-200'
                        : duplicateSummary.data.warningLevel ===
                            'medium'
                          ? 'bg-amber-500/30 text-amber-200'
                          : 'bg-orange-500/30 text-orange-200'
                    }`}
                  >
                    {duplicateSummary.data.warningLevel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {duplicateWarning && 'data' in duplicateWarning && (
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-gray-700/50 rounded-xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <span className="text-xl">⚠️</span>
            </div>
            <h4 className="text-lg font-bold text-yellow-400 m-0">
              Duplicate Line Items Detected
            </h4>
          </div>
          <div className="space-y-4">
            {duplicateWarning.data.duplicates.map(
              (duplicate: any, index: number) => (
                <div
                  key={index}
                  className="bg-gray-800/90 p-5 rounded-xl border-l-4 shadow-lg hover:shadow-xl transition-shadow duration-200"
                  style={{
                    borderLeftColor:
                      duplicate.matchType === 'exact'
                        ? '#ef4444'
                        : '#3b82f6',
                  }}
                >
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <div className="flex-1">
                      <h5 className="font-bold text-base text-white m-0 mb-1">
                        {duplicate.lineItemName}
                      </h5>
                      <p className="text-xs text-gray-400 m-0 font-mono">
                        ID: {duplicate.lineItemId}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide shadow-md ${
                        duplicate.matchType === 'exact'
                          ? 'bg-gradient-to-br from-red-600 to-red-700 text-white'
                          : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                      }`}
                    >
                      {duplicate.matchType === 'exact'
                        ? 'Exact Match'
                        : 'Semantic Match'}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                        Contract:
                      </span>
                      <span className="text-sm text-gray-200 font-mono font-semibold">
                        {duplicate.existingContractNumber}
                      </span>
                    </div>
                    {duplicate.similarityScore !== undefined && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                          Similarity:
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                              style={{
                                width: `${duplicate.similarityScore * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold text-blue-400 min-w-[3rem]">
                            {(
                              duplicate.similarityScore * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      </div>
                    )}
                    {duplicate.aiReasoning && (
                      <div className="mt-3 pt-3 border-t border-gray-700/30">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">
                          AI Analysis
                        </p>
                        <p className="text-sm text-gray-300 leading-relaxed italic m-0">
                          {duplicate.aiReasoning}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
          {'data' in duplicateWarning &&
            duplicateWarning.data.requiresAcknowledgment && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-600/30 rounded-lg backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">
                    ⚠️
                  </span>
                  <p className="text-sm text-yellow-200 m-0 leading-relaxed">
                    <strong className="text-yellow-100">
                      Action Required:
                    </strong>{' '}
                    You must acknowledge these duplicates before
                    proceeding with the award.
                  </p>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export const ChatInput = ({
  input,
  onChange,
  onSubmit,
}: {
  input: string;
  onChange: (text: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) => (
  <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pt-8 pb-6">
    <form onSubmit={onSubmit} className="max-w-4xl mx-auto px-4">
      <div className="relative">
        <input
          className="w-full p-4 pr-12 border-2 border-gray-700/50 rounded-xl shadow-lg bg-gray-800/90 backdrop-blur-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
          value={input}
          placeholder="Type a message or ask questions about duplicates..."
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
          title="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3 3l18 9-18 9-3-9zm0 0h8"
            />
          </svg>
        </button>
      </div>
    </form>
  </div>
);
