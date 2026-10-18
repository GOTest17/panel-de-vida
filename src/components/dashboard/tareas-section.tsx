"use client";

import { useEffect, useState } from "react";
import {
  CheckSquare,
  Square,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  Plus,
  RefreshCw,
  Tag,
} from "lucide-react";
import {
  format,
  isBefore,
  isSameDay,
  addDays,
  startOfDay,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import { QuickTaskInput } from "./quick-task-input";
import type { TaskItem } from "@/lib/cross-analysis";

interface TareasSectionProps {
  onTasksUpdated?: (tasks: TaskItem[]) => void;
}

export function TareasSection({ onTasksUpdated }: TareasSectionProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<"hoy" | "vencidas" | "proximos" | "todas">("hoy");

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      const data = await res.json();
      const loadedTasks: TaskItem[] = data.tasks || [];
      setTasks(loadedTasks);
      if (onTasksUpdated) {
        onTasksUpdated(loadedTasks);
      }
    } catch (err) {
      console.error("Error loading tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const toggleTaskStatus = async (task: TaskItem) => {
    const nextStatus = task.estado === "hecha" ? "pendiente" : "hecha";
    // Optimistic update
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...t, estado: nextStatus as TaskItem["estado"] } : t
    );
    setTasks(updated);
    if (onTasksUpdated) onTasksUpdated(updated);

    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, estado: nextStatus }),
      });
    } catch (err) {
      console.error("Error updating task status:", err);
      fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    if (onTasksUpdated) onTasksUpdated(updated);

    try {
      await fetch(`/api/tasks?id=${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error("Error deleting task:", err);
      fetchTasks();
    }
  };

  // Clasificación por grupos
  const today = startOfDay(new Date());
  const threeDaysLater = addDays(today, 3);

  const vencidas = tasks.filter((t) => {
    if (t.estado === "hecha" || !t.fecha_limite) return false;
    const taskDate = parseISO(t.fecha_limite);
    return isBefore(taskDate, today);
  });

  const deHoy = tasks.filter((t) => {
    if (!t.fecha_limite) return false;
    const taskDate = parseISO(t.fecha_limite);
    return isSameDay(taskDate, today);
  });

  const proximosTresDias = tasks.filter((t) => {
    if (!t.fecha_limite) return false;
    const taskDate = parseISO(t.fecha_limite);
    return (
      isBefore(taskDate, threeDaysLater) &&
      !isSameDay(taskDate, today) &&
      !isBefore(taskDate, today)
    );
  });

  let currentList: TaskItem[] = [];
  if (activeGroup === "vencidas") currentList = vencidas;
  else if (activeGroup === "hoy") currentList = deHoy;
  else if (activeGroup === "proximos") currentList = proximosTresDias;
  else currentList = tasks;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
            <CheckSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Tareas</h2>
            <p className="text-xs text-muted-foreground">
              {deHoy.filter((t) => t.estado !== "hecha").length} pendientes para hoy
              {vencidas.length > 0 && ` • ${vencidas.length} vencidas`}
            </p>
          </div>
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Input de creación rápida con NLP */}
      <div className="mt-4">
        <QuickTaskInput onTaskCreated={fetchTasks} />
      </div>

      {/* Selector de Grupos de Tareas */}
      <div className="mt-4 flex items-center gap-1.5 border-b border-border pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveGroup("hoy")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
            activeGroup === "hoy"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <span>Hoy</span>
          <span
            className={`rounded px-1.5 py-0.2 text-[10px] ${
              activeGroup === "hoy"
                ? "bg-background/20 text-background"
                : "bg-secondary text-foreground"
            }`}
          >
            {deHoy.length}
          </span>
        </button>

        <button
          onClick={() => setActiveGroup("vencidas")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
            activeGroup === "vencidas"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <span>Vencidas</span>
          <span
            className={`rounded px-1.5 py-0.2 text-[10px] ${
              vencidas.length > 0
                ? "bg-destructive/20 text-destructive font-semibold"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {vencidas.length}
          </span>
        </button>

        <button
          onClick={() => setActiveGroup("proximos")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
            activeGroup === "proximos"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <span>Próximos 3 días</span>
          <span
            className={`rounded px-1.5 py-0.2 text-[10px] ${
              activeGroup === "proximos"
                ? "bg-background/20 text-background"
                : "bg-secondary text-foreground"
            }`}
          >
            {proximosTresDias.length}
          </span>
        </button>

        <button
          onClick={() => setActiveGroup("todas")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
            activeGroup === "todas"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <span>Todas</span>
          <span
            className={`rounded px-1.5 py-0.2 text-[10px] ${
              activeGroup === "todas"
                ? "bg-background/20 text-background"
                : "bg-secondary text-foreground"
            }`}
          >
            {tasks.length}
          </span>
        </button>
      </div>

      {/* Lista de Tareas */}
      <div className="mt-4 space-y-2">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Cargando tareas...
          </div>
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
            <span>No hay tareas en este grupo.</span>
          </div>
        ) : (
          currentList.map((t) => {
            const isDone = t.estado === "hecha";
            const dateFormatted = t.fecha_limite
              ? format(parseISO(t.fecha_limite), "d MMM, HH:mm", { locale: es })
              : null;

            return (
              <div
                key={t.id}
                className={`group flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors ${
                  isDone
                    ? "bg-secondary/30 opacity-60"
                    : "bg-secondary/50 hover:bg-secondary/80"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <button
                    onClick={() => toggleTaskStatus(t)}
                    className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isDone ? (
                      <CheckSquare className="h-4 w-4 text-foreground" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-medium text-foreground truncate ${
                        isDone ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {t.titulo}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {dateFormatted && (
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="h-2.5 w-2.5" />
                          {dateFormatted}
                        </span>
                      )}

                      {t.prioridad === "alta" && (
                        <span className="rounded bg-destructive/10 px-1 py-0.2 text-[10px] font-medium text-destructive">
                          Alta
                        </span>
                      )}

                      {t.proyecto && (
                        <span className="flex items-center gap-0.5 rounded border border-border px-1 py-0.2 text-[10px]">
                          <Tag className="h-2.5 w-2.5" />
                          {t.proyecto}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                  title="Eliminar tarea"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
