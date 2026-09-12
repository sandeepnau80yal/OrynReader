import Header from "../components/layout/Header";
import BookCard from "../components/library/BookCard";
import UploadButton from "../components/library/UploadButton";
import { useBooks } from "../hooks/useBooks";
import { useState } from "react";

export default function Library() {
  const { books, loading, uploading, error, uploadBook, removeBook } = useBooks();
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("oryn-library-view") || "grid");

  function toggleView() {
    setViewMode((current) => {
      const next = current === "grid" ? "list" : "grid";
      localStorage.setItem("oryn-library-view", next);
      return next;
    });
  }

  return (
    <>
      <Header showLogout />
      <main>
        <div className="hero center-text">
          <h2>Welcome to your library</h2>
          <p>Here are your uploaded books</p>
        </div>

        <section className={`book-list book-list--${viewMode}`}>
          <div className="library-toolbar">
            <UploadButton onUpload={uploadBook} uploading={uploading} />
            <div className="library-toolbar__actions">
              <h2>Your library</h2>
              <button className="view-toggle" onClick={toggleView} aria-label={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}>
                <span aria-hidden="true">{viewMode === "grid" ? "☷" : "▦"}</span>
                {viewMode === "grid" ? " List view" : " Grid view"}
              </button>
            </div>
          </div>

          {loading && <p className="library-loading">Loading your library...</p>}
          {error && <p className="library-error">{error}</p>}

          {books.map((book) => (
            <BookCard key={book.id} book={book} onDelete={removeBook} />
          ))}
        </section>
      </main>
    </>
  );
}
