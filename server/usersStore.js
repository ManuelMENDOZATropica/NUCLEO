import { promises as fs } from "fs";
import path from "path";

const DEFAULT_ADMIN_EMAIL = "manuel@tropica.me";
const DB_PATH = path.resolve(process.cwd(), "public/json-db/users.json");

async function ensureDirectory() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
}

function normalizeUsers(users) {
  const seen = new Map();
  const list = Array.isArray(users) ? users : [];

  for (const entry of list) {
    if (!entry?.email) continue;
    const email = String(entry.email).toLowerCase();
    if (seen.has(email)) continue;
    seen.set(email, {
      email,
      name: entry.name || "",
      role: email === DEFAULT_ADMIN_EMAIL ? "admin" : entry.role || "viewer",
    });
  }

  if (!seen.has(DEFAULT_ADMIN_EMAIL)) {
    seen.set(DEFAULT_ADMIN_EMAIL, {
      email: DEFAULT_ADMIN_EMAIL,
      name: "Manuel",
      role: "admin",
    });
  }

  return { users: Array.from(seen.values()) };
}

async function readUsers() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    return normalizeUsers(parsed?.users);
  } catch (error) {
    if (error?.code === "ENOENT") {
      const defaults = normalizeUsers([]);
      await writeNormalized(defaults);
      return defaults;
    }
    throw error;
  }
}

async function writeNormalized(data) {
  await ensureDirectory();
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(DB_PATH, `${payload}\n`, "utf-8");
}

async function writeUsers(users) {
  const normalized = normalizeUsers(users);
  await writeNormalized(normalized);
  return normalized;
}

export { DEFAULT_ADMIN_EMAIL, DB_PATH, normalizeUsers, readUsers, writeUsers };
