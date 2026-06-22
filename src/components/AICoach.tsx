import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Send, Sparkles, MessageSquare, AlertCircle, RefreshCw, Mic, MicOff } from 'lucide-react';

// Type definitions for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
}

export default function AICoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'coach',
      text: 'Xin chào! Tôi là huấn luyện viên AI chuyên nghiệp của bạn. Tôi có thể chỉ dẫn cho bạn các mẹo xoay Tay nhanh (Finger tricks), công thức OLL/PLL nâng cao hoặc giúp bạn giải quyết từng bước giải mà bạn đang bận tâm. Sẵn sàng bứt phá kỷ lục chưa?',
    },
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const quickPrompts = [
    'Sexy Move là gì và tại sao lại quan trọng?',
    'Làm thế nào để học F2L nhanh hơn?',
    'Cách khắc phục khi bị nhầm màu khi quét?',
    'Kỷ lục xoay Rubik WCA hiện tại là bao nhiêu?',
  ];

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN'; // Assuming Vietnamese as default from context

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      // Clear input text when starting to listen
      setInputText('');
      recognitionRef.current?.start();
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    if (isListening) {
      recognitionRef.current?.stop();
    }

    const userMsgId = Math.random().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToSend }),
      });
      
      const responseText = await response.text();
      let data: any = {};
      try {
        const trimmed = responseText ? responseText.trim() : "";
        if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
          data = JSON.parse(trimmed);
        } else {
          data = { error: "Dữ liệu phản hồi từ máy chủ không hợp lệ." };
        }
      } catch (parseErr) {
        data = { error: "Mất kết nối hoặc sai định dạng dữ liệu từ máy chủ." };
      }

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'coach',
            text: `[Lỗi hệ thống] ${data.error}. Ý kiến phản hồi tạm thời: Hãy kiểm tra cài đặt thiết lập API Key của bạn hế!`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'coach',
            text: data.reply || 'Vui lòng kết nối huấn luyện viên hoặc thử lại bằng câu hỏi khác nhé!',
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'coach',
          text: 'Vui lòng kết nối server chính chủ để trao đổi trực tiếp cùng huấn luyện viên!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-950/30 rounded-lg border border-white/5 shadow-2xl p-2 sm:p-2 grid grid-cols-1 lg:grid-cols-12 gap-1.5 items-stretch min-h-[500px]">
      {/* Suggestions left side - Hidden on Mobile, Visible on Large screens */}
      <div className="hidden lg:flex lg:col-span-4 flex-col justify-between space-y-1.5">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={18} className="text-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Gợi ý câu hỏi thông dụng:</span>
          </div>
          <div className="space-y-1.5.5">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                id={`btn-prompt-${idx}`}
                onClick={() => handleSendMessage(prompt)}
                disabled={loading}
                className="w-full text-left p-2 bg-neutral-900/60 hover:bg-[#0D1117] border border-white/5 hover:border-blue-500/20 text-xs text-neutral-300 font-medium rounded-lg leading-relaxed transition-all hover:-translate-x-0.5 disabled:opacity-40 cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="p-2 bg-blue-950/10 rounded-lg border border-blue-500/10 space-y-1.5">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Nhà huấn luyện tư vấn:</span>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Mô hình được hỗ trợ bởi trí tuệ nhân tạo **Gemini 2.5-flash** xử lý ngôn ngữ tự nhiên tối ưu nhất trên máy chủ server-side an toàn.
          </p>
        </div>
      </div>

      {/* Messages console area right side */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-neutral-950/70 rounded-lg border border-white/5 overflow-hidden p-2 sm:p-2 relative min-h-[400px]">
        {/* Chat message logger */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mb-2 h-96 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-1.5.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}
            >
              {msg.sender === 'coach' && (
                <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                  AI
                </div>
              )}
              <div
                className={`p-2 sm:p-2 rounded-lg max-w-[85%] text-xs leading-relaxed font-sans ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                    : 'bg-neutral-900 text-neutral-200 rounded-tl-none border border-white/5 whitespace-pre-wrap'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 italic pl-10">
              <RefreshCw size={12} className="animate-spin text-blue-400" />
              <span>Huấn luyện viên đang soạn suy luận...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Swipeable Quick suggestions for mobile ONLY just above feed input */}
        <div className="lg:hidden flex flex-col gap-1.5 mb-1.5.5">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={11} className="text-blue-400" />
            <span>Gợi ý hỏi nhanh:</span>
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1.5 flex-nowrap w-full">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={loading}
                className="shrink-0 px-2 py-1 bg-neutral-900/90 border border-white/5 text-[10.5px] text-neutral-300 font-medium rounded-lg hover:border-blue-500/20 active:scale-95 transition-all text-center cursor-pointer whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input prompt area */}
        <div className="flex items-center gap-1.5 border-t border-white/5 pt-3">
          <div className="flex-1 relative flex items-center">
            <input
              id="chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
              placeholder="Đặt bất kỳ câu hói về thế xoay chuẩn, Roux, CFOP v.v..."
              disabled={loading}
              className="w-full bg-neutral-900 text-white rounded-lg pl-4 pr-10 py-3 text-xs outline-none border border-white/5 focus:border-blue-500 transition-colors placeholder:text-neutral-500 disabled:opacity-40"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title={isListening ? 'Dừng ghi âm' : 'Nói câu hỏi'}
              >
                {isListening ? <MicOff size={16} className="animate-pulse" /> : <Mic size={16} />}
              </button>
            )}
          </div>
          <button
            id="btn-send-message"
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim() || loading}
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
