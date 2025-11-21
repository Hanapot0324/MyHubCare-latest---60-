import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
import authRoutes from './routes/auth.js';
import mfaRoutes from './routes/mfa.js';
import patientRoutes from './routes/patient.js';
import patientDocumentsRoutes from './routes/patient-documents.js';
import arpaRoutes from './routes/arpa.js';
import facilityRoutes from './routes/facilities.js';
import regionRoutes from './routes/regions.js';
import inventoryRoutes from './routes/inventory.js';
import prescriptionsRoutes from './routes/prescriptions.js';
import medicationsRoutes from './routes/medications.js';
import clinicalRoutes from './routes/clinical-visits.js';
import adherenceRoutes from './routes/medication-adherence.js';
import profileRoutes from './routes/profile.js';
import usersRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import permissionsRoutes from './routes/permissions.js';
import labOrdersRoutes from './routes/lab-orders.js';
import labResultsRoutes from './routes/lab-results.js';
import labFilesRoutes from './routes/lab-files.js';
import appointmentsRoutes, { setSocketIO } from './routes/appointments.js';
import notificationsRoutes from './routes/notifications.js';
import faqsRoutes from './routes/faqs.js';
import referralsRoutes from './routes/referrals.js';
import counselingSessionsRoutes from './routes/counseling-sessions.js';
import htsSessionsRoutes from './routes/hts-sessions.js';
import careTasksRoutes from './routes/care-tasks.js';
import reportsRoutes from './routes/reports.js';
import { processAppointmentReminders } from './services/reminderService.js';

const app = express();
const server = http.createServer(app);

// CORS configuration - allow both localhost and IP
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_IP,
].filter(Boolean);

const io = new Server(server, {
  cors: { 
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    credentials: true
  },
});

// Set Socket.IO instance for appointments route
setSocketIO(io);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now, can restrict later
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/patient-documents', patientDocumentsRoutes);
app.use('/api/arpa', arpaRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/medications', medicationsRoutes);
app.use('/api/clinical-visits', clinicalRoutes);
app.use('/api/medication-adherence', adherenceRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/lab-orders', labOrdersRoutes);
app.use('/api/lab-results', labResultsRoutes);
app.use('/api/lab-files', labFilesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/counseling-sessions', counselingSessionsRoutes);
app.use('/api/hts-sessions', htsSessionsRoutes);
app.use('/api/care-tasks', careTasksRoutes);
app.use('/api/reports', reportsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'My Hub Cares API is running' });
});

// 🔌 SOCKET.IO REALTIME CONNECTION
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });

  socket.on('sendNotification', (data) => {
    console.log('📢 Notification:', data);
    io.emit('newNotification', data);
  });

  // Join room by user ID
  socket.on('joinRoom', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  // Join patient room for appointment notifications
  socket.on('joinPatientRoom', (patientId) => {
    socket.join(`patient_${patientId}`);
    console.log(`👤 Patient ${patientId} joined their room`);
  });

  // Send notification to specific user
  socket.on('sendToUser', ({ userId, notification }) => {
    io.to(`user_${userId}`).emit('newNotification', notification);
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces

server.listen(PORT, HOST, () => {
  const localIP = process.env.SERVER_IP?.replace('http://', '').replace(':5000', '') || 'localhost';
  console.log(`🚀 My Hub Cares Server running:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://${localIP}:${PORT}`);
  console.log(`   - Socket.IO: ws://${localIP}:${PORT}`);
  
  // Start reminder processing interval (every minute)
  setInterval(async () => {
    try {
      await processAppointmentReminders();
    } catch (error) {
      console.error('Error processing reminders:', error);
    }
  }, 60000); // Run every 60 seconds (1 minute)
  
  console.log('⏰ Reminder service started (checking every minute)');
});
