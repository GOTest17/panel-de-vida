import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndSendDailyBrief } from "@/lib/brief-orchestrator";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  // Validación estricta del CRON_SECRET
  if (
    !expectedSecret ||
    authHeader !== `Bearer ${expectedSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const targetEmail = process.env.ALLOWED_USER_EMAIL?.trim().toLowerCase();

    if (!targetEmail) {
      return NextResponse.json(
        { error: "ALLOWED_USER_EMAIL not configured" },
        { status: 500 }
      );
    }

    // Buscar el usuario por email usando la API de Auth Admin
    const { data: usersData, error: userError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (userError || !usersData?.users) {
      return NextResponse.json(
        { error: "Error fetching user from Supabase admin" },
        { status: 500 }
      );
    }

    const targetUser = usersData.users.find(
      (u) => u.email?.trim().toLowerCase() === targetEmail
    );

    if (!targetUser) {
      return NextResponse.json(
        { error: `User with email ${targetEmail} not found in Supabase Auth` },
        { status: 404 }
      );
    }

    // Ejecutar la orquestación del resumen matutino
    const result = await generateAndSendDailyBrief({
      userId: targetUser.id,
      userEmail: targetEmail,
      useAdmin: true,
    });

    return NextResponse.json({
      success: true,
      message: "Resumen matutino generado y enviado exitosamente",
      result,
    });
  } catch (error: unknown) {
    console.error("Error executing daily brief cron:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error running cron job",
      },
      { status: 500 }
    );
  }
}
