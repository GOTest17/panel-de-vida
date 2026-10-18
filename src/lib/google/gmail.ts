import { google } from "googleapis";
import { getAuthenticatedGoogleClient } from "./client";
import { subHours, subDays } from "date-fns";

export interface GmailThreadItem {
  threadId: string;
  id: string;
  subject: string;
  from: string;
  senderEmail: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  lastMessageFromMe: boolean;
  lastMessageDate: Date;
}

export async function fetchRelevantGmailThreads(
  userId: string,
  prioritySenders: string[] = [],
  useAdmin = false
): Promise<GmailThreadItem[]> {
  const oauth2Client = await getAuthenticatedGoogleClient(userId, useAdmin);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // 48 horas atrás en timestamp segundos para la consulta de Gmail
  const after48h = Math.floor(subHours(new Date(), 48).getTime() / 1000);

  // Armar query: hilos de las últimas 48h o remitentes prioritarios
  let query = `after:${after48h}`;
  if (prioritySenders.length > 0) {
    const priorityQuery = prioritySenders.map((s) => `from:${s.trim()}`).join(" OR ");
    query = `(${query}) OR (${priorityQuery})`;
  }

  const listRes = await gmail.users.threads.list({
    userId: "me",
    q: query,
    maxResults: 25,
  });

  const threads = listRes.data.threads || [];
  const results: GmailThreadItem[] = [];

  for (const t of threads) {
    if (!t.id) continue;

    try {
      const threadDetail = await gmail.users.threads.get({
        userId: "me",
        id: t.id,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const messages = threadDetail.data.messages || [];
      if (messages.length === 0) continue;

      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];

      let subject = "(Sin asunto)";
      let from = "Desconocido";
      let dateStr = "";

      for (const h of firstMessage.payload?.headers || []) {
        if (h.name?.toLowerCase() === "subject") subject = h.value || subject;
        if (h.name?.toLowerCase() === "from") from = h.value || from;
        if (h.name?.toLowerCase() === "date") dateStr = h.value || dateStr;
      }

      // Extraer email limpio
      const emailMatch = from.match(/<([^>]+)>/);
      const senderEmail = emailMatch ? emailMatch[1].toLowerCase() : from.toLowerCase();

      // Verificar si el último mensaje fue enviado por el usuario
      const lastHeaders = lastMessage.payload?.headers || [];
      const lastFromHeader = lastHeaders.find((h) => h.name?.toLowerCase() === "from")?.value || "";
      const isLastFromMe = lastMessage.labelIds?.includes("SENT") || false;

      const isUnread = messages.some((m) => m.labelIds?.includes("UNREAD"));
      const lastDate = lastMessage.internalDate
        ? new Date(parseInt(lastMessage.internalDate))
        : new Date();

      results.push({
        threadId: t.id,
        id: firstMessage.id || t.id,
        subject,
        from,
        senderEmail,
        date: dateStr,
        snippet: firstMessage.snippet || "",
        isUnread,
        lastMessageFromMe: isLastFromMe,
        lastMessageDate: lastDate,
      });
    } catch (err) {
      console.error(`Error reading thread ${t.id}:`, err);
    }
  }

  return results;
}
