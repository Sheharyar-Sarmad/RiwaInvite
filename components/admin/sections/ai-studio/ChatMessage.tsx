"use client";

import { UIMessage } from "ai";
import { motion } from "framer-motion";
import { User, Bot, ChevronDown, Sparkles, Volume2, Square, Download, Database, ShieldAlert } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Streamdown } from "streamdown";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/api_base";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function ChatMessage({ message, addToolResult }: { message: UIMessage; addToolResult: any }) {
  const isUser = message.role === "user";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // 🟢 FAILSAFE: Scrub any accidental bcrypt hashes from the text
  const rawText = message.parts
    ?.filter((p) => p.type === "text")
    .map((p) => (p as any).text)
    .join("") || "";

  const textContent = rawText.replace(/\$2[ayb]\$.{56}/g, '[REDACTED]');

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleSpeak = () => {
    if (!textContent) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = textContent.replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.includes("Female") || 
      v.name.includes("Samantha") || 
      v.name.includes("Zira") || 
      v.name.includes("Google UK English Female")
    );
    
    if (femaleVoice) utterance.voice = femaleVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleExportPDF = async () => {
    if (!messageRef.current) return;
    try {
      const originalStyle = messageRef.current.style.background;
      messageRef.current.style.background = "#ffffff";
      
      const canvas = await html2canvas(messageRef.current, { scale: 2, backgroundColor: "#ffffff" });
      messageRef.current.style.background = originalStyle;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save("AI-Studio-Export.pdf");
    } catch (e) {
      toast.add({ title: "Export Error", description: "Failed to export PDF.", type: "error" });
    }
  };

  return (
    <motion.div
      ref={messageRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 w-full max-w-4xl mx-auto ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
        isUser ? "bg-orange-500 text-white" : "bg-gray-900 text-white"
      }`}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      <div className={`flex flex-col space-y-2 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        
        {message.parts?.some(p => p.type === 'reasoning') && (
          <ReasoningBlock parts={message.parts} />
        )}

        {textContent && (
          <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm w-full ${
            isUser 
              ? "bg-orange-500 text-white rounded-tr-sm" 
              : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
          }`}>
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">{textContent}</div>
            ) : (
              // 🟢 FIX: Custom CSS to force Streamdown tables to wrap without horizontal scroll
              <div className="streamdown-wrapper break-words w-full overflow-hidden 
                              [&_table]:w-full [&_table]:table-fixed [&_th]:break-words [&_td]:break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-all">
                <Streamdown>{textContent}</Streamdown>
              </div>
            )}
          </div>
        )}

        {!isUser && textContent && (
          <div className="flex items-center gap-2 mt-1">
            <button 
              onClick={handleSpeak}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-full transition-colors shadow-sm ${
                isSpeaking 
                  ? "bg-orange-50 text-orange-600 border-orange-200" 
                  : "text-gray-500 hover:text-orange-500 bg-white border-gray-200"
              }`}
            >
              {isSpeaking ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isSpeaking ? "Stop" : "Listen"}
            </button>
            
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-orange-500 bg-white border border-gray-200 rounded-full transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        )}

        {message.parts?.map((part, index) => {
          if (part.type !== "tool-invocation") return null;
          const { toolName, state, args, result, toolCallId } = part as any;

          if (toolName === "execute_read_query") {
            return <DataTable key={index} state={state} result={result} />;
          }
          if (toolName === "propose_action") {
            return <HITLAction key={index} state={state} args={args} result={result} addToolResult={addToolResult} toolCallId={toolCallId} toolName={toolName} />;
          }
          return null;
        })}
      </div>
    </motion.div>
  );
}

// ==========================================
// 🟢 SUB-COMPONENTS
// ==========================================

function DataTable({ state, result }: any) {
  if (state !== "result" || !result) return <div className="text-sm text-gray-500 animate-pulse">Querying database...</div>;
  if (result.error) return <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">Error: {result.error}</div>;
  
  const data = result.data || [];
  if (data.length === 0) return <div className="text-sm text-gray-500">No results found.</div>;
  
  const columns = Object.keys(data[0]);
  
  // 🟢 FIX: Removed overflow-x-auto and applied table-fixed with break-words
  return (
    <div className="w-full mt-2 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      <table className="w-full text-sm text-left table-fixed">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
          <tr>{columns.map(col => <th key={col} className="px-4 py-3 break-words">{col}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row: any, i: number) => (
            <tr key={i} className="hover:bg-orange-50/50 transition-colors">
              {columns.map(col => <td key={col} className="px-4 py-2 text-gray-700 break-words">{typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HITLAction({ state, args, result, addToolResult, toolCallId, toolName }: any) {
  const [isExecuting, setIsExecuting] = useState(false);
  if (state === "result" && result?.status === "pending_approval") {
    return (
      <div className="w-full mt-2 p-4 rounded-xl border border-orange-200 bg-orange-50/50">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-orange-900">Approval Required</h4>
            <p className="text-sm text-orange-800 mb-3">{args.explanation}</p>
            <div className="flex gap-2">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" disabled={isExecuting}
                onClick={async () => {
                  setIsExecuting(true);
                  try {
                    if (args.actionType === "DELETE_USER") await apiClient.delete(`/admin/dashboard/users/${args.payload.userId}`);
                    addToolResult({ tool: toolName, toolCallId, output: "Action executed successfully by Admin." });
                    toast.add({ title: "Success", description: "Action completed.", type: "success" });
                  } catch (e: any) {
                    addToolResult({ tool: toolName, toolCallId, output: `Action failed: ${e.message}` });
                  } finally { setIsExecuting(false); }
                }}>
                {isExecuting ? "Executing..." : "Approve & Execute"}
              </Button>
              <Button size="sm" variant="outline" disabled={isExecuting} onClick={() => addToolResult({ tool: toolName, toolCallId, output: "Admin rejected the action." })}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function ReasoningBlock({ parts }: { parts: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const reasoningText = parts.filter((p) => p.type === "reasoning").map((p) => p.reasoning || p.text || "").join("");
  if (!reasoningText.trim()) return null;
  return (
    <div className="w-full">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors">
        <Sparkles className="w-3.5 h-3.5 text-orange-400" />
        {isOpen ? "Hide thought process" : "View thought process"}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <motion.div initial={false} animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }} className="overflow-hidden">
        <div className="mt-2 p-4 bg-orange-50/50 border border-orange-100 rounded-xl text-xs text-gray-600 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
          {reasoningText}
        </div>
      </motion.div>
    </div>
  );
}