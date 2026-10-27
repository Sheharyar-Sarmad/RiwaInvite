import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api/v1", // Relative path for the browser
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 handling is done at the UI level for registration
    return Promise.reject(error);
  }
);