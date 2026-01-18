import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
  },
});

// Meetings API
export const meetingsApi = {
  getAll: async (search = "", limit = 50) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (limit) params.append("limit", limit);
    const response = await api.get(`/meetings?${params.toString()}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/meetings/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/meetings", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/meetings/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/meetings/${id}`);
    return response.data;
  },

  uploadAudio: async (meetingId, file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await api.post(`/meetings/${meetingId}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },

  transcribe: async (meetingId) => {
    const response = await api.post(`/meetings/${meetingId}/transcribe`);
    return response.data;
  },

  summarize: async (meetingId) => {
    const response = await api.post(`/meetings/${meetingId}/summarize`);
    return response.data;
  },

  process: async (title, description, file, onProgress) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("file", file);
    
    const response = await api.post("/meetings/process", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  },
};

// Stats API
export const statsApi = {
  get: async () => {
    const response = await api.get("/stats");
    return response.data;
  },
};

// Subscription API
export const subscriptionApi = {
  getPlans: async () => {
    const response = await api.get("/subscription/plans");
    return response.data;
  },

  createCheckout: async (planId, originUrl) => {
    const response = await api.post("/subscription/checkout", {
      plan_id: planId,
      origin_url: originUrl,
    });
    return response.data;
  },

  getStatus: async (sessionId) => {
    const response = await api.get(`/subscription/status/${sessionId}`);
    return response.data;
  },

  getTransactions: async (limit = 50) => {
    const response = await api.get(`/subscription/transactions?limit=${limit}`);
    return response.data;
  },
};

export default api;
