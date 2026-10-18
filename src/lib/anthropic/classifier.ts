import { getAnthropicClient, getAnthropicModel } from "./client";
import { GmailThreadItem } from "../google/gmail";
import { differenceInDays } from "date-fns";

export interface EmailClassificationResult {
  gmailThreadId: string;
  categoria: "responder_hoy" | "esperando_respuesta" | "informativo";
  resumenUnaLinea: string;
  fechaLimiteDetectada?: string | null;
}

export async function classifyEmailThreads(
  threads: GmailThreadItem[],
  prioritySenders: string[] = []
): Promise<EmailClassificationResult[]> {
  if (threads.length === 0) return [];

  const anthropic = getAnthropicClient();
  const model = getAnthropicModel();

  // Preparar payload para Claude
  const itemsToClassify = threads.map((t) => {
    const isPriority = prioritySenders.some((p) =>
      t.senderEmail.toLowerCase().includes(p.toLowerCase())
    );
    const daysSinceLastMessage = differenceInDays(new Date(), t.lastMessageDate);

    return {
      threadId: t.threadId,
      subject: t.subject,
      from: t.from,
      senderEmail: t.senderEmail,
      snippet: t.snippet,
      isPrioritySender: isPriority,
      isLastMessageFromMe: t.lastMessageFromMe,
      daysSinceLastMessage,
    };
  });

  const prompt = `Eres un asistente ejecutivo de alta precisión. Analiza y clasifica la siguiente lista de correos electrónicos.
Para cada correo, debes determinar:
1. categoria:
   - "responder_hoy": Si contiene una pregunta directa, una solicitud con fecha límite, o si proviene de un remitente prioritario (isPrioritySender = true).
   - "esperando_respuesta": Si el usuario envió el último mensaje (isLastMessageFromMe = true) hace más de 3 días (daysSinceLastMessage >= 3) y espera respuesta de la otra parte.
   - "informativo": Si es un boletín, newsletter, notificación automatizada, confirmación de pedido o recibo informativo.
2. resumenUnaLinea: Una sola frase concisa en español explicando qué requiere o de qué trata el correo.
3. fechaLimiteDetectada: Si en el asunto o snippet se menciona una fecha o plazo específico ("para el viernes", "mañana", "25 de octubre"), infiere la fecha aproximada en formato ISO (YYYY-MM-DD), o null si no hay fecha.

Fecha actual de referencia: ${new Date().toISOString().split("T")[0]}

Lista de correos a clasificar:
${JSON.stringify(itemsToClassify, null, 2)}

Devuelve ÚNICAMENTE un array JSON válido con la siguiente estructura:
[
  {
    "threadId": "string",
    "categoria": "responder_hoy" | "esperando_respuesta" | "informativo",
    "resumenUnaLinea": "string",
    "fechaLimiteDetectada": "YYYY-MM-DD" | null
  }
]`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2500,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extraer JSON de la respuesta
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("No se pudo interpretar el formato JSON de la respuesta de Claude");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return parsed.map((item: any) => ({
    gmailThreadId: item.threadId,
    categoria: item.categoria,
    resumenUnaLinea: item.resumenUnaLinea,
    fechaLimiteDetectada: item.fechaLimiteDetectada || null,
  }));
}
