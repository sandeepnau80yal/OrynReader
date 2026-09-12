import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useReadingProgress } from "../hooks/useReadingProgress";
import { getReadUrl } from "../api/books";
import Header from "../components/layout/Header";
import EpubViewer from "../components/reader/EpubViewer";
import PdfViewer from "../components/reader/PdfViewer";

export default function Reader() {
  const { bookId } = useParams();
  const { token } = useAuth();
  const [book, setBook] = useState(null); // { url, format, title }
  const [error, setError] = useState(null);
  const { initialLocation, onRelocated } = useReadingProgress(bookId);

  useEffect(() => {
    if (!token || !bookId) return;
    setBook(null);
    setError(null);
    getReadUrl(token, bookId)
      .then(setBook)
      .catch((err) => setError(err.message));
  }, [token, bookId]);

  return (
    <>
      <Header showHome />
      {error && <p className="reader-error">{error}</p>}
      {!error && !book && <p className="reader-loading">Fetching your book...</p>}
      {book && book.format === "pdf" && (
        <PdfViewer fileUrl={book.url} initialLocation={initialLocation} onRelocated={onRelocated} />
      )}
      {book && book.format === "epub" && (
        <EpubViewer fileUrl={book.url} initialLocation={initialLocation} onRelocated={onRelocated} />
      )}
    </>
  );
}
