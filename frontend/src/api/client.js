const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/+$/, "");

async function request(path, { method = "GET", body, token, isFormData = false } = {}) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const normalizedPath = `/${path.replace(/^\/+/, "")}`;
  const res = await fetch(`${API_URL}${normalizedPath}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export default request;
