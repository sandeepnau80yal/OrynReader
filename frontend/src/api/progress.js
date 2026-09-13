import request from "./client";

// Returns null if there's no saved progress yet for this book.
export const getProgress = (token, bookId) =>
  request(`/books/${bookId}/progress`, { token }).catch(() => null);

export const saveProgress = (token, bookId, location, percentage) =>
  request(`/books/${bookId}/progress`, {
    method: "PUT",
    token,
    body: { location, percentage },
  });
