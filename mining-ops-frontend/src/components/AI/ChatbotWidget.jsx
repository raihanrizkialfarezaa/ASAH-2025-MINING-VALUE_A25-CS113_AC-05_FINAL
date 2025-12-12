import React, { useState, useEffect, useRef } from 'react';
import aiService from '../../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCircle, Bot, X, Trash2, Send, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Cpu, Loader2, Maximize2, Minimize2, Sparkles, Copy, Check } from 'lucide-react';

const CopyButton = ({ text, label, variant = 'default' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
        variant === 'markdown' ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-400' : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-300'
      }`}
      title={label}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  );
};

const MessageActions = ({ message, isUser }) => {
  if (isUser) {
    return (
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={message.content} label="Copy" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700/30">
      <span className="text-[10px] text-slate-500 mr-1">Copy:</span>
      <CopyButton
        text={message.content
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/#{1,6}\s/g, '')}
        label="Plain Text"
        variant="default"
      />
      <CopyButton text={message.content} label="Markdown" variant="markdown" />
    </div>
  );
};

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
    <div className="mb-3 border border-sky-500/30 rounded-xl overflow-hidden bg-gradient-to-r from-sky-500/10 to-cyan-500/10">
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
                {step.detail && <div className="mt-1.5 p-2 bg-slate-950 text-cyan-400 font-mono rounded-lg text-[10px] overflow-x-auto whitespace-pre-wrap border border-slate-700 shadow-sm">{step.detail}</div>}
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
          h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-3 border-b border-sky-500/30 pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-sky-100 mt-4 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-sky-200 mt-3 mb-2">{children}</h3>,
          p: ({ children }) => <p className="text-slate-200 mb-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-none space-y-2 text-slate-200 my-3 ml-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 text-slate-200 my-3 pl-1">{children}</ol>,
          li: ({ children }) => (
            <li className="text-slate-200 flex items-start gap-2">
              <span className="text-sky-400 mt-1.5">•</span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          strong: ({ children }) => <strong className="font-bold text-sky-300">{children}</strong>,
          em: ({ children }) => <em className="text-cyan-300 italic">{children}</em>,
          code: ({ inline, children }) =>
            inline ? (
              <code className="bg-sky-900/40 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono border border-sky-700/30">{children}</code>
            ) : (
              <code className="block bg-slate-950 text-cyan-300 p-3 rounded-xl text-xs font-mono overflow-x-auto border border-sky-700/30 my-3">{children}</code>
            ),
          pre: ({ children }) => <pre className="bg-slate-950 p-4 rounded-xl overflow-x-auto border border-sky-700/30 my-3">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-sky-500 pl-4 my-3 text-sky-200/80 italic bg-sky-500/5 py-2 rounded-r-lg">{children}</blockquote>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-sky-700/30">
              <table className="min-w-full divide-y divide-sky-700/30">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-sky-900/30">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-sky-700/20 bg-slate-900/30">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-sky-900/20 transition-colors">{children}</tr>,
          th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-semibold text-sky-300 uppercase tracking-wider">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 text-sm text-slate-200">{children}</td>,
          a: ({ href, children }) => (
            <a href={href} className="text-sky-400 hover:text-sky-300 underline decoration-sky-500/50 hover:decoration-sky-400 transition-colors" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          hr: () => <hr className="border-sky-700/30 my-4" />,
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
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Generate a new session ID when chat opens
      setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      setMessages([
        {
          role: 'assistant',
          content: "Hello! I'm your AI mining operations assistant. I can help you understand the recommendations and answer questions about optimal strategies. What would you like to know?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [input, isFullscreen, isOpen]);

  // Build conversation history for API call
  const buildConversationHistory = () => {
    return messages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .slice(-10) // Keep last 10 messages for context
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
  };

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
      const conversationHistory = [...buildConversationHistory(), { role: 'user', content: input }];

      const response = await aiService.askChatbot(input, safeContext, sessionId, conversationHistory);
      console.log('Chatbot response:', response);

      // Update session ID if returned from backend
      if (response.data?.session_id || response.session_id) {
        setSessionId(response.data?.session_id || response.session_id);
      }

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

  const handleComposerKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    if (e.nativeEvent && e.nativeEvent.isComposing) return;
    e.preventDefault();
    handleSend();
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
    // Generate new session ID when clearing chat
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
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
    ? 'fixed inset-2 sm:inset-4 z-[100] bg-slate-900 rounded-xl sm:rounded-2xl shadow-2xl flex flex-col border border-sky-700/30 overflow-hidden'
    : 'bg-slate-900 rounded-xl sm:rounded-2xl shadow-2xl w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-8rem)] sm:h-[600px] max-h-[600px] flex flex-col border border-sky-700/30 overflow-hidden';

  return (
    <div className={isFullscreen ? '' : 'fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50'}>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg shadow-sky-500/20 transition-all transform hover:scale-105 flex items-center space-x-2 group border border-sky-400/30"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
          <span className="font-semibold text-sm sm:text-base hidden sm:inline">AI Assistant</span>
          {aiServiceStatus === 'offline' && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse"></span>}
        </button>
      )}

      {isOpen && (
        <div className={chatWindowClass}>
          <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-600 text-white p-3 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg truncate">Mining AI</h3>
                <p className="text-xs text-sky-100 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${aiServiceStatus === 'online' ? 'bg-emerald-400 shadow-emerald-400/50 shadow-sm' : 'bg-rose-400'}`}></span>
                  {aiServiceStatus === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex space-x-0.5 sm:space-x-1 flex-shrink-0">
              <button onClick={clearChat} className="text-white/90 hover:text-white bg-white/10 hover:bg-white/15 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all" title="Clear chat">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={toggleFullscreen} className="text-white/90 hover:text-white bg-white/10 hover:bg-white/15 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsFullscreen(false);
                }}
                className="text-white/90 hover:text-white bg-white/10 hover:bg-white/15 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gradient-to-b from-slate-900 to-slate-950 ${isFullscreen ? 'sm:p-6' : ''}`}>
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                <div
                  className={`${isFullscreen ? 'max-w-[70%] sm:max-w-[60%]' : 'max-w-[90%] sm:max-w-[85%]'} p-3 sm:p-4 rounded-xl sm:rounded-2xl ${
                    msg.role === 'user' ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-br-sm shadow-lg shadow-sky-500/20' : 'bg-slate-800/80 border border-sky-700/20 text-slate-200 rounded-bl-sm backdrop-blur-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div>
                      {msg.steps && msg.steps.length > 0 && <ThinkingProcess steps={msg.steps} />}
                      <MarkdownContent content={msg.content} isFullscreen={isFullscreen} />
                      <MessageActions message={msg} isUser={false} />
                    </div>
                  ) : (
                    <div>
                      <p className={`${isFullscreen ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'} whitespace-pre-wrap break-words`}>{msg.content}</p>
                      <MessageActions message={msg} isUser={true} />
                    </div>
                  )}
                  <p className={`text-[10px] sm:text-xs mt-1.5 sm:mt-2 ${msg.role === 'user' ? 'text-sky-100' : 'text-slate-500'}`}>{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}

            {messages.length <= 1 && (
              <div className="mt-1">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
                  <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Suggested questions:</p>
                </div>
                <div className={`grid gap-2 ${isFullscreen ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                  {suggestedQuestions.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestion(item.question)}
                      className="text-left bg-slate-800/50 hover:bg-sky-900/30 border border-sky-700/20 hover:border-sky-500/40 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                        <div
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md sm:rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold ${
                            index === 0 ? 'bg-sky-500/20 text-sky-400' : index === 1 ? 'bg-cyan-500/20 text-cyan-400' : index === 2 ? 'bg-blue-500/20 text-blue-400' : 'bg-teal-500/20 text-teal-400'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-300 group-hover:text-sky-300 transition-colors">{item.title}</span>
                      </div>
                      <p className={`text-slate-500 group-hover:text-slate-400 transition-colors line-clamp-2 ${isFullscreen ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'}`}>{item.question}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className={`${isFullscreen ? 'max-w-[70%] sm:max-w-[60%]' : 'max-w-[90%] sm:max-w-[85%]'} p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-800/50 border border-slate-700/50 rounded-bl-sm`}>
                  <ThinkingIndicator />
                  <div className="h-3 sm:h-4 w-20 sm:w-24 bg-slate-700/50 rounded animate-pulse mt-2"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className={`p-3 sm:p-4 border-t border-sky-700/20 bg-slate-900 ${isFullscreen ? 'sm:p-6' : ''}`}>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Ask a question (Markdown supported)..."
                  disabled={loading || aiServiceStatus === 'offline'}
                  rows={1}
                  className={`w-full bg-slate-800/50 border border-sky-700/30 text-slate-200 placeholder-slate-500 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:bg-slate-800/30 disabled:text-slate-600 transition-all resize-none overflow-y-auto ${
                    isFullscreen ? 'text-sm sm:text-base max-h-56' : 'text-xs sm:text-sm max-h-40'
                  }`}
                />
                <div className="mt-2 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
                  <span>Enter untuk kirim • Shift+Enter baris baru</span>
                  <span>{input.length.toLocaleString()} chars</span>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim() || aiServiceStatus === 'offline'}
                className="bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px] sm:min-w-[56px] shadow-lg shadow-sky-500/20 disabled:shadow-none"
              >
                {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
            {aiServiceStatus === 'offline' && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-rose-400 mt-2 sm:mt-3 bg-rose-500/10 border border-rose-500/20 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="line-clamp-2">AI service is offline. Please start the AI service first.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
