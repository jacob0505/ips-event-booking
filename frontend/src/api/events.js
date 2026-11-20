import client from './client';

export const fetchEvents = (date) =>
  client.get('/events', { params: date ? { date } : {} }).then((r) => r.data.data);

export const registerForEvent = (payload) =>
  client.post('/registrations', payload).then((r) => r.data);

export const cancelRegistration = (payload) =>
  client.delete('/registrations', { data: payload }).then((r) => r.data);

export const adminLogin = (payload) =>
  client.post('/admin/login', payload).then((r) => r.data);

export const adminLogout = () => client.post('/admin/logout').then((r) => r.data);

export const createEvent = (payload) =>
  client.post('/admin/events', payload).then((r) => r.data);

export const deleteEvent = (id) =>
  client.delete(`/admin/events/${id}`).then((r) => r.data);

export const updateEvent = (id, payload) =>
  client.put(`/admin/events/${id}`, payload).then((r) => r.data);

export const bulkDeleteEvents = (ids) =>
  client.post('/admin/events/bulk-delete', { ids }).then((r) => r.data);

export const fetchUpcomingEvents = () =>
  client.get('/admin/events/upcoming').then((r) => r.data.data);

export const fetchAttendees = (id) =>
  client.get(`/admin/events/${id}/registrations`).then((r) => r.data.data);

export const downloadAttendeesPdf = (id) =>
  client
    .get(`/admin/events/${id}/registrations/pdf`, { responseType: 'blob' })
    .then((r) => r.data);