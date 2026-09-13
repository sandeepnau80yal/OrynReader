import { useState, useEffect, useRef, useCallback } from "react";
import { getProgress, saveProgress } from "../api/progress";
import { useAuth } from "../context/AuthContext";

export function useReadingProgress(bookId) {
  const { token } = useAuth();
  // undefined = still fetching, null = fetched but nothing saved yet
  const [initialLocation, setInitialLocation] = useState(undefined);
  const saveTimeout = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setInitialLocation(undefined);
    getProgress(token, bookId).then((data) => {
      if (!cancelled) setInitialLocation(data?.location ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [token, bookId]);

  // Debounced so a fast page-turner doesn't fire a request per page.
  const onRelocated = useCallback(
    (location, percentage) => {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
      saveProgress(token, bookId, location, percentage).catch((err) =>
          console.error("Failed to save reading progress:", err)
        );
      }, 1000);
    },
    [token, bookId]
  );

  return { initialLocation, onRelocated };
}
