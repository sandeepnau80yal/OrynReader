import { useState, useEffect } from "react";

// Swap this endpoint for your own dictionary API/provider if you have one.
const DICTIONARY_API = "https://api.dictionaryapi.dev/api/v2/entries/en";

export function useDictionaryLookup(selection) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selection?.text) {
      setEntry(null);
      return;
    }

    const word = selection.text.split(/\s+/)[0].replace(/[^a-zA-Z'-]/g, "");
    if (!word) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`)
      .then((res) => {
        if (!res.ok) throw new Error("No definition found");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEntry(data[0]);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selection]);

  return { entry, loading, error };
}
