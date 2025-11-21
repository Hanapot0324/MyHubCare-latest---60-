# Environment Setup Guide

This guide explains how to configure the application to work with both localhost and IP address (network access).

## Your IP Address

Based on your system, your IP address is: **192.168.1.6**

## Backend Setup

1. Copy the example environment file:
   ```bash
   cd backend
   cp env.example .env
   ```

2. Edit `backend/.env` and update the IP address if needed:
   ```env
   PORT=5000
   HOST=0.0.0.0
   SERVER_IP=http://192.168.1.6:5000
   FRONTEND_IP=http://192.168.1.6:5173
   ```

3. Install dotenv if not already installed:
   ```bash
   npm install dotenv
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

   The server will now be accessible at:
   - Local: http://localhost:5000
   - Network: http://192.168.1.6:5000

## Frontend Setup

1. Copy the example environment file:
   ```bash
   cd frontend
   cp env.example .env
   ```

2. Edit `frontend/.env` and update the IP address:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_API_IP_URL=http://192.168.1.6:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   VITE_SOCKET_IP_URL=http://192.168.1.6:5000
   VITE_USE_IP=false
   ```

3. To use IP address instead of localhost, set:
   ```env
   VITE_USE_IP=true
   ```

4. Restart the frontend dev server:
   ```bash
   npm run dev
   ```

## Mobile Setup

1. Edit `mobile/lib/services/api_service.dart`

2. Update the `baseUrl` getter with your IP address:
   ```dart
   static String get baseUrl {
     if (kIsWeb) {
       return 'http://localhost:5000/api';
     }
     // Replace with your IP address
     return 'http://192.168.1.6:5000/api';
   }
   ```

3. For Android Emulator, use:
   ```dart
   return 'http://10.0.2.2:5000/api';
   ```

4. For iOS Simulator, use:
   ```dart
   return 'http://localhost:5000/api';
   ```

## Testing Network Access

1. **Backend**: Accessible at both:
   - http://localhost:5000/api/health
   - http://192.168.1.6:5000/api/health

2. **Frontend**: 
   - Local: http://localhost:5173
   - Network: http://192.168.1.6:5173 (if VITE_USE_IP=true)

3. **Mobile**: Connect from any device on the same network using the IP address

## Troubleshooting

### Notifications not working on website:
1. Check that Socket.IO is connecting:
   - Open browser console
   - Look for "🧠 Connected to Socket.IO" message
   - Check for any connection errors

2. Verify the socket URL is correct:
   - Check `frontend/.env` has correct `VITE_SOCKET_URL` or `VITE_SOCKET_IP_URL`
   - Restart the frontend dev server after changing .env

3. Check backend is listening on all interfaces:
   - Backend should show: "🚀 My Hub Cares Server running on http://0.0.0.0:5000"

4. Verify CORS is configured correctly:
   - Backend should allow your frontend origin
   - Check browser console for CORS errors

### Connection Issues:
- Make sure all devices are on the same network
- Check Windows Firewall allows connections on port 5000
- Verify the IP address is correct (run `ipconfig` again)

## Finding Your IP Address

- **Windows**: Run `ipconfig` in Command Prompt, look for "IPv4 Address"
- **Mac/Linux**: Run `ifconfig` in Terminal, look for "inet" address
- Usually starts with 192.168.x.x or 10.x.x.x




