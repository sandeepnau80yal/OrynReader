import { useState, useEffect, useCallback } from "react";
import ePub from "epubjs";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { getBooks, getReadUrl, getUploadUrl, createBook, deleteBook } from "../api/books";
import { getProgress } from "../api/progress";
import { useAuth } from "../context/AuthContext";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

async function getPdfThumbnail(url) {
  const loadingTask = pdfjsLib.getDocument({ url });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  const thumbnail = canvas.toDataURL("image/jpeg", 0.82);
  page.cleanup();
  await pdf.cleanup?.();
  return thumbnail;
}

function resolveZipPath(basePath, relativePath) {
  const parts = `${basePath}/${relativePath}`.split("/");
  const resolved = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  return resolved.join("/");
}

async function getEpubCover(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download EPUB: ${response.status}`);

  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const containerEntry = zip.file("META-INF/container.xml");
  if (!containerEntry) return null;

  const container = new DOMParser().parseFromString(await containerEntry.async("text"), "application/xml");
  const rootfile = container.querySelector("rootfile[full-path]");
  const opfPath = rootfile?.getAttribute("full-path");
  if (!opfPath) return null;

  const opfEntry = zip.file(opfPath);
  if (!opfEntry) return null;
  const opf = new DOMParser().parseFromString(await opfEntry.async("text"), "application/xml");
  const manifestItems = [...opf.querySelectorAll("manifest item")];
  const coverItem = manifestItems.find((item) =>
    item.getAttribute("properties")?.split(/\s+/).includes("cover-image")
  ) || manifestItems.find((item) => item.getAttribute("id") ===
    opf.querySelector('metadata meta[name="cover"]')?.getAttribute("content"));

  const coverHref = coverItem?.getAttribute("href");
  if (!coverHref) return null;

  const coverEntry = zip.file(resolveZipPath(opfPath.split("/").slice(0, -1).join("/"), coverHref));
  if (!coverEntry) return null;
  const blob = await coverEntry.async("blob");
  return URL.createObjectURL(blob);
}

async function getBookCover(book, token) {
  try {
    const { url } = await getReadUrl(token, book.id);
    if (book.format === "epub") return await getEpubCover(url);
    return await getPdfThumbnail(url);
  } catch (error) {
    console.warn(`Could not load cover for ${book.title}:`, error);
    return null;
  }
}

async function getBookProgress(book, token) {
  try {
    const progress = await getProgress(token, book.id);
    if (!progress?.location) return 0;

    const { url } = await getReadUrl(token, book.id);
    if (book.format === "pdf") {
      const pageNumber = Number(progress.location.replace("pdf:", ""));
      const loadingTask = pdfjsLib.getDocument({ url });
      const pdf = await loadingTask.promise;
      await loadingTask.destroy();
      return Math.round((Math.max(1, Math.min(pdf.numPages, pageNumber)) / pdf.numPages) * 100);
    }

    const epub = ePub(url);
    await epub.ready;
    await epub.locations.generate(1000);
    const percentage = epub.locations.percentageFromCfi(progress.location);
    epub.destroy?.();
    return Math.round(Math.max(0, Math.min(1, percentage)) * 100);
  } catch (error) {
    console.warn(`Could not load progress for ${book.title}:`, error);
    return 0;
  }
}

// Same metadata extraction your handleEPUBUpload did, minus the full-book
// word-count pass (that read every chapter's text just to estimate minutes,
// which blocks the upload on large books - worth revisiting as a background job).
async function extractEpubMetadata(file) {
  const arrayBuffer = await file.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;
  const metadata = await book.loaded.metadata;
  const coverUrl = await book.coverUrl();
  return {
    title: metadata.title || file.name.replace(/\.epub$/i, ""),
    author: metadata.creator || "Unknown author",
    coverUrl,
  };
}

function normalizeBookTitle(title) {
  return title.trim().toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/\s+/g, " ");
}

export function useBooks() {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const library = await getBooks(token);
      setBooks(library);
      const withCovers = await Promise.all(
        library.map(async (book) => ({
          ...book,
          coverUrl: await getBookCover(book, token),
          progressPercentage: await getBookProgress(book, token),
        }))
      );
      setBooks(withCovers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) refresh();
  }, [token, refresh]);

  const uploadBook = useCallback(
    async (file) => {
      const isEpub = file.name.toLowerCase().endsWith(".epub");
      const isPdf = file.name.toLowerCase().endsWith(".pdf");
      if (!isEpub && !isPdf) {
        throw new Error("Please upload a valid .epub or .pdf file.");
      }

      setUploading(true);
      setError(null);
      try {
        const metadata = isEpub
          ? await extractEpubMetadata(file)
          : { title: file.name.replace(/\.pdf$/i, ""), author: "Unknown author", coverUrl: null };

        const duplicate = books.some(
          (book) => book.format === (isEpub ? "epub" : "pdf")
            && normalizeBookTitle(book.title) === normalizeBookTitle(metadata.title)
        );
        if (duplicate) {
          throw new Error("This book is already in your library.");
        }

        // Get a presigned S3 PUT url from the API, then upload directly to S3.
        const { uploadUrl, key } = await getUploadUrl(token, file.name, file.type);
        await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });

        // Only after the S3 upload succeeds do we persist metadata to Postgres.
        const saved = await createBook(token, {
          title: metadata.title,
          author: metadata.author,
          format: isEpub ? "epub" : "pdf",
          s3Key: key,
        });

        setBooks((prev) => [...prev, { ...saved, coverUrl: metadata.coverUrl }]);
        return saved;
      } finally {
        setUploading(false);
      }
    },
    [books, token]
  );

  const removeBook = useCallback(
    async (bookId) => {
      await deleteBook(token, bookId);
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    },
    [token]
  );

  return { books, loading, uploading, error, uploadBook, removeBook, refresh };
}
