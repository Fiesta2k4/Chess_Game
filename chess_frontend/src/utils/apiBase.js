const FALLBACK_API_URL = "https://chess-sec.onrender.com";

const rawApiUrl = process.env.REACT_APP_API_URL || FALLBACK_API_URL;
const normalizedApiUrl = rawApiUrl === "/" ? "" : rawApiUrl.replace(/\/+$/, "");

export const API_BASE_URL = normalizedApiUrl;
export const SOCKET_BASE_URL =
  API_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
