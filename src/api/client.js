import axios from "axios";

const API_BASE = "http://localhost:8000/api";

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("sacco_token");
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

export async function login(username, password) {
  const res = await axios.post(`${API_BASE}/token-auth/`, { username, password });
  return res.data.token;
}

export default client;
