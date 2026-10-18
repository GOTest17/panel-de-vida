"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  ExternalLink,
  RefreshCw,
  Clock,
  Inbox,
  AlertCircle,
  BellOff,
  CheckCircle2,
} from "lucide-react";
import type { ClassifiedEmailView } from "@/app/api/emails/sync/route";

export function CorreosSection() {
  const [activeTab, setActiveTab] = useState<"responder" | "esperando">("responder");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [responderHoy, setResponderHoy] = useState<ClassifiedEmailView[]>([]);
  const [esperandoRespuesta, setEsperandoRespuesta] = useState<ClassifiedEmailView[]>([]);
  const [informativoCount, setInformativoCount] = useState<number>(0);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/emails/sync");
      const data = await res.json();

      if (data.connected === false && !data.responderHoy) {
        setConnected(false);
      } else {
        setConnected(true);
        setResponderHoy(data.responderHoy || []);
        setEsperandoRespuesta(data.esperandoRespuesta || []);
        setInformativoCount(data.informativoCount || 0);
      }
    } catch (err) {
      console.error("Error fetching emails:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Correos</h2>
            <p className="text-xs text-muted-foreground">
              {responderHoy.length} prioritarios para responder hoy
              {informativoCount > 0 && ` • ${informativoCount} informativos`}
            </p>
          </div>
        </div>

        {connected && (
          <button
            onClick={fetchEmails}
            disabled={loading}
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Sincronizar</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-4 flex items-center gap-2 border-b border-border pb-2 text-xs">
        <button
          onClick={() => setActiveTab("responder")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
            activeTab === "responder"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <span>Responder hoy</span>
          <span
            className={`rounded px-1.5 py-0.2 text-[10px] ${
              activeTab === "responder"
                ? "bg-background/20 text-background"
                : "bg-secondary text-foreground"
            }`}
          >
            {responderHoy.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("esperando")}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
            activeTab === "esperando"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <span>Esperando respuesta</span>
          <span
            className={`rounded px-1.5 py-0.2 text-[10px] ${
              activeTab === "esperando"
                ? "bg-background/20 text-background"
                : "bg-secondary text-foreground"
            }`}
          >
            {esperandoRespuesta.length}
          </span>
        </button>

        <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <BellOff className="h-3.5 w-3.5" />
          <span>{informativoCount} boletines silenciados</span>
        </div>
      </div>

      {/* Estado: No conectado */}
      {connected === false && (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-10 px-4 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-medium text-foreground">
            Gmail no conectado
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Conecta tu cuenta con permiso de solo lectura para clasificar hilos automáticamente con Claude.
          </p>
          <a
            href="/api/auth/google"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-foreground px-4 py-2 text-xs font-medium text-background transition-colors hover:opacity-90"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Conectar Gmail</span>
          </a>
        </div>
      )}

      {/* Estado: Cargando */}
      {connected !== false && loading && (
        <div className="mt-6 flex items-center justify-center py-12 text-xs text-muted-foreground">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Analizando y clasificando correos con Claude...
        </div>
      )}

      {/* Lista: Responder Hoy */}
      {connected !== false && !loading && activeTab === "responder" && (
        <div className="mt-4 space-y-2.5">
          {responderHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 mb-2 opacity-50" />
              <span>Bandeja al día. No tienes correos pendientes de responder hoy.</span>
            </div>
          ) : (
            responderHoy.map((item) => (
              <div
                key={item.threadId}
                className="group relative rounded-lg border border-border bg-secondary/40 p-3.5 transition-colors hover:bg-secondary/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {item.from}
                      </span>
                      {item.fechaLimiteDetectada && (
                        <span className="inline-flex items-center gap-1 rounded border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                          <Clock className="h-2.5 w-2.5" />
                          Plazo: {item.fechaLimiteDetectada}
                        </span>
                      )}
                    </div>

                    <h4 className="mt-0.5 text-sm font-medium text-foreground truncate">
                      {item.subject}
                    </h4>

                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {item.resumenUnaLinea}
                    </p>
                  </div>

                  <a
                    href={item.gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    title="Abrir hilo en Gmail"
                  >
                    <span>Abrir</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Lista: Esperando Respuesta */}
      {connected !== false && !loading && activeTab === "esperando" && (
        <div className="mt-4 space-y-2.5">
          {esperandoRespuesta.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground">
              <Clock className="h-6 w-6 mb-2 opacity-50" />
              <span>No tienes hilos donde hayas enviado el último mensaje hace más de 3 días.</span>
            </div>
          ) : (
            esperandoRespuesta.map((item) => (
              <div
                key={item.threadId}
                className="group relative rounded-lg border border-border bg-secondary/40 p-3.5 transition-colors hover:bg-secondary/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      Para: {item.from}
                    </span>
                    <h4 className="mt-0.5 text-sm font-medium text-foreground truncate">
                      {item.subject}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {item.resumenUnaLinea}
                    </p>
                  </div>

                  <a
                    href={item.gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    title="Ver hilo en Gmail"
                  >
                    <span>Ver</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
