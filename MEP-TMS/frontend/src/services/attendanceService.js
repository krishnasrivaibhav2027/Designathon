import api from './api';

const attendanceService = {
  // Upload attendance manually
  uploadAttendance: (batchId, attendanceData) => {
    return api.post(`/attendance/batch/${batchId}`, attendanceData);
  },

  // Upload attendance from Excel
  uploadAttendanceFile: (batchId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/attendance/batch/${batchId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Get attendance records
  getAttendanceRecords: (batchId, filters = {}) => {
    return api.get(`/attendance/batch/${batchId}`, { params: filters });
  },

  // Get candidate attendance
  getCandidateAttendance: (candidateId) => {
    return api.get(`/attendance/candidate/${candidateId}`);
  },

  // Get attendance statistics
  getAttendanceStats: (batchId) => {
    return api.get(`/attendance/batch/${batchId}/stats`);
  },

  // Get absent candidates
  getAbsentCandidates: (batchId) => {
    return api.get(`/attendance/batch/${batchId}/absent`);
  },
};

export default attendanceService;
