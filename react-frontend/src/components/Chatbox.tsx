import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { API } from "@/lib/api";

interface Message {
  id: string;
  type: "user" | "bot";
  text: string;
  timestamp: Date;
}

const Chatbox: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          type: "bot",
          text: "Xin chào! 👋 Tôi là trợ lý ảo của bạn. Tôi có thể giúp bạn:\n\n🍔 Tìm món ăn\n🛒 Đặt hàng nhanh\n📋 Xem menu\n💬 Tư vấn món ngon\n\nBạn muốn tìm món gì hôm nay?",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: "user",
      text: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const data = await API.post("/chatbot/chat/", {
        session_id: sessionId,
        message: inputText.trim(),
      }) as any;

      console.log("Chatbot response:", data);

      // Extract message from various possible response formats
      let botText = "Xin lỗi, tôi không hiểu câu hỏi của bạn.";

      if (data.response) {
        botText = data.response;
      } else if (data.message) {
        botText = data.message;
      } else if (data.reply) {
        botText = data.reply;
      } else if (data.text) {
        botText = data.text;
      }

      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        type: "bot",
        text: botText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        type: "bot",
        text: "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-600 shadow-lg flex items-center justify-center transition-transform hover:scale-110"
          aria-label="Open chat">
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card
          className="w-96 shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "calc(100vh - 100px)" }}>
          {/* Header */}
          <div className="bg-orange-500 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Trợ lý ảo</h3>
                <p className="text-xs opacity-90">Luôn sẵn sàng hỗ trợ bạn</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMinimize}
                className="text-white hover:bg-orange-600 p-1 h-auto">
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleChat}
                className="text-white hover:bg-orange-600 p-1 h-auto">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
                style={{ minHeight: "300px", maxHeight: "400px" }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}>
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === "user"
                          ? "bg-orange-500 text-white"
                          : "bg-white text-gray-800 border border-gray-200"
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">
                        {message.text}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          message.type === "user"
                            ? "text-orange-100"
                            : "text-gray-500"
                        }`}>
                        {message.timestamp.toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 border border-gray-200 rounded-lg p-3">
                      <div className="flex space-x-2">
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t">
                <div className="flex space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || isLoading}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default Chatbox;
