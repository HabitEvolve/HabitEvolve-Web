import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const axiosClient = axios.create({
    // Tùy thuộc vào Vite (import.meta.env) hay CRA (process.env)
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor cho Request
axiosClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Interceptor cho Response
axiosClient.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            console.error("Token hết hạn hoặc không hợp lệ!");
            // Logic logout hoặc điều hướng về trang đăng nhập
        }
        return Promise.reject(error);
    }
);

export default axiosClient;