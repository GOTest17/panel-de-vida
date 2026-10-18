import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/security/crypto";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];

export function createOAuth2Client(): OAuth2Client {
  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${origin}/api/auth/google/callback`;

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

export function getGoogleAuthorizationUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    include_granted_scopes: true,
    state,
  });
}

/**
 * Obtiene un cliente autenticado de Google para un usuario específico.
 * Renueva el token automáticamente antes de realizar peticiones.
 */
export async function getAuthenticatedGoogleClient(
  userId: string,
  useAdmin = false
): Promise<OAuth2Client> {
  const supabase = useAdmin ? createAdminClient() : await createServerSupabase();

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("refresh_token_cifrado, ultima_sincronizacion")
    .eq("user_id", userId)
    .eq("proveedor", "google")
    .single();

  if (error || !integration?.refresh_token_cifrado) {
    throw new Error("No se encontró la integración de Google o el token no existe");
  }

  const refreshToken = decrypt(integration.refresh_token_cifrado);
  const oauth2Client = createOAuth2Client();

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Listener para almacenar un nuevo refresh token si Google emite una rotación
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      const encrypted = encrypt(tokens.refresh_token);
      await supabase
        .from("integrations")
        .update({
          refresh_token_cifrado: encrypted,
          ultima_sincronizacion: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("proveedor", "google");
    }
  });

  return oauth2Client;
}
