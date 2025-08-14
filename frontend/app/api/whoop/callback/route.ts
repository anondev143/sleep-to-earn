import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return new NextResponse(`WHOOP OAuth error: ${error}`, { status: 400 });
  }
  if (!code) {
    return new NextResponse("Missing code", { status: 400 });
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_URL;
  
  const redirectUri = appUrl + "/api/whoop/callback";
  const whoopHost = process.env.WHOOP_API_HOSTNAME ?? "https://api.prod.whoop.com";

  if (!clientId || !clientSecret || !redirectUri) {
    return new NextResponse("WHOOP OAuth not configured", { status: 500 });
  }

  // Validate OAuth state
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("whoop_oauth_state")?.value;
  if (!returnedState || !expectedState || returnedState !== expectedState) {
    return new NextResponse("Invalid OAuth state", { status: 400 });
  }
  cookieStore.delete("whoop_oauth_state");

  const tokenUrl = new URL("/oauth/oauth2/token", whoopHost).toString();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });


  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return new NextResponse(`Token exchange failed: ${text}`, { status: 502 });
  }
  const tokenJson = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    scope: string;
    expires_in: number;
    token_type: string;
  };

  // Optionally fetch basic profile to get the WHOOP user id
  const profileRes = await fetch(new URL("/developer/v2/user/profile/basic", whoopHost).toString(), {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    cache: "no-store",
  });


  let whoopUserId: number | undefined;
  if (profileRes.ok) {
    const profile = (await profileRes.json()) as { user_id?: number };
    whoopUserId = profile.user_id;
  }


 
  // Call backend to register the user with tokens (simple POST; adjust path if needed)
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    const wallet = (await cookies()).get("whoop_wallet")?.value;
    await fetch(`${backendUrl}/api/whoop/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whoopUserId,
        accessToken: tokenJson.access_token,
        refreshToken: tokenJson.refresh_token,
        expiresIn: tokenJson.expires_in,
        walletAddress: wallet,
      }),
    }).catch((e) => console.error(e));
  }

  // Redirect back to app home after connect
  const store = await cookies();
  store.delete("whoop_wallet");
  const redirectBack = appUrl ?? "/";
  return NextResponse.redirect(redirectBack);
}


