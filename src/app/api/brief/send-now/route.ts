import { createClient } from "@/lib/supabase/server";
import { generateAndSendDailyBrief } from "@/lib/brief-orchestrator";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await generateAndSendDailyBrief({
      userId: user.id,
      userEmail: user.email,
      useAdmin: false,
    });

    return NextResponse.json({
      success: true,
      message: "Resumen matutino enviado exitosamente a tu correo.",
      result,
    });
  } catch (error: unknown) {
    console.error("Error sending brief manually:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error al enviar el resumen",
      },
      { status: 500 }
    );
  }
}
