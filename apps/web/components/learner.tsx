"use client";
// Active learner (no auth, by design): picked in the header, remembered per browser.
import type { Learner } from "@sc/schemas";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, errorText } from "@/lib/api";

const STORAGE_KEY = "omnitutor.learnerId";

type LearnerState = {
  learners: Learner[];
  learner: Learner | null;
  select: (id: string) => void;
  create: (name: string) => Promise<void>;
  error: string | null;
};

const LearnerContext = createContext<LearnerState | null>(null);

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function store(id: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
}

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listLearners()
      .then((list) => {
        setLearners(list);
        // ?learner=<id> in the URL (shareable links) wins over the remembered choice.
        const fromUrl = new URLSearchParams(window.location.search).get("learner");
        const stored = readStored();
        const id = [fromUrl, stored].find((x) => x && list.some((l) => l.id === x)) ?? list[0]?.id ?? null;
        setSelectedId(id);
        if (id && id === fromUrl) store(id);
      })
      .catch((e) => setError(errorText(e)));
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    store(id);
  }, []);

  const create = useCallback(async (name: string) => {
    const learner = await api.createLearner({ name });
    setLearners((list) => [...list, learner]);
    select(learner.id);
  }, [select]);

  const learner = learners.find((l) => l.id === selectedId) ?? null;
  return <LearnerContext.Provider value={{ learners, learner, select, create, error }}>{children}</LearnerContext.Provider>;
}

export function useLearner(): LearnerState {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error("useLearner must be used inside <LearnerProvider>");
  return ctx;
}

/** Header control: switch learner or add one. */
export function LearnerPicker() {
  const { learners, learner, select, create, error } = useLearner();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (error) return <span className="text-meta text-proof" title={error}>API offline</span>;
  if (adding) {
    return (
      <form
        className="flex items-center gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          try {
            await create(name.trim());
            setAdding(false);
            setName("");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Learner name"
          aria-label="New learner name"
          className="h-8 w-36 rounded-card border border-rule-strong bg-surface px-2 text-meta text-ink focus:outline-none focus:ring-2 focus:ring-proof/40"
        />
        <button disabled={busy} className="h-8 rounded-card bg-ink px-2.5 text-meta text-paper disabled:opacity-50">Add</button>
        <button type="button" onClick={() => setAdding(false)} className="h-8 px-1.5 text-meta text-graphite hover:text-ink">Cancel</button>
      </form>
    );
  }
  return (
    <label className="flex items-center gap-1.5 text-meta text-graphite">
      <span className="hidden sm:inline">Learner</span>
      <select
        value={learner?.id ?? ""}
        onChange={(e) => (e.target.value === "__new__" ? setAdding(true) : select(e.target.value))}
        className="h-8 max-w-[11rem] rounded-card border border-rule-strong bg-surface px-2 text-meta text-ink focus:outline-none focus:ring-2 focus:ring-proof/40"
      >
        {learners.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
        <option value="__new__">+ New learner…</option>
      </select>
    </label>
  );
}
