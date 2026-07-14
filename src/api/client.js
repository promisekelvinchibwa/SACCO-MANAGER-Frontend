import axios from "axios";

<<<<<<< HEAD
const API_BASE = "http://localhost:8000/api";
=======
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
>>>>>>> 21490c7 (added the changepassword page, loan request paage, and members can be added from within the app)

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
