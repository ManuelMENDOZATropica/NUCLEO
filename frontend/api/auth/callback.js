import { createOAuthClient } from "../../lib/googleDrive.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Method Not Allowed" }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: `Google OAuth error: ${errorParam}` }));
    return;
  }

  if (!code) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "No se recibió el código de autenticación" }));
    return;
  }

  try {
    const oauth2Client = createOAuthClient({ withStoredCredentials: false });
    const { tokens } = await oauth2Client.getToken(code);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: "Autenticación correcta. Guarda el refresh token en tu .env.",
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        scopes: tokens.scope,
      })
    );
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: error?.message || "No se pudo completar la autenticación" }));
  }
}
