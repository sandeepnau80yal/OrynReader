import { useRef, useState, useEffect, useCallback } from "react";
import ePub from "epubjs";

// Matches the theme rules from your reader.html inline script.
const THEMES = {
  light: {
    body: {
      background: "#ffffff !important",
      color: "#0a0a0a !important",
      "line-height": "1.8 !important",
    },
    p: { "margin-bottom": "0.8em !important" },
    "h1, h2, h3, h4, h5, h6": { "margin-top": "1.35em !important", "margin-bottom": "0.7em !important" },
  },
  dark: {
    body: {
      background: "#0a0a0a !important",
      color: "#ffffff !important",
      "line-height": "1.8 !important",
    },
    p: { "margin-bottom": "0.8em !important" },
    "h1, h2, h3, h4, h5, h6": { "margin-top": "1.35em !important", "margin-bottom": "0.7em !important" },
  },
  sepia: {
    body: {
      background: "#f4ecd8 !important",
      color: "#3d3429 !important",
      "line-height": "1.8 !important",
    },
    p: { "margin-bottom": "0.8em !important" },
    "h1, h2, h3, h4, h5, h6": { "margin-top": "1.35em !important", "margin-bottom": "0.7em !important" },
  },
};

function flattenToc(items, book, depth = 0) {
  return items.flatMap((item) => [
    { ...item, href: resolveSpineHref(item.href, book), depth },
    ...(item.subitems ? flattenToc(item.subitems, book, depth + 1) : []),
  ]);
}

function normalizeChapterHref(href) {
  if (!href) return href;
  try {
    return decodeURIComponent(href).replace(/\\/g, "/");
  } catch {
    return href.replace(/\\/g, "/");
  }
}

function resolveSpineHref(href, book) {
  const normalized = normalizeChapterHref(href);
  if (!normalized || !book?.spine) return normalized;

  const [path, fragment] = normalized.split("#", 2);
  let section = book.spine.get(normalized) || book.spine.get(path);
  if (!section) {
    section = book.spine.spineItems.find((item) =>
      item.href === path || item.href.endsWith(`/${path}`) || item.href.endsWith(path)
    );
  }

  if (!section) return normalized;
  return fragment ? `${section.href}#${fragment}` : section.href;
}

// fileUrl: presigned S3 read url for this book.
// options.initialLocation: a saved CFI string to resume at (undefined = still loading, null = none saved).
// options.onRelocated: called with the current CFI on every page turn, for saving progress.
export function useEpubReader(containerRef, fileUrl, theme, { initialLocation, onRelocated } = {}) {
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const hasDisplayedInitial = useRef(false);
  const lastCfiRef = useRef(null);
  const locationsReadyRef = useRef(false);

  const [toc, setToc] = useState([]);
  const [metadata, setMetadata] = useState({ title: "", creator: "", publisher: "", language: "" });
  const [fontSize, setFontSizeState] = useState(
    () => Number(localStorage.getItem("oryn-font-size")) || 100
  );
  const [ready, setReady] = useState(false);
  const [renditionReady, setRenditionReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState(null); // { text, cfi }
  const [pageInfo, setPageInfo] = useState({ current: null, total: null });
  const [activeChapterHref, setActiveChapterHref] = useState(null);

  useEffect(() => {
    if (!fileUrl || !containerRef.current) return;

    hasDisplayedInitial.current = false;
    lastCfiRef.current = null;
    locationsReadyRef.current = false;
    setLoading(true);
    setRenditionReady(false);
    setToc([]);
    setMetadata({ title: "", creator: "", publisher: "", language: "" });

    const book = ePub(fileUrl, { replacements: "blobUrl" });
    const rendition = book.renderTo(containerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none",
      flow: "paginated",
    });
    bookRef.current = book;
    renditionRef.current = rendition;

    Object.entries(THEMES).forEach(([name, rules]) => rendition.themes.register(name, rules));
    rendition.themes.select(theme);
    rendition.themes.fontSize(`${fontSize}%`);

    // Powers the dictionary popup: epub.js fires 'selected' with the exact
    // highlighted text and its cfi whenever text is selected inside the iframe.
    rendition.on("selected", (cfiRange, contents) => {
      const text = contents.window.getSelection().toString().trim();
      if (text) setSelection({ text, cfi: cfiRange });
    });

    rendition.on("relocated", (location) => {
      setPageInfo({ current: location.start.displayed.page, total: location.start.displayed.total });
      setActiveChapterHref(location.start.href);
      lastCfiRef.current = location.start.cfi;
      const generatedPercentage = locationsReadyRef.current && book.locations.length()
        ? book.locations.percentageFromCfi(location.start.cfi)
        : null;
      const displayed = location.start.displayed;
      const fallbackPercentage = displayed?.total
        ? displayed.page / displayed.total
        : 0;
      onRelocated?.(location.start.cfi, generatedPercentage ?? fallbackPercentage);
    });

    rendition.on("rendered", (_section, view) => {
      const document = view?.contents?.document;
      if (document) {
        let fontOverride = document.getElementById("oryn-reader-font-override");
        if (!fontOverride) {
          fontOverride = document.createElement("style");
          fontOverride.id = "oryn-reader-font-override";
          document.head.appendChild(fontOverride);
        }
        fontOverride.textContent = `
          body, body * {
            font-family: Georgia, "Times New Roman", serif !important;
          }
        `;
      }
      setLoading(false);
      setRenditionReady(true);
    });

    Promise.all([book.loaded.navigation, book.loaded.metadata]).then(([nav, bookMetadata]) => {
      setToc(flattenToc(nav.toc || [], book));
      setMetadata({
        title: bookMetadata.title || "Untitled book",
        creator: bookMetadata.creator || "Unknown author",
        publisher: bookMetadata.publisher || "",
        language: bookMetadata.language || "",
      });
    });

    book.locations.generate(1000).then(() => {
      locationsReadyRef.current = true;
      if (lastCfiRef.current) {
        onRelocated?.(
          lastCfiRef.current,
          book.locations.percentageFromCfi(lastCfiRef.current)
        );
      }
    }).catch((error) => {
      console.warn("Could not generate EPUB locations:", error);
    });

    setReady(true);

    return () => {
      rendition.destroy();
      bookRef.current = null;
      renditionRef.current = null;
      setReady(false);
      setRenditionReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, containerRef]);

  // Waits until both the rendition exists AND we know whether there's a saved
  // position, so we never flash to page 1 before jumping to the real spot.
  useEffect(() => {
    if (ready && !hasDisplayedInitial.current && initialLocation !== undefined) {
      renditionRef.current.display(initialLocation || undefined);
      hasDisplayedInitial.current = true;
    }
  }, [ready, initialLocation]);

  useEffect(() => {
    if (ready) renditionRef.current?.themes.select(theme);
  }, [theme, ready]);

  useEffect(() => {
    if (ready && renditionReady) {
      renditionRef.current?.themes.fontSize(`${fontSize}%`);
      localStorage.setItem("oryn-font-size", fontSize);

      if (lastCfiRef.current) {
        renditionRef.current.display(lastCfiRef.current);
      } else {
        renditionRef.current?.resize();
      }
    }
  }, [fontSize, ready, renditionReady]);

  const nextPage = useCallback(() => renditionRef.current?.next(), []);
  const prevPage = useCallback(() => renditionRef.current?.prev(), []);
  const goTo = useCallback(async (href) => {
    const rendition = renditionRef.current;
    if (!rendition || !href) return;

    const target = normalizeChapterHref(href);
    try {
      await rendition.display(target);
    } catch (error) {
      console.error("Could not open EPUB chapter:", href, error);
    }
  }, []);
  const increaseFontSize = useCallback(() => setFontSizeState((s) => Math.min(200, s + 10)), []);
  const decreaseFontSize = useCallback(() => setFontSizeState((s) => Math.max(50, s - 10)), []);
  const clearSelection = useCallback(() => setSelection(null), []);

  // Keyboard navigation (was a document-level listener in reader.html)
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "ArrowLeft") prevPage();
      if (e.key === "ArrowRight") nextPage();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prevPage, nextPage]);

  // Debounced resize handling, same 100ms delay as reader.html
  useEffect(() => {
    let timeout;
    function handleResize() {
      clearTimeout(timeout);
      timeout = setTimeout(() => renditionRef.current?.resize(), 100);
    }
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return {
    toc,
    metadata,
    fontSize,
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
  };
}
