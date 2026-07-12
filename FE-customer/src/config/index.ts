// src/config/index.ts
// Central environment-specific endpoints.

const LOCAL_API_BASE_URL = "http://localhost:8080/api";
const LOCAL_BACKEND_BASE_URL = "http://localhost:8080";

const PRODUCTION_API_BASE_URL = "https://siupo-be-2twyqzvq7q-uc.a.run.app/api";
const PRODUCTION_BACKEND_BASE_URL = "https://siupo-be-2twyqzvq7q-uc.a.run.app";

export const API_BASE_URL = import.meta.env.DEV
  ? LOCAL_API_BASE_URL
  : PRODUCTION_API_BASE_URL;

export const BACKEND_BASE_URL = import.meta.env.DEV
  ? LOCAL_BACKEND_BASE_URL
  : PRODUCTION_BACKEND_BASE_URL;

export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

