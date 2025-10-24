import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    picture: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["Admin", "Editor", "Viewer", "User"],
      default: "Viewer",
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
