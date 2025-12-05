import React, { useState, useEffect, useRef } from 'react';
import aiService from '../../services/aiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageCircle, Bot, X, Trash2, Send, AlertCircle, CheckCircle, ChevronDown, ChevronRight, Cpu, Loader2 } from 'lucide-react';

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
    <div className="mb-2 border border-blue-100 rounded-lg overflow-hidden bg-blue-50/50 animate-pulse">
      <div className="px-3 py-2 text-xs text-blue-600 flex items-center gap-2">
        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="font-medium">{text}</span>
      </div>
    </div>
  );
};

const ThinkingProcess = ({ steps }) => {
  const [expanded, setExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-3 border border-blue-100 rounded-lg overflow-hidden bg-blue-50/50">
      <button onClick={() => setExpanded(!expanded)} className="w-full px-3 py-2 text-xs text-blue-600 flex items-center justify-between hover:bg-blue-100/50 transition-colors">
        <span className="flex items-center gap-2 font-medium">
          <Cpu className="w-3 h-3" />
          Thinking Process
        </span>
        <span>{expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>
      </button>

      {expanded && (
        <div className="p-3 bg-white text-xs space-y-3 border-t border-blue-100 transition-all duration-200">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  step.status === 'error' ? 'bg-red-100 text-red-600' : step.status === 'blocked' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                }`}
              >
                {step.status === 'error' || step.status === 'blocked' ? <AlertCircle className="w-2.5 h-2.5" /> : <CheckCircle className="w-2.5 h-2.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-700">{step.message}</div>
                {step.detail && <div className="mt-1.5 p-2 bg-slate-800 text-green-400 font-mono rounded text-[10px] overflow-x-auto whitespace-pre-wrap border border-slate-700 shadow-sm">{step.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ChatbotWidget = ({ context, aiServiceStatus }) => {
  const [isOpen, setIsOpen] = useState(false);
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
    'Why is strategy 1 the best option?',
    'What are the main differences between the strategies?',
    'How can I reduce fuel consumption?',
    'What is the impact of weather on these recommendations?',
    'Explain the delay probability.',
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

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-lg transition-all transform hover:scale-110 flex items-center space-x-2 group"
        >
          <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="font-semibold">AI Assistant</span>
          {aiServiceStatus === 'offline' && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl w-96 h-[600px] flex flex-col border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Mining AI</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${aiServiceStatus === 'online' ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  {aiServiceStatus === 'online' ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button onClick={clearChat} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all" title="Clear chat">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {msg.steps && msg.steps.length > 0 && <ThinkingProcess steps={msg.steps} />}
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-lg bg-white border border-gray-200 rounded-bl-none shadow-sm">
                  <ThinkingIndicator />
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mt-2"></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions (only show when no messages yet) */}
          {messages.length <= 1 && (
            <div className="p-3 border-t border-gray-200 bg-white">
              <p className="text-xs text-gray-600 mb-2">Suggested questions:</p>
              <div className="space-y-1">
                {suggestedQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="w-full text-left text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                disabled={loading || aiServiceStatus === 'offline'}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim() || aiServiceStatus === 'offline'}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            {aiServiceStatus === 'offline' && (
              <div className="flex items-center gap-2 text-xs text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" />
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
