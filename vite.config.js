import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readUsers, writeUsers } from "./server/usersStore.js";

function attachUsersMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith("/api/users")) return next();

    if (req.method === "GET") {
      try {
        const data = await readUsers();
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
          const normalized = await writeUsers(incoming);
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
