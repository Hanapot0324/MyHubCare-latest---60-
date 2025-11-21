// web/src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

import Login from './components/Login.jsx';
import PatientRegistration from './components/Register.jsx';
import Dashboard from './components/Dashboard.jsx';
import MainLayout from './components/Main.jsx';
import Appointments from './components/Appointment.jsx';
import ClinicalVisits from './components/ClinicalVisit.jsx';
import Inventory from './components/Inventory.jsx';
import Prescriptions from './components/Prescriptions.jsx';
import ARTRegimenManagement from './components/ArtRegimentManagement.jsx';
import LabTests from './components/LabTest.jsx';
import HTSSessions from './components/HTSSessions.jsx';
import Counseling from './components/Counseling.jsx';
import Referrals from './components/Referrals.jsx';
import Patients from './components/Patient.jsx';
import BranchManagement from './components/BranchManagement.jsx';
import Profile from './components/Profile.jsx';
import Settings from './components/Settings.jsx';
import MedicationAdherence from './components/MedicationAdherence.jsx';
import Medications from './components/Medications.jsx';
import MyAppointments from './components/MyAppointments.jsx';
import CareTasks from './components/CareTasks.jsx';
import Reports from './components/Reports.jsx';
import AuditTrail from './components/AuditTrail.jsx';
import Education from './components/Education.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { SOCKET_URL } from './config/api';

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
}); // global socket

const theme = createTheme({
  palette: {
    primary: {
      main: '#B82132',
      dark: '#8B1A26',
      light: '#D2665A',
    },
    secondary: {
      main: '#D2665A',
      light: '#F2B28C',
    },
    accent: {
      main: '#F2B28C',
      light: '#F6DED8',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export default function App() {
  useEffect(() => {
    socket.on('connect', () => {
      console.log('🧠 Connected to Socket.IO:', socket.id);
      console.log('🔗 Socket URL:', socket.io.uri);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    socket.on('newNotification', (data) => {
      console.log('📩 Real-time notification:', data);
    });

    return () => {
      // Don't disconnect socket here as it's used by other components
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('newNotification');
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login socket={socket} />} />
          <Route
            path="/register"
            element={<PatientRegistration socket={socket} />}
          />
          <Route
            path="/dashboard"
            element={
              <MainLayout socket={socket}>
                <Dashboard socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/patient"
            element={
              <MainLayout socket={socket}>
                <Patients socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/appointments"
            element={
              <MainLayout socket={socket}>
                <Appointments socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/clinical-visit"
            element={
              <MainLayout socket={socket}>
                <ClinicalVisits socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/inventory"
            element={
              <MainLayout socket={socket}>
                <Inventory socket={socket} />
              </MainLayout>
            }
          />

          <Route
            path="/prescriptions"
            element={
              <MainLayout socket={socket}>
                <Prescriptions socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/medications"
            element={
              <MainLayout socket={socket}>
                <Medications socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/art-regimen"
            element={
              <MainLayout socket={socket}>
                <ARTRegimenManagement socket={socket} />
              </MainLayout>
            }
          />

          <Route
            path="/lab-test"
            element={
              <MainLayout socket={socket}>
                <LabTests socket={socket} />
              </MainLayout>
            }
          />

          <Route
            path="/hts-sessions"
            element={
              <MainLayout socket={socket}>
                <HTSSessions socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/counseling"
            element={
              <MainLayout socket={socket}>
                <Counseling socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/referrals"
            element={
              <MainLayout socket={socket}>
                <Referrals socket={socket} />
              </MainLayout>
            }
          />

          <Route
            path="/branch-management"
            element={
              <MainLayout socket={socket}>
                <BranchManagement socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <MainLayout socket={socket}>
                <Profile socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <MainLayout socket={socket}>
                <Settings socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/medication-adherence"
            element={
              <MainLayout socket={socket}>
                <MedicationAdherence socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/my-appointments"
            element={
              <MainLayout socket={socket}>
                <ProtectedRoute allowedRoles={['patient']}>
                  <MyAppointments socket={socket} />
                </ProtectedRoute>
              </MainLayout>
            }
          />
          <Route
            path="/care-tasks"
            element={
              <MainLayout socket={socket}>
                <CareTasks socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/reports"
            element={
              <MainLayout socket={socket}>
                <Reports socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/audit-trail"
            element={
              <MainLayout socket={socket}>
                <AuditTrail socket={socket} />
              </MainLayout>
            }
          />
          <Route
            path="/education"
            element={
              <MainLayout socket={socket}>
                <Education socket={socket} />
              </MainLayout>
            }
          />

          
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
