import api from './api';

const batchService = {
  // Get all batches
  getAllBatches: (filters = {}) => {
    return api.get('/batches', { params: filters });
  },

  // Get batch by ID
  getBatchById: (batchId) => {
    return api.get(`/batches/${batchId}`);
  },

  // Create new batch
  createBatch: (batchData) => {
    return api.post('/batches', batchData);
  },

  // Update batch
  updateBatch: (batchId, batchData) => {
    return api.put(`/batches/${batchId}`, batchData);
  },

  // Delete batch
  deleteBatch: (batchId) => {
    return api.delete(`/batches/${batchId}`);
  },

  // Upload candidates
  uploadCandidates: (batchId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/batches/${batchId}/candidates`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Get batch candidates
  getBatchCandidates: (batchId) => {
    return api.get(`/batches/${batchId}/candidates`);
  },

  // Assign trainer to batch
  assignTrainer: (batchId, trainerId) => {
    return api.post(`/batches/${batchId}/trainers`, { trainerId });
  },

  // Get batch dashboard metrics
  getBatchMetrics: (batchId) => {
    return api.get(`/batches/${batchId}/metrics`);
  },
};

export default batchService;
