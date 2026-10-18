import { createOAuth2Client } from "@/lib/google/client";
import { encrypt } from "@/lib/security/crypto";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?google_error=${error || "no_code"}`);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=unauthorized`);
    }

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Si no devolvió refresh_token, revisar si ya existe uno guardado o forzar prompt
      const { data: existing } = await supabase
        .from("integrations")
        .select("refresh_token_cifrado")
        .eq("user_id", user.id)
        .eq("proveedor", "google")
        .single();

      if (!existing) {
        return NextResponse.redirect(`${origin}/?google_error=missing_refresh_token`);
      }
    } else {
      const encryptedRefreshToken = encrypt(tokens.refresh_token);

      const { error: upsertError } = await supabase
        .from("integrations")
        .upsert(
          {
            user_id: user.id,
            proveedor: "google",
            refresh_token_cifrado: encryptedRefreshToken,
            ultima_sincronizacion: new Date().toISOString(),
          },
          {
            onConflict: "user_id,proveedor",
          }
        );

      if (upsertError) {
        console.error("Error upserting integration:", upsertError);
        return NextResponse.redirect(`${origin}/?google_error=db_error`);
      }
    }

    return NextResponse.redirect(`${origin}/?connected=google`);
  } catch (err: unknown) {
    console.error("Error in google oauth callback:", err);
    return NextResponse.redirect(`${origin}/?google_error=exchange_failed`);
  }
}
