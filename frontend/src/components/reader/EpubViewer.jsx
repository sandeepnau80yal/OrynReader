import { useRef, useState } from "react";
import { useEpubReader } from "../../hooks/useEpubReader";
import { useDictionaryLookup } from "../../hooks/useDictionaryLookup";
import { useTheme } from "../../context/ThemeContext";
import DictionaryPopup from "./DictionaryPopup";
import ReaderControls from "./ReaderControls";
import NavigationControls from "./NavigationControls";

// fileUrl: presigned S3 read url, fetched by the Reader page before rendering this.
// initialLocation / onRelocated: passed through from useReadingProgress in the parent page.
export default function EpubViewer({ fileUrl, initialLocation, onRelocated }) {
  const containerRef = useRef(null);
  useTheme();
  const [readerTheme, setReaderTheme] = useState(
    () => localStorage.getItem("oryn-reader-theme") || "dark"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    toc,
    metadata,
    loading,
    pageInfo,
    activeChapterHref,
    nextPage,
    prevPage,
    goTo,
    increaseFontSize,
    decreaseFontSize,
    selection,
    clearSelection,
  } = useEpubReader(containerRef, fileUrl, readerTheme, { initialLocation, onRelocated });

  const { entry, loading: dictLoading, error: dictError } = useDictionaryLookup(selection);

  function handleReaderThemeChange(nextTheme) {
    setReaderTheme(nextTheme);
    localStorage.setItem("oryn-reader-theme", nextTheme);
  }

  return (
    <main className="reader-wrapper">
      <button
        className="menu-btn"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? "Close table of contents" : "Open table of contents"}
        aria-expanded={sidebarOpen}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <aside className={`sidebar${sidebarOpen ? " visible" : ""}`} aria-label="Book information and table of contents">
        <div className="sidebar-header">
          <p className="book-index-label">Reading index</p>
          <h2>{metadata.title || "Loading book..."}</h2>
          {metadata.creator && <p className="book-author">{metadata.creator}</p>}
          {(metadata.publisher || metadata.language) && (
            <p className="book-details">
              {[metadata.publisher, metadata.language].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="sidebar-divider" />
        <h3 className="toc-title">Contents</h3>
        <ul id="chapter-list" aria-busy={loading}>
          {toc.length === 0 && (
            <li className="chapter-empty">{loading ? "Loading contents..." : "No contents available"}</li>
          )}
          {toc.map((chapter, index) => (
            <li
              key={`${chapter.href}-${index}`}
              className={activeChapterHref?.includes(chapter.href) ? "active" : ""}
              onClick={() => {
                goTo(chapter.href);
                setSidebarOpen(false);
              }}
            >
              <span style={{ paddingLeft: `${chapter.depth * 0.75}rem` }}>
                {chapter.label || `Section ${index + 1}`}
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close table of contents"
        />
      )}

      <section className="reader-area">
        <ReaderControls
          onIncreaseFont={increaseFontSize}
          onDecreaseFont={decreaseFontSize}
          theme={readerTheme}
          onThemeChange={handleReaderThemeChange}
        />

        <div className="epub-content">
          {loading && (
            <div className="loading-indicator active">
              <div className="loading-spinner" />
              <p>Loading content...</p>
            </div>
          )}

          <div ref={containerRef} id="viewer" />

          {!loading && <NavigationControls pageInfo={pageInfo} onPrev={prevPage} onNext={nextPage} />}
        </div>
      </section>

      <DictionaryPopup
        selection={selection}
        entry={entry}
        loading={dictLoading}
        error={dictError}
        onClose={clearSelection}
      />
    </main>
  );
}
