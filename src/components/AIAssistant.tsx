import React, { useState } from 'react';
import { Bot, Send, Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

export function AIAssistant() {
  const { state } = useApp();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your AI expense assistant. You can ask me to log expenses like '25 dollars for coffee at Starbucks yesterday' or ask questions about your spending patterns.",
      isBot: true,
      timestamp: new Date()
    }
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    // Add user message
    const userMessage = {
      id: messages.length + 1,
      text: message,
      isBot: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: "I understand you'd like me to help with that expense. This is a demo response - in the full version, I would parse your request and either log the expense or provide insights about your spending.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);

    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show locked state for unauthenticated users
  if (!state.isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-text-muted" />
          </div>
          <h2 className="text-xl font-bold text-text font-mono mb-4">
            AI Assistant Locked
          </h2>
          <p className="text-text-secondary font-mono mb-6 leading-relaxed">
            Sign up or log in to unlock our powerful AI assistant that can understand natural language expense entries and provide smart insights about your spending.
          </p>
          <div className="space-y-3">
            <Link to="/auth" className="btn-primary w-full">
              Sign Up to Unlock
            </Link>
            <p className="text-xs text-text-muted font-mono">
              Basic: 3 daily interactions • Pro: Unlimited
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show usage limit for basic users
  if (state.user?.subscription_tier === 'basic' && state.user.llm_uses_today >= 3) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Bot size={32} className="text-accent" />
          </div>
          <h2 className="text-xl font-bold text-text font-mono mb-4">
            Daily Limit Reached
          </h2>
          <p className="text-text-secondary font-mono mb-6 leading-relaxed">
            You've used all 3 AI interactions for today. Upgrade to Pro for unlimited daily interactions and advanced features.
          </p>
          <div className="space-y-3">
            <button className="btn-accent w-full">
              Upgrade to Pro - Free During Hackathon!
            </button>
            <p className="text-xs text-text-muted font-mono">
              Resets daily at 00:00 UTC
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Bot size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text font-mono">AI Assistant</h1>
            <p className="text-text-secondary font-mono text-sm">
              Natural language expense tracking
            </p>
          </div>
        </div>
        
        {state.user?.subscription_tier === 'basic' && (
          <div className="text-right">
            <p className="text-sm font-mono text-text-secondary">
              {state.user.llm_uses_today}/3 interactions today
            </p>
            <Link to="/upgrade" className="text-xs text-accent hover:text-accent/80 font-mono">
              Upgrade for unlimited
            </Link>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[80%] ${
              msg.isBot 
                ? 'bg-surface border border-surface-light' 
                : 'bg-primary text-background'
            } rounded-lg p-4`}>
              {msg.isBot && (
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles size={14} className="text-primary" />
                  <span className="text-xs font-mono text-primary">AI Assistant</span>
                </div>
              )}
              <p className="font-mono text-sm leading-relaxed">{msg.text}</p>
              <p className={`text-xs mt-2 ${
                msg.isBot ? 'text-text-muted' : 'text-background/70'
              } font-mono`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="card p-4">
        <div className="flex space-x-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Try: 'I spent 25 dollars on coffee at Starbucks yesterday' or 'How much did I spend on food this week?'"
            rows={2}
            className="flex-1 input resize-none"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className={`p-3 rounded-lg transition-all duration-200 ${
              message.trim()
                ? 'bg-primary text-background hover:bg-primary/90'
                : 'bg-surface-light text-text-muted cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </button>
        </div>
        
        <div className="mt-3 text-xs text-text-muted font-mono">
          Press Enter to send • Examples: expense logging, spending questions, budget insights
        </div>
      </div>
    </div>
  );
}