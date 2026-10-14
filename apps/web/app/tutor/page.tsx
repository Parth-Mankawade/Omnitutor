"use client";
import { BookOpenIcon } from "@/components/icons";
import React, { useState } from "react";

interface Citation {
  id: string;
  type: "pdf" | "slide" | "video";
  content: string;
  page?: number;
  slide?: number;
  timestamp?: number;
  sourceName: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
}

const MOCK_MESSAGES: Message[] = [
  {
    role: "assistant",
    content: "Hello Alex. Based on your current mastery of CPU Scheduling (85%), I recommend we dive into Memory Management. Would you like to start with a summary of Paging or go straight to a practice problem?",
    citations: [],
  },
  {
    role: "user",
    content: "Can you explain how Paging works in the context of virtual memory?",
    citations: [],
  },
  {
    role: "assistant",
    content: "Paging is a memory management scheme that eliminates the need for contiguous allocation of physical memory. This scheme permits the physical address space of a process to be non-contiguous. The physical memory is broken into fixed-size blocks called frames, and logical memory is broken into blocks of the same size called pages.",
    citations: [
      {
        id: "c1",
        type: "pdf",
        content: "Paging allows the physical address space of a process to be non-contiguous. It divides physical memory into fixed-size blocks called frames...",
        page: 42,
        sourceName: "OS_Textbook.pdf",
      },
      {
        id: "c2",
        type: "video",
        content: "In this segment, we discuss the frame-to-page mapping mechanism which is the core of paging...",
        timestamp: 432,
        sourceName: "Lecture_04_Memory.mp4",
      },
    ],
  },
];

export default function TutorPage() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput] = useState("");
  const [activeCitation, setActiveCitation] = useState<Citation | null>(MOCK_MESSAGES[2].citations[0]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", content: input, citations: [] }]);
    setInput("");
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "That's a great follow-up question. Let me find the exact section in your materials...",
        citations: [],
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* Chat Area (60%) */}
      <section className="w-full lg:w-[60%] flex flex-col h-full border-r border-rule">
        <header className="p-6 border-b border-rule flex justify-between items-center bg-surface">
          <div>
            <h1 className="text-xl font-display font-bold text-ink">Personal Tutor</h1>
            <p className="text-xs text-graphite font-mono uppercase tracking-widest">Topic: Memory Management</p>
          </div>
          <div className="flex items-center gap-3">
             <span className="flex items-center gap-2 px-3 py-1 bg-proof/10 text-proof rounded-full text-xs font-bold">
               <span className="w-2 h-2 bg-proof rounded-full animate-pulse" />
               Adaptive Mode
             </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] space-y-3 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                <div className={`p-4 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-proof text-white rounded-tr-none"
                    : "bg-surface border border-rule text-ink rounded-tl-none shadow-sm"
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                {msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {msg.citations.map(cit => (
                      <button
                        key={cit.id}
                        onClick={() => setActiveCitation(cit)}
                        className="text-[10px] font-mono px-2 py-1 bg-graphite/10 text-graphite rounded hover:bg-proof hover:text-white transition-colors border border-rule"
                      >
                        Source: {cit.type} {cit.page || cit.slide || cit.timestamp}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <footer className="p-6 bg-surface border-t border-rule">
          <div className="relative max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask a question about the material..."
              className="w-full p-4 pr-16 bg-paper border border-rule rounded-2xl focus:outline-none focus:ring-2 focus:ring-proof/50 transition-all font-body"
            />
            <button
              onClick={handleSend}
              className="absolute right-2 top-2 bottom-2 px-4 bg-proof text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              <span className="text-sm font-bold">Send</span>
            </button>
          </div>
        </footer>
      </section>

      {/* Grounding Panel (40%) */}
      <aside className="hidden lg:flex w-[40%] flex-col h-full bg-surface">
        <header className="p-6 border-b border-rule">
          <h2 className="text-lg font-display font-bold text-ink">Material Grounding</h2>
          <p className="text-xs text-graphite">Direct excerpts from your course materials</p>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {activeCitation ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-paper border-l-4 border-proof rounded-r-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-graphite uppercase tracking-widest">
                    {activeCitation.sourceName}
                  </span>
                  <span className="text-xs font-mono text-proof font-bold">
                    {activeCitation.type === "pdf" && `Page ${activeCitation.page}`}
                    {activeCitation.type === "slide" && `Slide ${activeCitation.slide}`}
                    {activeCitation.type === "video" && `Time ${Math.floor((activeCitation.timestamp || 0)/60)}:${(activeCitation.timestamp || 0)%60}`}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-ink italic">
                  &ldquo;{activeCitation.content}&rdquo;
                </p>
              </div>

              <div className="aspect-video bg-graphite/5 rounded-2xl border border-rule flex items-center justify-center text-graphite text-sm italic overflow-hidden relative group">
                 {/* Mock Media Viewer */}
                 <div className="absolute inset-0 flex items-center justify-center bg-workspace/5 group-hover:bg-workspace/10 transition-colors">
                    <span className="text-xs font-mono text-graphite">Media Preview: {activeCitation.type}</span>
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-12">
              <div className="w-16 h-16 bg-graphite/10 rounded-full flex items-center justify-center text-graphite">
                <BookOpenIcon size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">No active citation</p>
                <p className="text-xs text-graphite">Select a source tag in the chat to view the material here.</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
