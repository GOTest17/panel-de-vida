import { createClient } from "@/lib/supabase/server";
import { getGoogleAuthorizationUrl } from "@/lib/google/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=not_authenticated", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }

  const authUrl = getGoogleAuthorizationUrl(user.id);
  return NextResponse.redirect(authUrl);
}
