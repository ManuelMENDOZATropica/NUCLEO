import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import licenseRoutes from "./routes/licenseRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

const rawAllowedOrigins =
  process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGINS || "";
const allowAllOrigins = rawAllowedOrigins.trim() === "" || rawAllowedOrigins.trim() === "*";
const allowedOrigins = allowAllOrigins
  ? []
  : rawAllowedOrigins
      .split(",")
      .map(origin => origin.trim())
      .filter(Boolean);

function originIsAllowed(origin) {
  if (!origin) return true;
  if (allowAllOrigins) return true;
  return allowedOrigins.includes(origin);
}

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && originIsAllowed(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
  } else if (!requestOrigin && allowAllOrigins) {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Vary", "Origin");
  const requestedHeaders = req.headers["access-control-request-headers"];
  res.header(
    "Access-Control-Allow-Headers",
    requestedHeaders || "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    if (requestOrigin && !originIsAllowed(requestOrigin)) {
      return res.sendStatus(403);
    }
    return res.sendStatus(204);
  }

  if (requestOrigin && !originIsAllowed(requestOrigin)) {
    return res.status(403).json({ message: "Origen no permitido" });
  }

  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || originIsAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origen no permitido por CORS"));
    },
    credentials: true,
  })
);

app.use((error, _req, res, next) => {
  if (error?.message === "Origen no permitido por CORS") {
    return res.status(403).json({ message: error.message });
  }
  next(error);
});
app.use(express.json({ limit: "12mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ message: "API de NUCLEO" });
});

app.use("/api/users", userRoutes);
app.use("/api/licenses", licenseRoutes);
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

async function start() {
  try {
    await connectDB(MONGO_URI);
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor", error.message);
    process.exit(1);
  }
}

start();
