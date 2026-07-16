import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

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

export async function register(payload) {
  const res = await axios.post(`${API_BASE}/auth/register/`, payload);
  return res.data;
}

// Join an additional group as an already-registered member, using that
// group's join code + your national ID. See views.join_group.
export async function joinGroup(payload) {
  const res = await client.post("/me/join-group/", payload);
  return res.data;
}

// Every group this login can switch into (managed_groups for a
// treasurer, or every group joined as a member).
export async function myGroups() {
  const res = await client.get("/me/my-groups/");
  return res.data;
}

// Flip which group is currently active for this login.
export async function switchGroup(groupId) {
  const res = await client.post("/me/switch-group/", { group_id: groupId });
  return res.data;
}

export default client;
