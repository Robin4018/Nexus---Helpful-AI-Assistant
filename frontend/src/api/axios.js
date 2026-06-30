import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/';

const instance = axios.create({
    baseURL: API_BASE_URL,
});

instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        // Guard: error.response can be undefined on network errors.
        // We only want to handle 401s that are NOT from the login page itself.
        const isLoginRequest = originalRequest.url.includes('login/');

        if (error.response && error.response.status === 401 && !originalRequest._retry && !isLoginRequest) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}token/refresh/`, {
                        refresh: refreshToken,
                    });
                    localStorage.setItem('access_token', response.data.access);
                    originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
                    instance.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
                    return instance(originalRequest);
                } catch (refreshError) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            } else {
                // No refresh token — redirect to login immediately
                localStorage.removeItem('access_token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default instance;
