import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: integrations, error } = await supabase
      .from("integrations")
      .select("proveedor, ultima_sincronizacion, created_at")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const googleIntegration = integrations?.find((i) => i.proveedor === "google");

    return NextResponse.json({
      google: {
        connected: !!googleIntegration,
        lastSync: googleIntegration?.ultima_sincronizacion || null,
        createdAt: googleIntegration?.created_at || null,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error reading integration status" },
      { status: 500 }
    );
  }
}
