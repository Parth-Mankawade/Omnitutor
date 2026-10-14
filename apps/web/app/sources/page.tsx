"use client";
import { SendIcon, TrashIcon } from "@/components/icons";
import React, { useState } from "react";

interface Source {
  id: string;
  name: string;
  type: "PDF" | "PPTX" | "VIDEO";
  status: "PROCESSING" | "READY" | "ERROR";
  uploadDate: string;
  size: string;
}

const MOCK_SOURCES: Source[] = [
  { id: "1", name: "OS_Textbook.pdf", type: "PDF", status: "READY", uploadDate: "2026-10-12", size: "12.4 MB" },
  { id: "2", name: "Lecture_04_Memory.mp4", type: "VIDEO", status: "READY", uploadDate: "2026-10-12", size: "145 MB" },
  { id: "3", name: "CPU_Scheduling_Deck.pptx", type: "PPTX", status: "PROCESSING", uploadDate: "2026-10-13", size: "4.1 MB" },
];

export default function SourcesPage() {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => setIsUploading(false), 2000);
  };

  return (
    <main className="p-8 max-w-5xl mx-auto w-full space-y-12">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold tracking-tight text-ink">Knowledge Base</h1>
          <p className="text-graphite font-body">Ingest lecture materials to build your personal tutoring model.</p>
        </div>
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="px-6 py-3 bg-proof text-white rounded-full font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Add New Source"}
        </button>
      </header>

      {/* Upload Area */}
      <div className="p-12 border-2 border-dashed border-rule rounded-[3rem] bg-surface flex flex-col items-center justify-center text-center space-y-4 group hover:border-proof transition-colors cursor-pointer">
        <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
          <SendIcon size={28} />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-display font-bold text-ink">Drop your materials here</p>
          <p className="text-sm text-graphite">Supports PDF, PPTX, and MP4 (up to 20 min)</p>
        </div>
        <div className="flex gap-2 pt-4">
          <span className="text-[10px] font-mono px-2 py-1 bg-graphite/10 text-graphite rounded">PDF</span>
          <span className="text-[10px] font-mono px-2 py-1 bg-graphite/10 text-graphite rounded">PPTX</span>
          <span className="text-[10px] font-mono px-2 py-1 bg-graphite/10 text-graphite rounded">MP4</span>
        </div>
      </div >

      {/* Sources List */}
      <div className="space-y-6">
        <h2 className="text-xl font-display font-bold">Ingested Materials</h2>
        <div className="grid grid-cols-1 gap-4">
          {MOCK_SOURCES.map((source) => (
            <div key={source.id} className="p-5 bg-surface border border-rule rounded-2xl flex items-center justify-between hover:border-proof transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-paper border border-rule rounded-xl flex items-center justify-center text-sm font-bold text-graphite">
                  {source.type}
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-ink group-hover:text-proof transition-colors">{source.name}</p>
                  <div className="flex items-center gap-3 text-xs text-graphite font-mono">
                    <span>{source.uploadDate}</span>
                    <span>•</span>
                    <span>{source.size}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    source.status === "READY" ? "bg-green-500" :
                    source.status === "PROCESSING" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                  }`} />
                  <span className="text-xs font-mono text-graphite uppercase tracking-widest">
                    {source.status}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${source.name}`}
                  className="p-2 hover:bg-graphite/10 rounded-lg text-graphite hover:text-ink transition-colors"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div >
    </main>
  );
}
