import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Configuration de base
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';

// Création de l'instance Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 secondes
});

// Intercepteur de requête - Ajout du token JWT
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse - Gestion des erreurs
apiClient.interceptors.response.use(
  (response) => {
    // Retourner directement la data si elle existe
    return response.data;
  },
  (error: AxiosError) => {
    // Gestion des erreurs HTTP
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Token invalide ou expiré
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;

        case 403:
          // Accès interdit
          console.error('Accès interdit', data);
          break;

        case 404:
          // Ressource non trouvée
          console.error('Ressource non trouvée', data);
          break;

        case 500:
          // Erreur serveur
          console.error('Erreur serveur', data);
          break;

        default:
          console.error(`Erreur HTTP ${status}`, data);
      }
    } else if (error.request) {
      // La requête a été envoyée mais pas de réponse
      console.error('Pas de réponse du serveur', error.request);
    } else {
      // Erreur lors de la configuration de la requête
      console.error('Erreur de configuration', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Export des méthodes HTTP
export const api = {
  get: apiClient.get,
  post: apiClient.post,
  put: apiClient.put,
  patch: apiClient.patch,
  delete: apiClient.delete,
};
