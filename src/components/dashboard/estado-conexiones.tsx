"use client";

import { useEffect, useState } from "react";
import { Plug, CheckCircle2, XCircle, RefreshCw, Calendar, Mail, Database } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function EstadoConexiones() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{
    google: {
      connected: boolean;
      lastSync: string | null;
      createdAt: string | null;
    };
  } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/integrations/status");
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Error reading integration status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const googleConnected = status?.google?.connected;
  const lastSyncStr = status?.google?.lastSync
    ? format(parseISO(status.google.lastSync), "d MMM, HH:mm", { locale: es })
    : null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
            <Plug className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Estado de Conexiones
            </h2>
            <p className="text-xs text-muted-foreground">
              Herramientas y servicios sincronizados
            </p>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          <span>Verificar</span>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Google Workspace */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
              <div className="flex items-center -space-x-1">
                <Calendar className="h-3.5 w-3.5 text-foreground" />
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Google (Calendar & Gmail)
                </span>
                {googleConnected ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {googleConnected
                  ? `Sincronizado: ${lastSyncStr || "Activo"}`
                  : "Desconectado"}
              </p>
            </div>
          </div>

          <a
            href="/api/auth/google"
            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            {googleConnected ? "Reconectar" : "Conectar"}
          </a>
        </div>

        {/* Supabase Database */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
              <Database className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Supabase DB & Auth
                </span>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                RLS activo • Encriptación AES-256
              </p>
            </div>
          </div>

          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            Operativo
          </span>
        </div>
      </div>
    </section>
  );
}
