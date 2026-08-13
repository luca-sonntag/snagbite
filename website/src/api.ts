// Base URL for backend API calls on the website.
//
// In dev mode or same-origin deployments, API_BASE_URL is empty, so requests
// stay relative (e.g. "/api/admin/check") and use Vite proxy or domain routing.
// Set VITE_API_BASE_URL in .env if the backend is hosted on a separate domain.
let rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
if (rawBaseUrl && !rawBaseUrl.startsWith('http://') && !rawBaseUrl.startsWith('https://') && !rawBaseUrl.startsWith('/')) {
  rawBaseUrl = `https://${rawBaseUrl}`;
}
const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

