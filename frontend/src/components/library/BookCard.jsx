import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function BookCard({ book, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function openBook() {
    navigate(`/reader/${book.id}`);
  }

  function handleCardKeyDown(event) {
    if (event.target.closest("a, button")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBook();
    }
  }

  return (
    <div
      className="book-card"
      onClick={(event) => {
        if (!event.target.closest("a, button")) openBook();
      }}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
    >
      <div className="book-cover">
        <Link to={`/reader/${book.id}`}>
          {book.coverUrl ? (
            <img src={book.coverUrl} alt={`${book.title} cover`} />
          ) : (
            <div className="book-cover__placeholder" aria-hidden="true">
              {book.title?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </Link>
        <div
          className="three-dots"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >⋮</div>
        {menuOpen && (
          <div className="book-menu">
            <button
              onClick={() => {
                setMenuOpen(false);
                onDelete(book.id);
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="book-meta">
        <h3>
          <Link className="book-title-link" to={`/reader/${book.id}`}>
            {book.title}
          </Link>
        </h3>
        <p>{book.author}</p>
        <div className="book-progress" aria-label={`${book.progressPercentage || 0}% read`}>
          <div className="book-progress__track">
            <span style={{ width: `${book.progressPercentage || 0}%` }} />
          </div>
          <span className="book-progress__value">{book.progressPercentage || 0}% read</span>
        </div>
      </div>
    </div>
  );
}
