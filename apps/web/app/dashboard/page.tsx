"use client";
import React from "react";

interface TopicMastery {
  id: string;
  name: string;
  mastery: number; // 0 to 1
  prereqs: string[];
  status: "mastered" | "learning" | "weak";
}

const MOCK_TOPICS: TopicMastery[] = [
  { id: "1", name: "CPU Scheduling", mastery: 0.85, prereqs: [], status: "mastered" },
  { id: "2", name: "Memory Management", mastery: 0.42, prereqs: ["1"], status: "learning" },
  { id: "3", name: "Deadlock Prevention", mastery: 0.15, prereqs: ["1", "2"], status: "weak" },
  { id: "4", name: "Virtual Memory", mastery: 0.61, prereqs: ["2"], status: "learning" },
  { id: "5", name: "Disk Scheduling", mastery: 0.30, prereqs: ["1"], status: "weak" },
];

const MasteryBar = ({ value }: { value: number }) => (
  <div className="w-full h-1.5 bg-rule rounded-full overflow-hidden">
    <div
      className="h-full bg-proof transition-all duration-500 ease-out"
      style={{ width: `${value * 100}%` }}
    />
  </div>
);

const StatCard = ({ label, value, subvalue }: { label: string; value: string; subvalue?: string }) => (
  <div className="p-6 bg-surface border border-rule rounded-[2rem] shadow-sm flex flex-col justify-between">
    <span className="text-graphite text-sm font-medium uppercase tracking-wider">{label}</span>
    <div className="mt-4">
      <span className="text-3xl font-display font-bold text-ink">{value}</span>
      {subvalue && <span className="ml-2 text-graphite text-sm">{subvalue}</span>}
    </div>
  </div>
);

export default function DashboardPage() {
  return (
    <main className="p-8 max-w-7xl mx-auto w-full space-y-12">
      {/* Header */}
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold tracking-tight text-ink">
            Academic Atelier
          </h1>
          <p className="text-graphite font-body">
            Welcome back, <span className="text-ink font-medium">Alex</span>. Your cognitive map is updating.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface border border-rule rounded-full text-sm font-medium hover:bg-graphite/5 transition-colors">
            Course Map
          </button>
          <button className="px-5 py-2 bg-proof text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
            Start Study Session
          </button>
        </div>
      </header>

      {/* Bento Grid Overview */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-6">
          <div className="col-span-2 p-8 bg-surface border border-rule rounded-[2.5rem] shadow-sm">
            <h2 className="text-xl font-display font-bold mb-6">Knowledge Topology</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {MOCK_TOPICS.map((topic) => (
                <div key={topic.id} className="space-y-3 group">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-ink group-hover:text-proof transition-colors">
                      {topic.name}
                    </span>
                    <span className="font-mono text-xs text-graphite">
                      {Math.round(topic.mastery * 100)}%
                    </span>
                  </div>
                  <MasteryBar value={topic.mastery} />
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1 p-6 bg-surface border border-rule rounded-[2rem] shadow-sm flex flex-col justify-center items-center text-center space-y-2">
            <span className="text-graphite text-xs uppercase tracking-widest">Overall Mastery</span>
            <span className="text-5xl font-display font-bold text-ink">54%</span>
          </div>

          <div className="col-span-1 p-6 bg-surface border border-rule rounded-[2rem] shadow-sm flex flex-col justify-center items-center text-center space-y-2">
            <span className="text-graphite text-xs uppercase tracking-widest">Study Streak</span>
            <span className="text-5xl font-display font-bold text-ink">12d</span>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="p-8 bg-workspace text-paper rounded-[2.5rem] shadow-xl space-y-6">
            <h2 className="text-xl font-display font-bold">Focus Areas</h2>
            <div className="space-y-4">
              {MOCK_TOPICS.filter(t => t.status === "weak").map(topic => (
                <div key={topic.id} className="p-4 bg-surface/10 rounded-2xl border border-white/10 flex justify-between items-center hover:bg-surface/20 transition-colors cursor-pointer group">
                  <div>
                    <p className="font-medium text-paper">{topic.name}</p>
                    <p className="text-xs text-white/50">Needs reinforcement</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-proof flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-white text-xs">→</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-3 bg-paper text-ink rounded-2xl font-bold text-sm hover:bg-surface transition-colors">
              Generate Diagnostic Quiz
            </button>
          </div>

          <div className="p-8 bg-surface border border-rule rounded-[2.5rem] shadow-sm space-y-4">
            <h2 className="text-lg font-display font-bold">Upcoming Milestones</h2>
            <div className="space-y-4">
              {[
                { date: "Oct 15", task: "Complete Memory Mgmt" },
                { date: "Oct 18", task: "Mock Exam 1" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                  <span className="font-mono text-graphite bg-graphite/10 px-2 py-1 rounded">{m.date}</span>
                  <span className="font-medium text-ink">{m.task}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
