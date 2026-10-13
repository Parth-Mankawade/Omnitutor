import React from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-8 text-center space-y-12">
      <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tighter text-ink leading-[0.9]">
          The <span className="text-proof">Adaptive</span> <br /> Study Companion.
        </h1>
        <p className="text-xl text-graphite font-body max-w-2xl mx-auto leading-relaxed">
          An intellectual atelier for your learning. Multimodal grounding, adaptive assessments,
          and a precise learner model to guide your academic journey.
        </p>
      </div >

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <Link href="/dashboard" className="p-8 bg-surface border border-rule rounded-[3rem] hover:border-proof hover:shadow-xl transition-all group text-left space-y-4">
          <div className="w-12 h-12 bg-proof/10 text-proof rounded-2xl flex items-center justify-center text-2xl group-hover:bg-proof group-hover:text-white transition-colors">
            📊
          </div>
          <h3 className="text-2xl font-display font-bold text-ink">Dashboard</h3>
          <p className="text-graphite text-sm leading-relaxed">Visualize your cognitive map and track mastery across all topics.</p>
        </Link>

        <Link href="/tutor" className="p-8 bg-surface border border-rule rounded-[3rem] hover:border-proof hover:shadow-xl transition-all group text-left space-y-4">
          <div className="w-12 h-12 bg-proof/10 text-proof rounded-2xl flex items-center justify-center text-2xl group-hover:bg-proof group-hover:text-white transition-colors">
            🤖
          </div>
          <h3 className="text-2xl font-display font-bold text-ink">Tutor</h3>
          <p className="text-graphite text-sm leading-relaxed">Interactive learning grounded in your specific course materials.</p>
        </Link>

        <Link href="/quiz" className="p-8 bg-surface border border-rule rounded-[3rem] hover:border-proof hover:shadow-xl transition-all group text-left space-y-4">
          <div className="w-12 h-12 bg-proof/10 text-proof rounded-2xl flex items-center justify-center text-2xl group-hover:bg-proof group-hover:text-white transition-colors">
            📝
          </div>
          <h3 className="text-2xl font-display font-bold text-ink">Adaptive Quiz</h3>
          <p className="text-graphite text-sm leading-relaxed">Targeted assessments that adapt to your current mastery level.</p>
        </Link>
      </div >
    </main>
  );
}
