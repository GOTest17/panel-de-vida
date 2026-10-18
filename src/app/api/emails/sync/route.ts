import { createClient } from "@/lib/supabase/server";
import { fetchRelevantGmailThreads, GmailThreadItem } from "@/lib/google/gmail";
import { classifyEmailThreads } from "@/lib/anthropic/classifier";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ClassifiedEmailView {
  threadId: string;
  subject: string;
  from: string;
  senderEmail: string;
  date: string;
  snippet: string;
  categoria: "responder_hoy" | "esperando_respuesta" | "informativo";
  resumenUnaLinea: string;
  fechaLimiteDetectada?: string | null;
  gmailUrl: string;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Comprobar si Google está conectado
    const { data: integration } = await supabase
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("proveedor", "google")
      .single();

    if (!integration) {
      return NextResponse.json({
        connected: false,
        message: "Gmail no está conectado",
      });
    }

    const prioritySenders = (process.env.PRIORITY_SENDERS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // 1. Obtener hilos relevantes de Gmail
    const threads = await fetchRelevantGmailThreads(user.id, prioritySenders);
    if (threads.length === 0) {
      return NextResponse.json({
        connected: true,
        responderHoy: [],
        esperandoRespuesta: [],
        informativoCount: 0,
      });
    }

    const threadIds = threads.map((t) => t.threadId);

    // 2. Buscar clasificaciones previas en Supabase para no gastar tokens
    const { data: existingClassifications } = await supabase
      .from("email_classifications")
      .select("*")
      .eq("user_id", user.id)
      .in("gmail_thread_id", threadIds);

    const classificationMap = new Map<string, any>();
    if (existingClassifications) {
      existingClassifications.forEach((c) => {
        classificationMap.set(c.gmail_thread_id, c);
      });
    }

    // Hilos que necesitan ser clasificados por Anthropic
    const unclassifiedThreads = threads.filter(
      (t) => !classificationMap.has(t.threadId)
    );

    if (unclassifiedThreads.length > 0) {
      try {
        const newClassifications = await classifyEmailThreads(
          unclassifiedThreads,
          prioritySenders
        );

        // Guardar en Supabase
        const rowsToInsert = newClassifications.map((nc) => ({
          user_id: user.id,
          gmail_thread_id: nc.gmailThreadId,
          categoria: nc.categoria,
          resumen_una_linea: nc.resumenUnaLinea,
          fecha_limite_detectada: nc.fechaLimiteDetectada,
          updated_at: new Date().toISOString(),
        }));

        const { error: upsertErr } = await supabase
          .from("email_classifications")
          .upsert(rowsToInsert, { onConflict: "user_id,gmail_thread_id" });

        if (!upsertErr) {
          rowsToInsert.forEach((r) => {
            classificationMap.set(r.gmail_thread_id, r);
          });
        }
      } catch (classifyErr) {
        console.error("Error classifying threads with Claude:", classifyErr);
      }
    }

    // 3. Agrupar resultados
    const responderHoy: ClassifiedEmailView[] = [];
    const esperandoRespuesta: ClassifiedEmailView[] = [];
    let informativoCount = 0;

    for (const t of threads) {
      const classification = classificationMap.get(t.threadId);
      const categoria = classification?.categoria || "responder_hoy";
      const resumen = classification?.resumen_una_linea || t.snippet;
      const fechaLimite = classification?.fecha_limite_detectada || null;

      const item: ClassifiedEmailView = {
        threadId: t.threadId,
        subject: t.subject,
        from: t.from,
        senderEmail: t.senderEmail,
        date: t.date,
        snippet: t.snippet,
        categoria,
        resumenUnaLinea: resumen,
        fechaLimiteDetectada: fechaLimite,
        gmailUrl: `https://mail.google.com/mail/u/0/#inbox/${t.threadId}`,
      };

      if (categoria === "responder_hoy") {
        responderHoy.push(item);
      } else if (categoria === "esperando_respuesta") {
        esperandoRespuesta.push(item);
      } else {
        informativoCount++;
      }
    }

    return NextResponse.json({
      connected: true,
      responderHoy,
      esperandoRespuesta,
      informativoCount,
    });
  } catch (error: unknown) {
    console.error("Error syncing emails:", error);
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Error al sincronizar correos",
      },
      { status: 500 }
    );
  }
}
