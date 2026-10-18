"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";

interface QuickTaskInputProps {
  onTaskCreated: () => void;
}

export function QuickTaskInput({ onTaskCreated }: QuickTaskInputProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    try {
      setLoading(true);

      // 1. Interpretar con Claude en lenguaje natural
      const parseRes = await fetch("/api/tasks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim() }),
      });

      const parseData = await parseRes.json();
      const parsed = parseData.parsed || {
        titulo: input.trim(),
        prioridad: "media",
        fecha_limite: null,
        proyecto: null,
      };

      // 2. Crear tarea en Supabase
      const createRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: parsed.titulo,
          fecha_limite: parsed.fecha_limite,
          prioridad: parsed.prioridad,
          proyecto: parsed.proyecto,
          estado: "pendiente",
        }),
      });

      if (createRes.ok) {
        setInput("");
        onTaskCreated();
      }
    } catch (err) {
      console.error("Error creating task with NLP:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Crear tarea rápida... ej. "revisar informe el viernes urgente"'
        disabled={loading}
        className="w-full rounded-lg border border-border bg-secondary/50 px-3.5 py-2 pr-24 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!input.trim() || loading}
        className="absolute right-1.5 flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background transition-colors hover:opacity-90 disabled:opacity-40"
      >
        {loading ? (
          <div className="h-3 w-3 animate-spin rounded-full border border-background border-t-transparent" />
        ) : (
          <>
            <Sparkles className="h-2.5 w-2.5" />
            <span>Crear</span>
          </>
        )}
      </button>
    </form>
  );
}
