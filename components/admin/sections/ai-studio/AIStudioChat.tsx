"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Bot, Loader2, Sparkles, Database, Users, LineChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "./ChatMessage";
import { toast } from "@/components/ui/toast";

// 🟢 Import the Voice Visualizer
import { useMicrophoneStream, useAudioAnalyser, VoiceWave } from "react-ai-voice-visualizer";

const SUGGESTIONS = [
  { icon: <Users className="w-4 h-4" />, text: "How many users signed up this week?" },
  { icon: <Database className="w-4 h-4" />, text: "Show me the last 5 orders" },
  { icon: <LineChart className="w-4 h-4" />, text: "Analyze our revenue this month" },
];

export function AIStudioChat() {
  const [isListening, setIsListening] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🟢 Initialize Voice Visualizer Hooks
  const { stream, isActive, start, stop } = useMicrophoneStream();
  const { frequencyData, volume } = useAudioAnalyser(stream);

  const { messages, sendMessage, status, addToolResult } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/v1/admin/dashboard/ai-studio/chat",
    }),
    onError: (err) => {
      toast.add({ title: "AI Error", description: err.message, type: "error" });
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const toggleListening = () => {
    if (isListening) {
      stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.add({ title: "Not Supported", description: "Your browser does not support voice input.", type: "error" });
      return;
    }

    // Start the visualizer stream
    start();
    setIsListening(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onend = () => {
      setIsListening(false);
      stop();
    };
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join("");
      setInput(transcript);
    };

    recognition.start();
  };

  return (
    // 🟢 FIX: h-full and overflow-hidden ensures ONLY the chat area scrolls
    <div className="flex flex-col h-full bg-[#fffafb] rounded-2xl shadow-2xl border border-orange-100/50 overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#f97316 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      {/* 🟢 FIX: flex-1 overflow-y-auto is the ONLY scrollable area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 z-10 relative scrollbar-thin scrollbar-thumb-orange-200">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-8 max-w-2xl mx-auto text-center">
            {/* Empty State... */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">How can I help you today?</h1>
              <p className="text-gray-500">Ask me to analyze data, generate schemas, or manage users.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mt-8">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage({ text: s.text })} className="...">
                   {/* ... */}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} addToolResult={addToolResult} />
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:p-6 bg-white/80 backdrop-blur-xl border-t border-orange-100/50 z-10 shrink-0">
        <form onSubmit={handleFormSubmit} className="relative flex items-center gap-3 max-w-4xl mx-auto">
          <button
            type="button"
            onClick={toggleListening}
            className={`relative p-4 rounded-full transition-all duration-300 ${
              isListening ? "bg-red-500 text-white shadow-lg shadow-red-200" : "bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600"
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            
            {/* 🟢 Voice Power Visualizer overlay */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-red-400/30 animate-ping rounded-full" style={{ transform: `scale(${1 + volume * 0.5})` }} />
              </div>
            )}
          </button>

          <div className="relative flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Message AI Studio..."}
              className="w-full p-4 pl-6 pr-14 bg-white border-2 border-orange-100 rounded-full focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all shadow-sm text-gray-800 placeholder-gray-400"
              disabled={isLoading || isListening}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || isListening}
              className="absolute right-2 top-2 p-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 transition-all shadow-md"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </form>

        {/* 🟢 Live Audio Waveform Visualizer */}
        {isListening && (
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-12 flex items-center justify-center">
             <VoiceWave audioData={frequencyData} volume={volume} state="listening" lineColor="#f97316" numberOfLines={7} />
          </div>
        )}
      </div>
    </div>
  );
}