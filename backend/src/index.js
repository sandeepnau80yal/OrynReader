import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import bookRoutes from "./routes/books.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/books", bookRoutes);

// Catches anything asyncHandler forwards via next(err) - logs the full error
// server-side and sends the frontend a real error message instead of a hang.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
}

export default app;
