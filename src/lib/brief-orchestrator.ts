import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDayAgenda } from "./google/calendar";
import { fetchRelevantGmailThreads } from "./google/gmail";
import { generateDailyBriefMarkdown } from "./anthropic/brief-writer";
import { computeCrossAnalysis, TaskItem } from "./cross-analysis";
import { getResendClient } from "./resend/client";
import { buildDailyBriefEmailHtml } from "./resend/email-template";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ClassifiedEmailView } from "@/app/api/emails/sync/route";

export async function generateAndSendDailyBrief({
  userId,
  userEmail,
  useAdmin = false,
}: {
  userId: string;
  userEmail: string;
  useAdmin?: boolean;
}) {
  const supabase = useAdmin ? createAdminClient() : await createServerSupabase();
  const today = new Date();
  const dateStr = format(today, "yyyy-MM-dd");
  const dateFormatted = format(today, "EEEE, d 'de' MMMM yyyy", { locale: es });
  const timeZone = process.env.USER_TIMEZONE || "America/Mexico_City";

  // 1. Obtener agenda del día
  let agenda;
  try {
    agenda = await getDayAgenda(userId, dateStr, timeZone, useAdmin);
  } catch (err) {
    console.warn("Could not fetch calendar for brief:", err);
    agenda = {
      date: dateStr,
      events: [],
      freeBlocks: [],
      totalMeetingMinutes: 0,
      totalFreeMinutes: 480,
    };
  }

  // 2. Obtener correos clasificados
  let classifiedEmails: ClassifiedEmailView[] = [];
  try {
    const prioritySenders = (process.env.PRIORITY_SENDERS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const threads = await fetchRelevantGmailThreads(userId, prioritySenders, useAdmin);
    const { data: classifications } = await supabase
      .from("email_classifications")
      .select("*")
      .eq("user_id", userId);

    const classMap = new Map((classifications || []).map((c) => [c.gmail_thread_id, c]));

    classifiedEmails = threads.map((t) => {
      const c = classMap.get(t.threadId);
      return {
        threadId: t.threadId,
        subject: t.subject,
        from: t.from,
        senderEmail: t.senderEmail,
        date: t.date,
        snippet: t.snippet,
        categoria: c?.categoria || "responder_hoy",
        resumenUnaLinea: c?.resumen_una_linea || t.snippet,
        fechaLimiteDetectada: c?.fecha_limite_detectada || null,
        gmailUrl: `https://mail.google.com/mail/u/0/#inbox/${t.threadId}`,
      };
    });
  } catch (err) {
    console.warn("Could not fetch emails for brief:", err);
  }

  // 3. Obtener tareas
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);

  const tasks: TaskItem[] = (tasksData as TaskItem[]) || [];

  // 4. Analizar alertas cruzadas
  const crossResult = computeCrossAnalysis({
    todayDate: today,
    events: agenda.events,
    freeBlocks: agenda.freeBlocks,
    emails: classifiedEmails,
    tasks,
  });

  // 5. Redactar el Resumen con Claude
  const markdownBrief = await generateDailyBriefMarkdown({
    dateFormatted,
    agenda,
    emails: classifiedEmails,
    tasks,
    alerts: crossResult.alertas,
  });

  // 6. Guardar en daily_briefs (upsert por fecha)
  const { data: briefRecord, error: briefErr } = await supabase
    .from("daily_briefs")
    .upsert(
      {
        user_id: userId,
        fecha: dateStr,
        contenido_markdown: markdownBrief,
        enviado: false,
      },
      { onConflict: "user_id,fecha" }
    )
    .select()
    .single();

  if (briefErr) {
    console.error("Error saving daily brief:", briefErr);
  }

  // 7. Enviar por correo vía Resend
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://panel-de-vida.vercel.app";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const emailHtml = buildDailyBriefEmailHtml({
    dateFormatted,
    markdownContent: markdownBrief,
    appUrl,
  });

  const sendResult = await resend.emails.send({
    from: `Panel de Vida <${fromEmail}>`,
    to: userEmail,
    subject: `☀️ Resumen Matutino: ${dateFormatted}`,
    html: emailHtml,
  });

  // Marcar como enviado
  if (briefRecord?.id) {
    await supabase
      .from("daily_briefs")
      .update({ enviado: true })
      .eq("id", briefRecord.id);
  }

  return {
    success: true,
    briefId: briefRecord?.id,
    sendResult,
    markdownBrief,
  };
}
