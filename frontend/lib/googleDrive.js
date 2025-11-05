import { google } from "googleapis";
import { Readable } from "node:stream";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function createOAuthClient(options = {}) {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = requireEnv("GOOGLE_REDIRECT_URI");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (options?.withStoredCredentials !== false) {
    if (!refreshToken) {
      throw new Error("GOOGLE_REFRESH_TOKEN is not configured");
    }
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  } else if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }
  return oauth2Client;
}

export function createDriveClient() {
  const auth = createOAuthClient();
  return google.drive({ version: "v3", auth });
}

export function sanitizeDriveName(name) {
  if (!name || typeof name !== "string") {
    return "General";
  }
  return name
    .replace(/[\\/:*?"<>|#]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "General";
}

export async function ensureDriveFolder(drive, parentId, folderName) {
  const name = sanitizeDriveName(folderName);
  const query = ["mimeType = 'application/vnd.google-apps.folder'", "trashed = false", `name = '${name.replace(/'/g, "\\'")}'`];
  if (parentId) {
    query.push(`'${parentId}' in parents`);
  }

  const existing = await drive.files.list({
    q: query.join(" and "),
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 1,
  });

  if (existing.data.files?.length) {
    return existing.data.files[0];
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id, name",
  });

  return created.data;
}

export async function uploadOrUpdateFile(drive, { name, mimeType, data, parents = [] }) {
  const sanitized = sanitizeDriveName(name);
  const queryParts = [
    "trashed = false",
    `name = '${sanitized.replace(/'/g, "\\'")}'`,
  ];
  for (const parent of parents) {
    queryParts.push(`'${parent}' in parents`);
  }

  const existing = await drive.files.list({
    q: queryParts.join(" and "),
    fields: "files(id, parents, webViewLink)",
    spaces: "drive",
    pageSize: 1,
  });

  const media = {
    mimeType,
    body: Readable.from(data),
  };

  if (existing.data.files?.length) {
    const fileId = existing.data.files[0].id;
    const updated = await drive.files.update({
      fileId,
      media,
      fields: "id, webViewLink, parents",
    });
    return updated.data;
  }

  const created = await drive.files.create({
    requestBody: {
      name: sanitized,
      mimeType,
      parents,
    },
    media,
    fields: "id, webViewLink, parents",
  });

  return created.data;
}

export async function ensurePublicPermission(drive, fileId) {
  await drive.permissions.create({
    fileId,
    requestBody: {
      type: "anyone",
      role: "reader",
    },
    fields: "id",
  }).catch(error => {
    if (error?.errors?.some(item => item.reason === "alreadyExists")) {
      return;
    }
    throw error;
  });

  const file = await drive.files.get({ fileId, fields: "id, webViewLink" });
  return file.data;
}
