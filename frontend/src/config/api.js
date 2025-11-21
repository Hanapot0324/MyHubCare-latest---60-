// API Configuration
// This file centralizes API URL configuration
// Use environment variables or fallback to localhost

const getApiBaseUrl = () => {
  // Check if we should use IP address
  const useIP = import.meta.env.VITE_USE_IP === 'true';
  
  if (useIP && import.meta.env.VITE_API_IP_URL) {
    return import.meta.env.VITE_API_IP_URL;
  }
  
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
};

const getSocketUrl = () => {
  const useIP = import.meta.env.VITE_USE_IP === 'true';
  
  if (useIP && import.meta.env.VITE_SOCKET_IP_URL) {
    return import.meta.env.VITE_SOCKET_IP_URL;
  }
  
  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:');
  console.log('   API URL:', API_BASE_URL);
  console.log('   Socket URL:', SOCKET_URL);
  console.log('   Use IP:', import.meta.env.VITE_USE_IP === 'true');
}




