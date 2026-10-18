import { createClient } from "@/lib/supabase/server";
import { parseTaskNaturalLanguage } from "@/lib/anthropic/task-parser";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text } = await request.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
    }

    const userTimeZone = process.env.USER_TIMEZONE || "America/Mexico_City";
    const parsed = await parseTaskNaturalLanguage(text.trim(), userTimeZone);

    return NextResponse.json({ parsed });
  } catch (err: unknown) {
    console.error("Error parsing task:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al procesar la tarea" },
      { status: 500 }
    );
  }
}
