import axios from "axios";

const baseURL = import.meta.env.DEV 
  ? import.meta.env.VITE_API_URL_DEV
  : import.meta.env.VITE_API_URL_PRO

const api = axios.create({ baseURL });

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('userToken');
      if (window.location.pathname !== '/sign-in') {
        window.location.href = '/sign-in';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

