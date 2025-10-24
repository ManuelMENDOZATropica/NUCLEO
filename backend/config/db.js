import mongoose from "mongoose";

export async function connectDB(uri) {
  if (!uri) {
    throw new Error("MongoDB connection string is missing");
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
}
