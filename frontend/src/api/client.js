import axios from "axios";

// One shared Axios instance for every API call.
// In development "/api" is proxied to the backend (see vite.config.js).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 8000,
  withCredentials: true,
});

export const getHealth = () => api.get("/health").then((res) => res.data);

export default api;
