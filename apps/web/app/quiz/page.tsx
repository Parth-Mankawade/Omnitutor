"use client";
import { GraduationCapIcon } from "@/components/icons";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  misconception?: string;
}

interface Question {
  id: string;
  stem: string;
  options: Option[];
  difficulty: number;
  topic: string;
}

const MOCK_QUESTIONS: Question[] = [
  {
    id: "q1",
    topic: "CPU Scheduling",
    difficulty: 2,
    stem: "In a Round Robin scheduling algorithm, what happens when a process's CPU burst is shorter than the time quantum?",
    options: [
      { id: "a", text: "The process continues to run until the quantum expires.", isCorrect: false, misconception: "Confuses RR with fixed-time slicing" },
      { id: "b", text: "The process releases the CPU immediately after completion.", isCorrect: true },
      { id: "c", text: "The process is moved to the end of the queue for the remaining time.", isCorrect: false, misconception: "Confuses RR with multi-level feedback queues" },
      { id: "d", text: "The system triggers a context switch immediately.", isCorrect: false },
    ],
  },
  {
    id: "q2",
    topic: "Memory Management",
    difficulty: 3,
    stem: "Which of the following is the primary cause of external fragmentation in contiguous memory allocation?",
    options: [
      { id: "a", text: "Fixed-size partition allocation.", isCorrect: false },
      { id: "b", text: "Dynamic partition allocation with processes of varying sizes.", isCorrect: true },
      { id: "c", text: "Lack of paging mechanisms.", isCorrect: false },
      { id: "d", text: "Internal fragmentation within the frames.", isCorrect: false },
    ],
  },
];

export default function QuizPage() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = MOCK_QUESTIONS[currentIdx];

  const handleVerify = () => {
    if (!selectedOption) return;
    setIsVerified(true);
    const option = currentQuestion.options.find(o => o.id === selectedOption);
    if (option?.isCorrect) setScore(s => s + 1);
  };

  const handleNext = () => {
    setIsVerified(false);
    setSelectedOption(null);
    setCurrentIdx(prev => prev + 1);
  };

  if (currentIdx >= MOCK_QUESTIONS.length) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-paper">
        <div className="max-w-md w-full p-12 bg-surface border border-rule rounded-[3rem] shadow-xl text-center space-y-8">
          <div className="w-20 h-20 bg-proof/10 text-proof rounded-full flex items-center justify-center mx-auto">
            <GraduationCapIcon size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-ink">Session Complete</h1>
            <p className="text-graphite">You have completed the diagnostic assessment.</p>
          </div>
          <div className="flex justify-center items-baseline gap-2">
            <span className="text-6xl font-display font-bold text-ink">{Math.round((score/MOCK_QUESTIONS.length)*100)}%</span>
            <span className="text-graphite font-mono">accuracy</span>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full py-4 bg-proof text-white rounded-2xl font-bold hover:opacity-90 transition-opacity"
          >
            View Performance Report
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-paper font-body">
      <div className="max-w-3xl w-full space-y-12">
        {/* Progress */}
        <div className="flex justify-between items-center max-w-md mx-auto">
          <span className="text-xs font-mono text-graphite uppercase tracking-widest">
            Question {currentIdx + 1} of {MOCK_QUESTIONS.length}
          </span>
          <span className="text-xs font-mono text-proof font-bold">
            {currentQuestion.topic}
          </span>
        </div>

        <div className="w-full h-1 bg-rule rounded-full overflow-hidden max-w-md mx-auto">
          <div
            className="h-full bg-proof transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / MOCK_QUESTIONS.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-ink leading-tight">
            {currentQuestion.stem}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isCorrect = opt.isCorrect;
              let style = "border-rule bg-surface text-ink hover:border-proof";

              if (isVerified) {
                if (isCorrect) style = "border-green-500 bg-green-50 text-green-900 ring-2 ring-green-500";
                else if (isSelected) style = "border-red-500 bg-red-50 text-red-900 ring-2 ring-red-500";
                else style = "border-rule bg-surface text-graphite opacity-50";
              } else if (isSelected) {
                style = "border-proof bg-proof/5 text-ink ring-2 ring-proof/20";
              }

              return (
                <button
                  key={opt.id}
                  disabled={isVerified}
                  onClick={() => setSelectedOption(opt.id)}
                  className={`p-6 rounded-2xl border-2 transition-all text-left group ${style}`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${isSelected ? "bg-proof text-white border-proof" : "bg-transparent text-graphite border-rule"}`}>
                      {opt.id.toUpperCase()}
                    </span>
                    <span className="text-sm leading-relaxed">{opt.text}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center pt-8">
            {!isVerified ? (
              <button
                disabled={!selectedOption}
                onClick={handleVerify}
                className="px-12 py-4 bg-workspace text-white rounded-full font-bold hover:bg-proof transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Verify Answer
              </button>
            ) : (
              <div className="flex flex-col items-center gap-6">
                {selectedOption && (
                  <div className="max-w-md p-4 bg-surface border border-rule rounded-2xl text-center animate-in zoom-in-95">
                    <p className="text-xs font-mono text-graphite uppercase mb-2">Feedback</p>
                    <p className="text-sm text-ink italic">
                      {currentQuestion.options.find(o => o.id === selectedOption)?.isCorrect
                        ? "Correct! Your understanding of this concept is solid."
                        : (currentQuestion.options.find(o => o.id === selectedOption)?.misconception || "Incorrect. Review the grounding material to clarify.")}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleNext}
                  className="px-12 py-4 bg-proof text-white rounded-full font-bold hover:opacity-90 transition-opacity"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
