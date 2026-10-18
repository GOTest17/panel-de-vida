import { createClient } from "@/lib/supabase/server";
import { getDayAgenda } from "@/lib/google/calendar";
import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
    const timeZone = process.env.USER_TIMEZONE || "America/Mexico_City";

    // Verificar si el usuario tiene la integración activa
    const { data: integration } = await supabase
      .from("integrations")
      .select("id, ultima_sincronizacion")
      .eq("user_id", user.id)
      .eq("proveedor", "google")
      .single();

    if (!integration) {
      return NextResponse.json({
        connected: false,
        message: "Google Calendar no está conectado",
      });
    }

    const agenda = await getDayAgenda(user.id, dateParam, timeZone);

    return NextResponse.json({
      connected: true,
      lastSync: integration.ultima_sincronizacion,
      agenda,
    });
  } catch (error: unknown) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Error al obtener la agenda",
      },
      { status: 500 }
    );
  }
}
