import { AlertTriangle, Info, ExternalLink, ShieldCheck } from "lucide-react";
import type { CrossAlert } from "@/lib/cross-analysis";

interface AlertasCruzadasProps {
  alertas: CrossAlert[];
}

export function AlertasCruzadas({ alertas }: AlertasCruzadasProps) {
  if (alertas.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Alertas Cruzadas
            </h2>
            <p className="text-xs text-muted-foreground">
              Sin conflictos detectados entre agenda, correos y tareas.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Alertas Cruzadas ({alertas.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Inconsistencias y puntos de atención detectados
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {alertas.map((alerta) => (
          <div
            key={alerta.id}
            className={`flex items-start justify-between gap-3 rounded-lg border p-3.5 transition-colors ${
              alerta.severidad === "advertencia"
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-secondary/50"
            }`}
          >
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              {alerta.severidad === "advertencia" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
              ) : (
                <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-foreground truncate">
                  {alerta.titulo}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {alerta.descripcion}
                </p>
              </div>
            </div>

            {alerta.accionUrl && (
              <a
                href={alerta.accionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <span>{alerta.accionTexto || "Revisar"}</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
