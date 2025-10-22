import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "public/json-db/users.json");
const DEFAULT_ADMIN_EMAIL = "manuel@tropica.me";

async function ensureDatabase() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    if (Array.isArray(parsed?.users)) {
      return normalizeUsers(parsed.users);
    }
    return normalizeUsers([]);
  } catch (error) {
    if (error?.code === "ENOENT") {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      const defaults = normalizeUsers([]);
      await writeDatabase(defaults);
      return defaults;
    }
    throw error;
  }
}

function normalizeUsers(users) {
  const seen = new Map();
  const normalized = Array.isArray(users) ? users : [];
  for (const entry of normalized) {
    if (!entry?.email) continue;
    const email = String(entry.email).toLowerCase();
    if (!seen.has(email)) {
      seen.set(email, {
        email,
        name: entry.name || "",
        role: email === DEFAULT_ADMIN_EMAIL ? "admin" : (entry.role || "viewer"),
      });
    }
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

async function writeDatabase(data) {
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(DB_PATH, `${payload}\n`, "utf-8");
}

function attachUsersMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith("/api/users")) return next();

    if (req.method === "GET") {
      try {
        const data = await ensureDatabase();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(data));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ message: "Error al leer usuarios", details: error.message }));
      }
      return;
    }

    if (req.method === "PUT") {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", async () => {
        try {
          const parsed = JSON.parse(body || "{}");
          const incoming = Array.isArray(parsed?.users) ? parsed.users : [];
          const normalized = normalizeUsers(incoming);
          await writeDatabase(normalized);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(normalized));
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ message: "Error al guardar usuarios", details: error.message }));
        }
      });
      return;
    }

    res.statusCode = 405;
    res.end();
  });
}

function createUsersApiPlugin() {
  return {
    name: "users-api-plugin",
    configureServer(server) {
      attachUsersMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachUsersMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), createUsersApiPlugin()],
});
