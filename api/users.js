import { readUsers, writeUsers } from "../server/usersStore.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    try {
      const data = await readUsers();
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      res.end(JSON.stringify(data));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ message: "Error al leer usuarios", details: error.message }));
    }
    return;
  }

  if (req.method === "PUT") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const parsed = JSON.parse(body || "{}");
        const incoming = Array.isArray(parsed?.users) ? parsed.users : [];
        const normalized = await writeUsers(incoming);
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 200;
        res.end(JSON.stringify(normalized));
      } catch (error) {
        const status = error instanceof SyntaxError ? 400 : 500;
        res.statusCode = status;
        res.end(JSON.stringify({ message: "Error al guardar usuarios", details: error.message }));
      }
    });

    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ message: "Método no permitido" }));
}
