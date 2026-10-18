import { getAnthropicClient, getAnthropicModel } from "./client";

export interface ParsedTask {
  titulo: string;
  fecha_limite: string | null; // ISO string
  prioridad: "alta" | "media" | "baja";
  proyecto: string | null;
}

export async function parseTaskNaturalLanguage(
  input: string,
  userTimeZone = "America/Mexico_City"
): Promise<ParsedTask> {
  const anthropic = getAnthropicClient();
  const model = getAnthropicModel();

  const now = new Date();
  const currentDateStr = now.toISOString();

  const prompt = `Analiza la siguiente entrada de lenguaje natural para crear una tarea y extrae los campos estructurados.
Entrada del usuario: "${input}"
Fecha actual de referencia: ${currentDateStr} (${userTimeZone})

Reglas:
1. "titulo": Título limpio de la tarea sin fechas relativas (ej. si dice "Pagar la luz el viernes", el título es "Pagar la luz").
2. "fecha_limite": Fecha y hora ISO (YYYY-MM-DDTHH:mm:ss.sssZ) calculada a partir de expresiones como "mañana", "el viernes", "en 2 horas", "el 25 de octubre a las 5pm". Si no se menciona ninguna fecha o plazo, debe ser null.
3. "prioridad": "alta" si contiene palabras como urgente, ya, prioridad, asap, crítico; "baja" si dice opcional, cuando se pueda, algún día; de lo contrario "media".
4. "proyecto": Nombre de proyecto si se menciona con almohadilla o contexto (ej. "#trabajo", "en el proyecto web"), o null.

Devuelve ÚNICAMENTE un JSON con:
{
  "titulo": "string",
  "fecha_limite": "ISO-8601-string" | null,
  "prioridad": "alta" | "media" | "baja",
  "proyecto": "string" | null
}`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 500,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      titulo: input,
      fecha_limite: null,
      prioridad: "media",
      proyecto: null,
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    titulo: parsed.titulo || input,
    fecha_limite: parsed.fecha_limite || null,
    prioridad: ["alta", "media", "baja"].includes(parsed.prioridad)
      ? parsed.prioridad
      : "media",
    proyecto: parsed.proyecto || null,
  };
}
