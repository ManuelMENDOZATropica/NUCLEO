import mongoose from "mongoose";

const licenseSchema = new mongoose.Schema(
  {
    categoria: {
      type: String,
      required: true,
      trim: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    licencia: {
      type: String,
      trim: true,
      default: "",
    },
    enlace: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      trim: true,
      default: "",
    },
    subHerramientas: {
      type: [String],
      default: [],
    },
    usos: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

export default mongoose.model("License", licenseSchema);
