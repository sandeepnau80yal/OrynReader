import request from "./client";

export const getBooks = (token) => request("/books", { token });

export const getUploadUrl = (token, filename, contentType) =>
  request("/books/upload-url", { method: "POST", token, body: { filename, contentType } });

export const getReadUrl = (token, bookId) => request(`/books/${bookId}/read-url`, { token });

export const createBook = (token, book) =>
  request("/books", { method: "POST", token, body: book });

export const deleteBook = (token, bookId) =>
  request(`/books/${bookId}`, { method: "DELETE", token });
