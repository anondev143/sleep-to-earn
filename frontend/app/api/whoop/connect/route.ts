import crypto from "crypto";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_URL;
  const redirectUri = appUrl ? `${appUrl}/api/whoop/callback` : undefined;
  const scope = process.env.WHOOP_OAUTH_SCOPE ?? "offline read:profile read:sleep read:recovery";
  const whoopHost = process.env.WHOOP_API_HOSTNAME ?? "https://api.prod.whoop.com";

  if (!clientId || !redirectUri) {
    return new NextResponse("WHOOP OAuth not configured", { status: 500 });
  }

  const authUrl = new URL("/oauth/oauth2/auth", whoopHost);
  authUrl.searchParams.set("client_id", String(clientId));
  authUrl.searchParams.set("redirect_uri", String(redirectUri));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scope);
  // CSRF protection per OAuth best practices
  const state = crypto.randomBytes(16).toString("hex");
  authUrl.searchParams.set("state", state);
  const res = NextResponse.redirect(authUrl.toString());
  // Persist wallet address from query if provided
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  res.cookies.set("whoop_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/whoop/callback",
    maxAge: 10 * 60,
  });
  if (wallet) {
    res.cookies.set("whoop_wallet", wallet, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/whoop/callback",
      maxAge: 10 * 60,
    });
  }
  return res;
}


