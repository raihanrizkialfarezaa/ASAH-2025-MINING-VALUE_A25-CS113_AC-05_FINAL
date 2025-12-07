import React, { useState, useEffect, useRef } from 'react';
import aiService from '../../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCircle, Bot, X, Trash2, Send, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Cpu, Loader2, Maximize2, Minimize2, Sparkles } from 'lucide-react';

const ThinkingIndicator = () => {
  const [text, setText] = useState('Menganalisis pertanyaan...');

  useEffect(() => {
    const texts = ['Menganalisis pertanyaan...', 'Memahami struktur database...', 'Membuat query SQL...', 'Mengeksekusi query...', 'Memvalidasi data...', 'Menyusun jawaban...'];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setText(texts[i]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-2 border border-sky-500/30 rounded-xl overflow-hidden bg-sky-500/10 animate-pulse">
      <div className="px-3 py-2 text-xs text-sky-400 flex items-center gap-2">
        <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="font-medium">{text}</span>
      </div>
    </div>
  );
};

const ThinkingProcess = ({ steps }) => {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-3 border border-sky-500/30 rounded-xl overflow-hidden bg-sky-500/10">
      <button onClick={() => setExpanded(!expanded)} className="w-full px-3 py-2 text-xs text-sky-400 flex items-center justify-between hover:bg-sky-500/20 transition-colors">
        <span className="flex items-center gap-2 font-medium">
          <Cpu className="w-3 h-3" />
          Thinking Process
        </span>
        <span>{expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>
      </button>

      {expanded && (
        <div className="p-3 bg-slate-900/50 text-xs space-y-3 border-t border-sky-500/30 transition-all duration-200">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  step.status === 'error' ? 'bg-rose-500/20 text-rose-400' : step.status === 'blocked' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {step.status === 'error' || step.status === 'blocked' ? <AlertCircle className="w-2.5 h-2.5" /> : <CheckCircle className="w-2.5 h-2.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-300">{step.message}</div>
                {step.detail && <div className="mt-1.5 p-2 bg-slate-950 text-emerald-400 font-mono rounded-lg text-[10px] overflow-x-auto whitespace-pre-wrap border border-slate-700 shadow-sm">{step.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MarkdownContent = ({ content, isFullscreen }) => {
  return (
    <div className={`prose prose-invert max-w-none ${isFullscreen ? 'prose-base' : 'prose-sm'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold text-slate-100 mt-4 mb-2 border-b border-slate-700/50 pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-slate-200 mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-slate-300 mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="text-slate-300 mb-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 text-slate-300 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 text-slate-300 my-2">{children}</ol>,
          li: ({ children }) => <li className="text-slate-300">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-sky-400">{children}</strong>,
          em: ({ children }) => <em className="text-slate-400 italic">{children}</em>,
          code: ({ inline, children }) =>
            inline ? (
              <code className="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
            ) : (
              <code className="block bg-slate-950 text-emerald-400 p-3 rounded-xl text-xs font-mono overflow-x-auto border border-slate-700/50 my-2">{children}</code>
            ),
          pre: ({ children }) => <pre className="bg-slate-950 p-3 rounded-xl overflow-x-auto border border-slate-700/50 my-2">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-sky-500/50 pl-4 my-2 text-slate-400 italic">{children}</blockquote>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full divide-y divide-slate-700/50 border border-slate-700/50 rounded-xl overflow-hidden">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-800/50">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-slate-700/50 bg-slate-900/30">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-slate-800/30 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-sm text-slate-300">{children}</td>,
          a: ({ href, children }) => (
            <a href={href} className="text-sky-400 hover:text-sky-300 underline transition-colors" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          hr: () => <hr className="border-slate-700/50 my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const ChatbotWidget = ({ context, aiServiceStatus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: "Hello! I'm your AI mining operations assistant. I can help you understand the recommendations and answer questions about optimal strategies. What would you like to know?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (aiServiceStatus === 'offline') {
      alert('AI Service is currently offline. Please ensure the AI service is running.');
      return;
    }

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const safeContext = Array.isArray(context) ? context : [];
      const response = await aiService.askChatbot(input, safeContext);
      console.log('Chatbot response:', response);

      const answer = response.data?.jawaban_ai || response.data?.answer || response.jawaban_ai || 'I apologize, but I could not generate a response.';
      const steps = response.data?.steps || [];

      const aiMessage = {
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
        steps: steps,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);

      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or check if the AI service is running.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    {
      title: 'Analisis Produksi & Efisiensi',
      question: 'Berapa total produksi batubara hari ini dan bagaimana perbandingannya dengan target? Tampilkan juga rata-rata cycle time, utilisasi truk, dan efisiensi loading.',
    },
    {
      title: 'Status Armada & Perawatan',
      question: 'Berapa jumlah truk dan excavator yang sedang aktif, idle, dan maintenance? Tampilkan juga 5 unit dengan total jam operasi tertinggi yang perlu segera perawatan.',
    },
    {
      title: 'Analisis Hauling & Delay',
      question: 'Tampilkan ringkasan aktivitas hauling hari ini: total trip, total tonase, rata-rata jarak tempuh, dan berapa persen yang mengalami delay beserta kategori penyebabnya.',
    },
    {
      title: 'Revenue & Fuel Cost Analysis',
      question: 'Hitung simulasi profit untuk 10 truk dengan target 500 ton dan jarak 4 km. Tampilkan breakdown revenue, fuel cost, dan net profit berdasarkan parameter operasional saat ini.',
    },
  ];

  const handleSuggestedQuestion = (question) => {
    setInput(question);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat history cleared. How can I help you?',
        timestamp: new Date(),
      },
    ]);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const chatWindowClass = isFullscreen
    ? 'fixed inset-4 z-[100] bg-slate-900 rounded-2xl shadow-2xl flex flex-col border border-slate-700/50 overflow-hidden'
    : 'bg-slate-900 rounded-2xl shadow-2xl w-96 h-[600px] flex flex-col border border-slate-700/50 overflow-hidden';

  return (
    <div className={isFullscreen ? '' : 'fixed bottom-6 right-6 z-50'}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-2xl p-4 shadow-lg transition-all transform hover:scale-105 flex items-center space-x-2 group border border-sky-500/30"
        >
          <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="font-semibold">AI Assistant</span>
          {aiServiceStatus === 'offline' && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse"></span>}
        </button>
      )}

      {isOpen && (
        <div className={chatWindowClass}>
          <div className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Mining AI</h3>
                <p className="text-xs text-sky-200 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${aiServiceStatus === 'online' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  {aiServiceStatus === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex space-x-1">
              <button onClick={clearChat} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all" title="Clear chat">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={toggleFullscreen} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsFullscreen(false);
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50 ${isFullscreen ? 'p-6' : ''}`}>
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`${isFullscreen ? 'max-w-[70%]' : 'max-w-[85%]'} p-4 rounded-2xl ${
                    msg.role === 'user' ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-sm' : 'bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div>
                      {msg.steps && msg.steps.length > 0 && <ThinkingProcess steps={msg.steps} />}
                      <MarkdownContent content={msg.content} isFullscreen={isFullscreen} />
                    </div>
                  ) : (
                    <p className={`${isFullscreen ? 'text-base' : 'text-sm'} whitespace-pre-wrap break-words`}>{msg.content}</p>
                  )}
                  <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-sky-200' : 'text-slate-500'}`}>{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className={`${isFullscreen ? 'max-w-[70%]' : 'max-w-[85%]'} p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 rounded-bl-sm`}>
                  <ThinkingIndicator />
                  <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse mt-2"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className={`p-4 border-t border-slate-700/50 bg-slate-900/50 ${isFullscreen ? 'p-6' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-slate-400 font-medium">Suggested questions:</p>
              </div>
              <div className={`grid gap-2 ${isFullscreen ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {suggestedQuestions.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(item.question)}
                    className="text-left bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-sky-500/30 px-4 py-3 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-emerald-500/20 text-emerald-400' : index === 1 ? 'bg-amber-500/20 text-amber-400' : index === 2 ? 'bg-sky-500/20 text-sky-400' : 'bg-violet-500/20 text-violet-400'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-sky-400 transition-colors">{item.title}</span>
                    </div>
                    <p className={`text-slate-500 group-hover:text-slate-400 transition-colors line-clamp-2 ${isFullscreen ? 'text-sm' : 'text-xs'}`}>{item.question}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`p-4 border-t border-slate-700/50 bg-slate-900 ${isFullscreen ? 'p-6' : ''}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                disabled={loading || aiServiceStatus === 'offline'}
                className={`flex-1 bg-slate-800/50 border border-slate-700/50 text-slate-200 placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:bg-slate-800/30 disabled:text-slate-600 transition-all ${
                  isFullscreen ? 'text-base' : 'text-sm'
                }`}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim() || aiServiceStatus === 'offline'}
                className="bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white px-5 py-3 rounded-xl transition-all disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[56px]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            {aiServiceStatus === 'offline' && (
              <div className="flex items-center gap-2 text-xs text-rose-400 mt-3 bg-rose-500/10 border border-rose-500/20 px-4 py-2.5 rounded-xl">
                <AlertCircle className="w-4 h-4" />
                <span>AI service is offline. Please start the AI service first.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
