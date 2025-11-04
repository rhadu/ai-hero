import { useChat } from '@ai-sdk/react';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatInput, Message, Wrapper } from './components.tsx';
import { AwardForm } from './award-form.tsx';
import { DatabaseViewer } from './database-viewer.tsx';
import './tailwind.css';
import type { DuplicateCheckMessage } from '../api/chat.ts';
import type { AwardData } from '../api/mock-db.ts';

const App = () => {
  const { messages, sendMessage, setMessages } =
    useChat<DuplicateCheckMessage>();

  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'award' | 'database'>('award');

  const handleAwardSubmit = async (awardData: AwardData) => {
    // Encode awardData as JSON in the message text
    // The API will extract it from the message
    const messageText = `CHECK_DUPLICATES_AWARD_DATA:${JSON.stringify(awardData)}`;

    // Use sendMessage - it will handle streaming automatically
    sendMessage({ text: messageText });
  };

  const handleClear = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <Wrapper>
      <div className="mb-8 relative overflow-hidden bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl p-6 border border-gray-700/50 shadow-2xl backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🔍</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Duplicate Checking POC
            </h1>
          </div>
          <p className="text-sm text-gray-300 mb-6 leading-relaxed">
            This is a proof-of-concept for AI-powered duplicate detection in contract
            awards. Use the form below to create an award and check for duplicates, or
            browse the database to see existing data.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="mb-6 bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl border border-gray-700/50 shadow-xl overflow-hidden">
        <div className="flex border-b border-gray-700/50">
          <button
            onClick={() => setActiveTab('award')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'award'
                ? 'bg-gray-900/50 text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-900/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span>📋</span>
              <span>Contract Award</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'database'
                ? 'bg-gray-900/50 text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-900/30'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span>🗄️</span>
              <span>Database Viewer</span>
            </span>
          </button>
        </div>

        <div className="p-6">
          <div className={activeTab === 'award' ? '' : 'hidden'}>
            <AwardForm onSubmit={handleAwardSubmit} />
          </div>
          <div className={activeTab === 'database' ? '' : 'hidden'}>
            <DatabaseViewer />
          </div>
        </div>
      </div>

      {/* Messages Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>💬</span>
          <span>Duplicate Check Results</span>
        </h2>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-semibold bg-gray-800/90 hover:bg-gray-700/90 text-gray-300 hover:text-white border border-gray-700/50 rounded-lg transition-all duration-200"
          >
            Clear Results
          </button>
        )}
      </div>

      {messages.length === 0 && (
        <div className="text-center py-8 bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-xl border border-gray-700/50">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-900/50 border border-gray-700/50 mb-3">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-gray-400">
            Duplicate check results will appear here after submitting an award.
          </p>
        </div>
      )}

      <div className="pb-32">
        {messages.map((message) => (
          <Message
            key={message.id}
            role={message.role}
            parts={message.parts}
          />
        ))}
      </div>

      <ChatInput
        input={input}
        onChange={setInput}
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
          }
        }}
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
