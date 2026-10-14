"use client";
// Header notebook menu (Module 18): lists the account's notebooks, switches between them, and creates or
// deletes one through an in-app dialog. A switch changes the server-side active notebook, then reloads,
// so every page shows that notebook's sources, chats, quizzes, flashcards and mastery.
import type { NotebookView } from "@sc/schemas";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, CloseIcon, NotebookIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { useLearner } from "@/components/learner";
import { api, errorText } from "@/lib/api";

type Dialog = { kind: "create" } | { kind: "delete"; notebook: NotebookView } | null;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Portalled to <body>: the header's backdrop blur would otherwise become the containing block
  // for this fixed overlay and confine it to the header.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 px-4 pt-[18vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="nb-dialog-title" className="page-in w-full max-w-md rounded-3xl border border-rule bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="nb-dialog-title" className="font-display text-2xl font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-graphite hover:bg-paper hover:text-ink">
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function NotebookSwitcher() {
  const { learner } = useLearner();
  const [notebooks, setNotebooks] = useState<NotebookView[] | null>(null);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!learner) return;
    api.listNotebooks().then((l) => setNotebooks(l.notebooks)).catch(() => setNotebooks(null));
  }, [learner]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!learner || !notebooks) return null;
  const active = notebooks.find((n) => n.active);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      window.location.reload();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const openDialog = (d: Dialog) => {
    setOpen(false);
    setError(null);
    setName("");
    setDialog(d);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Notebook: ${active?.name ?? ""}`}
        data-notebook-menu
        className="flex h-9 max-w-60 items-center gap-2 rounded-full border border-rule-strong bg-surface pl-3 pr-2.5 text-meta text-ink hover:border-ink"
      >
        <NotebookIcon size={16} className="shrink-0 text-graphite" />
        <span className="truncate">{active?.name}</span>
        <ChevronDownIcon size={16} className={`shrink-0 text-graphite transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-rule bg-surface py-2 shadow-lg">
          <p className="px-4 pb-1.5 pt-1 font-mono text-[11px] uppercase tracking-widest text-graphite">Your notebooks</p>
          <ul role="listbox" aria-label="Notebooks" className="max-h-72 overflow-y-auto">
            {notebooks.map((n) => (
              <li key={n.id} role="option" aria-selected={n.active}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => (n.active ? setOpen(false) : void run(() => api.selectNotebook(n.id)))}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-paper disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{n.name}</span>
                    <span className="block text-xs text-graphite">{n.sourceCount} source{n.sourceCount === 1 ? "" : "s"}</span>
                  </span>
                  {n.active && <CheckIcon size={18} className="shrink-0 text-proof" />}
                </button>
              </li>
            ))}
          </ul>
          <div className="my-1.5 border-t border-rule" />
          <button type="button" onClick={() => openDialog({ kind: "create" })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ink hover:bg-paper">
            <PlusIcon size={18} className="text-graphite" /> New notebook
          </button>
          {active && (
            <button type="button" onClick={() => openDialog({ kind: "delete", notebook: active })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-proof hover:bg-paper">
              <TrashIcon size={18} /> Delete this notebook
            </button>
          )}
        </div>
      )}

      {dialog?.kind === "create" && (
        <Modal title="New notebook" onClose={() => !busy && setDialog(null)}>
          <form
            className="mt-2 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = name.trim();
              if (trimmed) void run(() => api.createNotebook({ name: trimmed }));
            }}
          >
            <p className="text-sm text-graphite">One notebook per subject. Its files, tutor history, quizzes, flashcards and mastery stay separate from your other notebooks.</p>
            <label className="block text-meta text-graphite">
              Subject name
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Computer Networks"
                className="mt-1.5 h-11 w-full rounded-2xl border border-rule-strong bg-paper px-4 text-body text-ink focus:outline-none focus:ring-2 focus:ring-proof/40"
              />
            </label>
            {error && <p role="alert" className="text-sm text-proof">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDialog(null)} disabled={busy} className="h-10 rounded-full px-5 text-sm text-graphite hover:bg-paper hover:text-ink">Cancel</button>
              <button disabled={busy || !name.trim()} className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-paper hover:opacity-85 disabled:opacity-40">
                {busy ? "Creating…" : "Create notebook"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dialog?.kind === "delete" && (
        <Modal title="Delete notebook?" onClose={() => !busy && setDialog(null)}>
          <div className="mt-2 space-y-5">
            <p className="text-sm text-graphite">
              <span className="font-medium text-ink">{dialog.notebook.name}</span> and everything in it (files, topics, tutor history, quizzes, flashcards, mastery) will be deleted. This cannot be undone.
            </p>
            {error && <p role="alert" className="text-sm text-proof">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDialog(null)} disabled={busy} className="h-10 rounded-full px-5 text-sm text-graphite hover:bg-paper hover:text-ink">Cancel</button>
              <button type="button" disabled={busy} onClick={() => void run(() => api.deleteNotebook(dialog.notebook.id))} className="h-10 rounded-full bg-proof px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
                {busy ? "Deleting…" : "Delete notebook"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
