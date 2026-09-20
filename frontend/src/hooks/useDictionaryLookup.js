import { useState, useEffect } from "react";

// Official Free Dictionary API documented at https://dictionaryapi.dev/
const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";

function extractWord(text) {
  return text
    .normalize("NFKC")
    .trim()
    .split(/\s+/)[0]
    .replace(/^[^\p{L}']+|[^\p{L}'-]+$/gu, "")
    .replace(/[’]/g, "'");
}

export function useDictionaryLookup(selection) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selection?.text) {
      setEntry(null);
      setError(null);
      setLoading(false);
      return;
    }

    const word = extractWord(selection.text);
    if (!word) {
      setEntry(null);
      setError("Select a word to look it up.");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setEntry(null);
    setLoading(true);
    setError(null);

    fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) throw new Error(`No definition found for “${word}”`);
        if (!res.ok) throw new Error("Dictionary service is unavailable");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || !data[0]?.meanings?.length) {
          throw new Error(`No definition found for “${word}”`);
        }
        if (!cancelled) setEntry(data[0]);
      })
      .catch((err) => {
        if (!cancelled && err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selection]);

  return { entry, loading, error };
}
