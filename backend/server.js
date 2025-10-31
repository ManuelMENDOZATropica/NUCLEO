import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import licenseRoutes from "./routes/licenseRoutes.js";
import briefBuddyRoutes from "./routes/briefBuddyRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ message: "API de NUCLEO" });
});

app.use("/api/users", userRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/brief-buddy", briefBuddyRoutes);

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
