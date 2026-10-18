import { Sparkles } from "lucide-react";

interface HoyEnUnaLineaProps {
  frase: string;
}

export function HoyEnUnaLinea({ frase }: HoyEnUnaLineaProps) {
  return (
    <section className="rounded-xl border border-border bg-gradient-to-r from-secondary/80 to-secondary/30 p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hoy en una línea
          </h2>
          <p className="mt-1 text-sm sm:text-base font-medium text-foreground leading-relaxed">
            {frase}
          </p>
        </div>
      </div>
    </section>
  );
}
