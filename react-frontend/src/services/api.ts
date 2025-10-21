// Base API configuration
const API_BASE_URL = "http://localhost:8000";

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem("access_token");
};

// Helper function to make API requests
const makeRequest = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export { makeRequest, API_BASE_URL };
