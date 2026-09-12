import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "../services/prisma.js";

const router = Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  console.log("[/auth/google] request received");
  const { idToken } = req.body;

  try {
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: { email: payload.email, name: payload.name },
      create: { googleId: payload.sub, email: payload.email, name: payload.name },
    });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ user, token });
  } catch (err) {
    console.error("[/auth/google] failed:", err);
    res.status(401).json({ message: "Invalid Google token" });
  }
});

export default router;
