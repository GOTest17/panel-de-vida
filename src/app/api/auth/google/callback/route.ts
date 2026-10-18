import { createOAuth2Client } from "@/lib/google/client";
import { encrypt } from "@/lib/security/crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state"); // Contiene el user.id enviado al iniciar el flujo

  if (error || !code) {
    console.error("OAuth error received from Google:", error);
    return NextResponse.redirect(`${origin}/?google_error=${error || "no_code"}`);
  }

  try {
    // 1. Obtener el usuario autenticado (por cookie o por el state firmado/enviado)
    const supabase = await createClient();
    const {
      data: { user: cookieUser },
    } = await supabase.auth.getUser();

    let targetUserId = cookieUser?.id;

    // Si la cookie no vino por ser un cross-site redirect desde Google, usamos el state
    if (!targetUserId && state) {
      targetUserId = state;
    }

    if (!targetUserId) {
      console.error("No user found in session or state during Google callback");
      return NextResponse.redirect(`${origin}/login?error=unauthorized`);
    }

    // 2. Intercambiar el código por tokens en Google
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const supabaseAdmin = createAdminClient();

    if (!tokens.refresh_token) {
      console.warn("No refresh_token returned by Google. Checking existing integration...");
      // Si Google no devolvió refresh_token (porque ya se otorgó antes), verificar si ya tenemos uno
      const { data: existing } = await supabaseAdmin
        .from("integrations")
        .select("refresh_token_cifrado")
        .eq("user_id", targetUserId)
        .eq("proveedor", "google")
        .single();

      if (!existing) {
        // Redirigir solicitando prompt consent explícito
        return NextResponse.redirect(
          `${origin}/api/auth/google?prompt=consent`
        );
      } else {
        // Actualizar última sincronización
        await supabaseAdmin
          .from("integrations")
          .update({ ultima_sincronizacion: new Date().toISOString() })
          .eq("user_id", targetUserId)
          .eq("proveedor", "google");
      }
    } else {
      // 3. Cifrar el refresh_token y guardarlo de forma segura con el cliente admin
      const encryptedRefreshToken = encrypt(tokens.refresh_token);

      const { error: upsertError } = await supabaseAdmin
        .from("integrations")
        .upsert(
          {
            user_id: targetUserId,
            proveedor: "google",
            refresh_token_cifrado: encryptedRefreshToken,
            ultima_sincronizacion: new Date().toISOString(),
          },
          {
            onConflict: "user_id,proveedor",
          }
        );

      if (upsertError) {
        console.error("Error upserting integration in Supabase:", upsertError);
        return NextResponse.redirect(`${origin}/?google_error=db_error`);
      }
    }

    return NextResponse.redirect(`${origin}/?connected=google`);
  } catch (err: unknown) {
    console.error("Error in google oauth callback:", err);
    return NextResponse.redirect(`${origin}/?google_error=exchange_failed`);
  }
}
