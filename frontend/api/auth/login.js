import { createOAuthClient } from "../../lib/googleDrive.js";

export const config = {
  runtime: "nodejs",
};

const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Method Not Allowed" }));
    return;
  }

  try {
    const oauth2Client = createOAuthClient({ withStoredCredentials: false });
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: DRIVE_SCOPES,
      prompt: "consent",
    });

    res.writeHead(302, { Location: url });
    res.end();
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: error?.message || "No se pudo iniciar la autenticación" }));
  }
}
