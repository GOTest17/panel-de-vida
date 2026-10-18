"use client";

import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccessDeniedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Acceso Denegado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Esta aplicación es de uso personal y privado. La cuenta de Google con la que has iniciado sesión no está autorizada para acceder a este panel.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Cerrar sesión e intentar con otra cuenta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
