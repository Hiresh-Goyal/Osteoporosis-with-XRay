export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860';

function getToken() {
  return localStorage.getItem('osteocare_token');
}

function getHeaders(includeAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(method, path, body = null, auth = true) {
  const options = { method, headers: getHeaders(auth) };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${BASE_URL}${path}`, options);
  let data;
  
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    // If the server returns HTML (e.g. 500 Internal Server Error)
    const text = await res.text();
    throw new Error(`Server Error (${res.status}): Please check backend or credentials.`);
  }

  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }, false),
  register: (payload) => request('POST', '/auth/register', payload, false),

  // Admin
  getUsers: () => request('GET', '/admin/users'),
  createUser: (payload) => request('POST', '/admin/create_user', payload),
  deleteUser: (id) => request('DELETE', `/admin/users/${id}`),
  approveUser: (id) => request('POST', `/admin/approve/${id}`),
  rejectUser: (id) => request('POST', `/admin/reject/${id}`),
  getAdminStats: () => request('GET', '/admin/stats'),

  // Patient
  getPatientProfile: () => request('GET', '/patient/profile'),
  getPatientQueries: () => request('GET', '/patient/queries'),
  submitQuery: (subject, message) => request('POST', '/patient/queries', { subject, message }),
  getPublicDoctors: () => request('GET', '/api/v1/public/doctors', null, false),

  // Doctor
  getDoctorPatients: () => request('GET', '/doctor/patients'),
  addDoctorNotes: (predictionId, notes) => request('POST', `/doctor/notes/${predictionId}`, { notes }),

  // Query Manager
  getAllQueries: () => request('GET', '/query/all'),
  respondToQuery: (queryId, response) => request('POST', `/query/respond/${queryId}`, { response }),
};

export function saveSession(token, user) {
  localStorage.setItem('osteocare_token', token);
  localStorage.setItem('osteocare_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('osteocare_token');
  localStorage.removeItem('osteocare_user');
}

export function getSession() {
  const token = localStorage.getItem('osteocare_token');
  const userStr = localStorage.getItem('osteocare_user');
  if (!token || !userStr) return null;
  try {
    return { token, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}
