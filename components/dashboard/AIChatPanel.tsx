"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "@/types";
import { trackFeature } from "@/hooks/useAnalytics";

export function AIChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey! I'm your AI timetable assistant for traceIt. Ask me anything about your schedule, attendance, or academic progress!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    "Show my attendance summary",
    "How many more classes can I miss per subject?",
    "Which subjects need more attention?",
    "What's my schedule today?",
    "Help me plan my week",
  ];

  // Initial scroll to bottom on mount
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length <= 1) return; // Skip for initial welcome message
    
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        // Always scroll to bottom on new messages
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    };

    // Immediate scroll
    scrollToBottom();
    
    // Delayed scroll to account for animations and DOM updates
    const timeout = setTimeout(scrollToBottom, 150);
    
    return () => clearTimeout(timeout);
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Track AI chat usage
    trackFeature('ai_chat', { messageLength: input.length });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message || 'Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    // Auto-send after setting input
    setTimeout(() => {
      const sendButton = document.querySelector('[data-send-button]') as HTMLButtonElement;
      sendButton?.click();
    }, 100);
  };

  return (
    <Card className="flex flex-col h-full border-0 shadow-none overflow-hidden">
      <CardHeader className="flex-shrink-0 border-b border-border pb-3 pr-12 pt-3 px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-mono font-semibold text-sm uppercase tracking-wider">AI Advisor</h2>
          <Badge variant="outline" className="text-xs">
            Beta
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        {/* Messages */}
        <div 
          ref={messagesContainerRef} 
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
          style={{ minHeight: 0 }}
        >
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground p-3"
                      : "bg-muted text-foreground p-4"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-3 h-3" />
                      <span className="text-xs font-mono opacity-70 uppercase">AI</span>
                    </div>
                  )}
                  {message.role === "user" && (
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3 h-3" />
                      <span className="text-xs font-mono opacity-70 uppercase">You</span>
                    </div>
                  )}
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${message.role === "assistant" ? "ai-message-content" : ""}`} style={{ lineHeight: '1.6' }}>
                    {message.content}
                    {message.id === "welcome" && (
                      <div className="text-xs text-red-500 mt-3 pt-3 border-t border-red-500/20 leading-relaxed">
                        This feature is currently in beta. If you encounter any bugs, please report them via the{" "}
                        <a href="/report-bug" className="underline font-semibold hover:text-red-600">
                          Report a Bug
                        </a>{" "}
                        page.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Bot className="w-3 h-3 animate-pulse" />
              <span className="text-sm font-mono">Thinking...</span>
              <span className="cursor-blink">_</span>
            </motion.div>
          )}
        </div>

        {/* Quick Questions */}
        <div className="flex-shrink-0 border-t border-border p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-mono mb-2 uppercase">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question) => (
              <Button
                key={question}
                variant="outline"
                size="sm"
                onClick={() => handleQuickQuestion(question)}
                className="text-xs h-auto py-1 px-2"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-border p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask anything..."
              className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="h-10 w-10"
              data-send-button
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
