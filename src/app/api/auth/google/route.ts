import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthorizationUrl } from "@/lib/google/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://panel-de-vida-ten.vercel.app";

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=not_authenticated", appUrl)
    );
  }

  // Pasamos el user.id en el state para asegurar persistencia infalible en el callback
  const authUrl = getGoogleAuthorizationUrl(user.id);
  return NextResponse.redirect(authUrl);
}
