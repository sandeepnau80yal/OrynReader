import { Router } from "express";
import { verifyJwt } from "../middleware/verifyJwt.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { prisma } from "../services/prisma.js";
import { keyFor, getUploadUrl, getReadUrl, deleteObject } from "../services/s3.js";

const router = Router();
router.use(verifyJwt);

router.get("/", asyncHandler(async (req, res) => {
  const books = await prisma.book.findMany({ where: { userId: req.user.id } });
  res.json(await Promise.all(books.map(async (book) => ({
    ...book,
    coverUrl: book.coverS3Key ? await getReadUrl(book.coverS3Key) : null,
  }))));
}));

router.post("/upload-url", asyncHandler(async (req, res) => {
  const { filename, contentType } = req.body;
  const key = keyFor(req.user.id, filename);
  const uploadUrl = await getUploadUrl(key, contentType);
  res.json({ uploadUrl, key });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { title, author, format, s3Key, coverS3Key } = req.body;
  const book = await prisma.book.create({
    data: { userId: req.user.id, title, author, format, s3Key, coverS3Key: coverS3Key || null },
  });
  res.status(201).json(book);
}));

// Now also returns format, so the frontend knows whether to render the epub
// or pdf viewer without a second round trip.
router.get("/:id/read-url", asyncHandler(async (req, res) => {
  const book = await prisma.book.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!book) return res.status(404).json({ message: "Book not found" });
  const url = await getReadUrl(book.s3Key);
  res.json({ url, format: book.format, title: book.title });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const book = await prisma.book.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!book) return res.status(404).json({ message: "Book not found" });
  await deleteObject(book.s3Key);
  if (book.coverS3Key) await deleteObject(book.coverS3Key);
  await prisma.readingProgress.deleteMany({ where: { bookId: book.id } });
  await prisma.book.delete({ where: { id: book.id } });
  res.status(204).end();
}));

router.get("/:id/progress", asyncHandler(async (req, res) => {
  const book = await prisma.book.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!book) return res.status(404).json({ message: "Book not found" });
  const progress = await prisma.readingProgress.findUnique({ where: { bookId: book.id } });
  res.json(progress);
}));

router.put("/:id/progress", asyncHandler(async (req, res) => {
  const { location } = req.body;
  const book = await prisma.book.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!book) return res.status(404).json({ message: "Book not found" });

  const progress = await prisma.readingProgress.upsert({
    where: { bookId: book.id },
    update: { location },
    create: { bookId: book.id, location },
  });
  res.json(progress);
}));

export default router;
