import { useRef, useState, useEffect, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { useTheme } from "../../context/ThemeContext";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function isPdfCancellation(error) {
  return error?.name === "AbortException" || /loading aborted/i.test(error?.message || "");
}

// fileUrl: presigned S3 read url for this book.
export default function PdfViewer({ fileUrl, initialLocation, onRelocated }) {
  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const pdfRef = useRef(null);
  const loadingTaskRef = useRef(null);
  const renderTaskRef = useRef(null);
  const cancelledRef = useRef(false);
  const renderVersionRef = useRef(0);
  const renderedWidthRef = useRef(0);
  const zoomRef = useRef(1);
  const { pdfInverted, setPdfInverted } = useTheme();
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const initialPage = initialLocation?.startsWith("pdf:")
    ? Number(initialLocation.replace("pdf:", ""))
    : 1;
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    cancelledRef.current = false;
    renderVersionRef.current += 1;

    const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
    loadingTaskRef.current = loadingTask;

    loadingTask.promise.then((pdf) => {
      if (cancelledRef.current) {
        if (typeof pdf.cleanup === "function") pdf.cleanup();
        return;
      }
      setLoading(true);
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);
      setPageNum(Math.max(1, Math.min(pdf.numPages, initialPage || 1)));
    }).catch((error) => {
      if (!cancelledRef.current && !isPdfCancellation(error)) {
        console.error("PDF failed to load:", error);
        setLoading(false);
      }
    });

    return () => {
      cancelledRef.current = true;
      renderVersionRef.current += 1;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
      if (typeof pdfRef.current?.cleanup === "function") pdfRef.current.cleanup();
      pdfRef.current = null;
    };
  }, [fileUrl, initialPage]);

  const renderPage = useCallback(async (num, showLoading = true) => {
    const pdf = pdfRef.current;
    const canvasWrap = canvasWrapRef.current;
    if (!pdf || !canvasRef.current || !canvasWrap) return;
    const renderVersion = ++renderVersionRef.current;
    if (showLoading) setLoading(true);

    try {
      renderTaskRef.current?.cancel();
      const page = await pdf.getPage(num);
      if (
        cancelledRef.current ||
        pdf !== pdfRef.current ||
        renderVersion !== renderVersionRef.current
      ) {
        page.cleanup();
        return;
      }

      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(canvasWrap.clientWidth - 32, 240);
      renderedWidthRef.current = canvasWrap.clientWidth;
      const fitScale = Math.min(1.4, availableWidth / baseViewport.width);
      const scale = fitScale * zoomRef.current;
      const viewport = page.getViewport({ scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2.5);
      const canvas = canvasRef.current;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const context = canvas.getContext("2d");
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvasContext: context,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      if (!cancelledRef.current && renderVersion === renderVersionRef.current) {
        setLoading(false);
      }
      page.cleanup();
    } catch (error) {
      if (!cancelledRef.current && error?.name !== "RenderingCancelledException") {
        console.error("PDF page failed to render:", error);
        if (showLoading) setLoading(false);
      }
    } finally {
      renderTaskRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Rendering is an external PDF.js operation that updates loading state when complete.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (numPages) renderPage(pageNum);
  }, [pageNum, numPages, renderPage]);

  useEffect(() => {
    const canvasWrap = canvasWrapRef.current;
    if (!canvasWrap || !numPages) return undefined;

    let resizeFrame;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (!width || width === renderedWidthRef.current) return;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => renderPage(pageNum, false));
    });
    observer.observe(canvasWrap);
    return () => {
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
    };
  }, [pageNum, numPages, renderPage]);

  // Keyboard nav, matching the epub reader's behavior
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "ArrowLeft") setPageNum((p) => Math.max(1, p - 1));
      if (e.key === "ArrowRight") setPageNum((p) => Math.min(numPages, p + 1));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [numPages]);

  useEffect(() => {
    if (pdfRef.current && numPages && onRelocated) {
      onRelocated(`pdf:${pageNum}`, pageNum / numPages);
    }
  }, [pageNum, numPages, onRelocated]);

  function changeZoom(nextZoom) {
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    if (numPages) renderPage(pageNum, false);
  }

  return (
    <main className="reader-wrapper">
      <section className="reader-area">
        <div className="reader-controls">
          <div className="control-group">
            <label>Colors</label>
            <button onClick={() => setPdfInverted((v) => !v)}>
              {pdfInverted ? "Normal" : "Invert"}
            </button>
          </div>
          <div className="control-group pdf-zoom-controls">
            <label>Zoom</label>
            <button
              onClick={() => changeZoom(Math.max(1, Number((zoom - 0.25).toFixed(2))))}
              aria-label="Zoom out PDF"
              disabled={zoom === 1}
            >
              −
            </button>
            <span className="pdf-zoom-value">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => changeZoom(Math.min(3, Number((zoom + 0.25).toFixed(2))))}
              aria-label="Zoom in PDF"
              disabled={zoom === 3}
            >
              +
            </button>
          </div>
        </div>

        <div className="epub-content">
          {loading && (
            <div className="loading-indicator active">
              <div className="loading-spinner" />
              <p>Loading content...</p>
            </div>
          )}

          <div
            ref={canvasWrapRef}
            className={`pdf-canvas-wrap${pdfInverted ? " pdf-inverted" : ""}${zoom > 1 ? " is-zoomed" : ""}`}
          >
            <canvas ref={canvasRef} />
          </div>

          {!loading && numPages > 0 && (
            <div className="navigation-controls">
              <button className="nav-btn" onClick={() => setPageNum((p) => Math.max(1, p - 1))}>
                ← Previous
              </button>
              <span>{pageNum} / {numPages}</span>
              <button
                className="nav-btn"
                onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
