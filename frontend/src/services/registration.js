import api from './api';

// PUBLIC endpoints (no auth needed — registration is pre-auth)
// Using the same `api` instance is fine; the request interceptor only adds token if present.

export async function checkUsernameAvailable(username) {
  const { data } = await api.get('/auth/register-upps/check-username', { params: { username } });
  return data.available;
}

export async function submitRegistration(formData) {
  const { data } = await api.post('/auth/register-upps', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function resubmitRegistration(requestId, formData) {
  const { data } = await api.post(`/auth/register-upps/${requestId}/resubmit`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getRequestByToken(token) {
  const { data } = await api.get('/auth/register-upps/resubmit-data', { params: { token } });
  return data;
}

export async function validateDocument(templateCode, file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post(`/document-validation/templates/${templateCode}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// Reference data (institutions, prodi, jenjang) — public read
export async function getReferenceData() {
  const [inst, prodi, jenjang] = await Promise.all([
    api.get('/reference/institutions'),
    api.get('/reference/program-studi'),
    api.get('/reference/jenjang'),
  ]);
  return {
    institutions: inst.data,
    programStudi: prodi.data,
    jenjang: jenjang.data,
  };
}

// Sekretariat-only endpoints (auth required — token auto-attached by interceptor)
export async function listRegistrations(status) {
  const { data } = await api.get('/sekretariat/registrations', { params: { status } });
  return data.requests;
}

export async function getRegistrationDetail(id) {
  const { data } = await api.get(`/sekretariat/registrations/${id}`);
  return data;
}

export async function approveRegistration(id) {
  const { data } = await api.post(`/sekretariat/registrations/${id}/approve`);
  return data;
}

export async function rejectRegistration(id, reason) {
  const { data } = await api.post(`/sekretariat/registrations/${id}/reject`, { reason });
  return data;
}
