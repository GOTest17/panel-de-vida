"use client";

import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./theme-toggle";
import { LogOut, Calendar, Mail, CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface HeaderProps {
  userEmail?: string;
  onSendBriefNow?: () => void;
  isSendingBrief?: boolean;
}

export function Header({ userEmail, onSendBriefNow, isSendingBrief }: HeaderProps) {
  const router = useRouter();
  const todayStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-foreground text-background font-semibold text-xs">
            PV
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
              Panel de Vida
            </h1>
            <p className="text-xs capitalize text-muted-foreground">{todayStr}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {onSendBriefNow && (
            <button
              onClick={onSendBriefNow}
              disabled={isSendingBrief}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              title="Disparar envío del resumen matutino por correo ahora"
            >
              {isSendingBrief ? (
                <div className="h-3 w-3 animate-spin rounded-full border border-foreground border-t-transparent" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Enviar resumen ahora</span>
            </button>
          )}

          <ThemeToggle />

          <button
            onClick={handleSignOut}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={`Cerrar sesión (${userEmail || ""})`}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
