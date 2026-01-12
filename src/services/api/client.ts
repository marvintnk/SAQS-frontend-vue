import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

// Basis-Konfiguration für Axios.
// Wir nutzen relative URLs ("/api"), damit der Vite Proxy im Dev-Mode
// die Anfragen an das eigentliche Backend weiterleiten kann (CORS-Vermeidung).
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api', 
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response-Interceptor um Fehler zentral abzufangen, falls wir später
// z.B. globales Error-Toast-Handling oder Auto-Logout bei 401 einbauen wollen.
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
