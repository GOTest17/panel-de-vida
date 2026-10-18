"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { HoyEnUnaLinea } from "@/components/dashboard/hoy-en-una-linea";
import { AgendaTimeline } from "@/components/dashboard/agenda-timeline";
import { CorreosSection } from "@/components/dashboard/correos-section";
import { TareasSection } from "@/components/dashboard/tareas-section";
import { AlertasCruzadas } from "@/components/dashboard/alertas-cruzadas";
import { EstadoConexiones } from "@/components/dashboard/estado-conexiones";
import { computeCrossAnalysis, type CrossAlert, type TaskItem } from "@/lib/cross-analysis";
import type { CalendarEvent, FreeBlock } from "@/lib/google/calendar";
import type { ClassifiedEmailView } from "@/app/api/emails/sync/route";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [isSendingBrief, setIsSendingBrief] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Estados para cruce de datos
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [freeBlocks, setFreeBlocks] = useState<FreeBlock[]>([]);
  const [emails, setEmails] = useState<ClassifiedEmailView[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  // 1. Cargar usuario de sesión
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, []);

  // 2. Cargar datos para el análisis cruzado
  useEffect(() => {
    // Agenda
    fetch("/api/calendar/events")
      .then((res) => res.json())
      .then((data) => {
        if (data.agenda) {
          setEvents(data.agenda.events || []);
          setFreeBlocks(data.agenda.freeBlocks || []);
        }
      })
      .catch((err) => console.error("Error fetching agenda for cross analysis:", err));

    // Correos
    fetch("/api/emails/sync")
      .then((res) => res.json())
      .then((data) => {
        const combined = [
          ...(data.responderHoy || []),
          ...(data.esperandoRespuesta || []),
        ];
        setEmails(combined);
      })
      .catch((err) => console.error("Error fetching emails for cross analysis:", err));

    // Tareas
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        setTasks(data.tasks || []);
      })
      .catch((err) => console.error("Error fetching tasks for cross analysis:", err));
  }, []);

  // 3. Ejecutar análisis cruzado
  const analysis = computeCrossAnalysis({
    events,
    freeBlocks,
    emails,
    tasks,
  });

  // 4. Acción: Enviar resumen ahora
  const handleSendBriefNow = async () => {
    try {
      setIsSendingBrief(true);
      setBannerMessage(null);
      const res = await fetch("/api/brief/send-now", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.success) {
        setBannerMessage({
          type: "success",
          text: "¡Resumen matutino generado y enviado a tu correo con éxito!",
        });
      } else {
        setBannerMessage({
          type: "error",
          text: data.error || "No se pudo enviar el resumen. Verifica tu conexión de Google y Resend.",
        });
      }
    } catch (err: unknown) {
      setBannerMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error inesperado al enviar el resumen.",
      });
    } finally {
      setIsSendingBrief(false);
      setTimeout(() => setBannerMessage(null), 8000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        userEmail={userEmail}
        onSendBriefNow={handleSendBriefNow}
        isSendingBrief={isSendingBrief}
      />

      {/* Banner de notificación tras enviar resumen */}
      {bannerMessage && (
        <div
          className={`mx-auto max-w-6xl px-4 pt-4 sm:px-6 transition-all`}
        >
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
              bannerMessage.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-destructive/20 bg-destructive/10 text-destructive"
            }`}
          >
            {bannerMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* 1. SECCIÓN: Hoy en una línea */}
        <HoyEnUnaLinea frase={analysis.hoyEnUnaLinea} />

        {/* 2. SECCIÓN: Agenda */}
        <AgendaTimeline />

        {/* 3. SECCIÓN: Correos */}
        <CorreosSection />

        {/* 4. SECCIÓN: Tareas */}
        <TareasSection onTasksUpdated={(updatedTasks) => setTasks(updatedTasks)} />

        {/* 5. SECCIÓN: Alertas cruzadas */}
        <AlertasCruzadas alertas={analysis.alertas} />

        {/* 6. SECCIÓN: Estado de conexiones */}
        <EstadoConexiones />
      </main>
    </div>
  );
}
