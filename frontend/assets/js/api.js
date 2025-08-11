// Simple API client
const API_BASE_URL = 'http://localhost:8000/api';

class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = localStorage.getItem('access_token');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (token && !options.skipAuth) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            // Handle 401 - token expired
            if (response.status === 401 && !options.skipAuth) {
                await this.refreshToken();
                // Retry with new token
                config.headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`;
                return await fetch(url, config).then(res => this.handleResponse(res));
            }
            
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API Request failed:', error);
            throw new Error('Network error: ' + error.message);
        }
    }

    async handleResponse(response) {
        // Read raw text first
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Invalid JSON response:', text);
            throw new Error('Invalid JSON: ' + text);
        }
        if (!response.ok) {
            // Throw full error data to expose validation messages from server
            const errPayload = data.error?.message || data.message || JSON.stringify(data);
            console.error('API Error response data:', data);
            throw new Error(errPayload);
        }
        return data;
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            this.logout();
            return;
        }

        try {
            const response = await this.request('/auth/refresh/', {
                method: 'POST',
                body: { refresh: refreshToken },
                skipAuth: true
            });
            
            localStorage.setItem('access_token', response.access);
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
        }
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login.html';
    }

    // HTTP methods
    async get(endpoint, options = {}) {
        return this.request(endpoint, { method: 'GET', ...options });
    }

    async post(endpoint, body, options = {}) {
        return this.request(endpoint, { method: 'POST', body, ...options });
    }

    async put(endpoint, body, options = {}) {
        return this.request(endpoint, { method: 'PUT', body, ...options });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { method: 'DELETE', ...options });
    }
}

// Global API instance
const API = new APIClient(API_BASE_URL);
