// web/src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Button,
} from '@mui/material';
import {
  People as PeopleIcon,
  EventAvailable as AppointmentIcon,
  Warning as WarningIcon,
  Medication as PrescriptionIcon,
  CalendarMonth as CalendarIcon,
  Notifications as BellIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { API_BASE_URL } from '../config/api';

const Dashboard = ({ socket }) => {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Patient-specific data
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [activeReminders, setActiveReminders] = useState([]);
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [todayMedications, setTodayMedications] = useState([]);

  // Admin/Staff data
  const [stats, setStats] = useState({
    totalPatients: 3,
    todayAppointments: 0,
    lowStockAlerts: 1,
    monthlyPrescriptions: 0,
  });

  const [patientRegistrationData, setPatientRegistrationData] = useState([
    { name: 'Jun', patients: 0 },
    { name: 'Jul', patients: 0 },
    { name: 'Aug', patients: 0 },
    { name: 'Sep', patients: 0 },
    { name: 'Oct', patients: 0 },
    { name: 'Nov', patients: 3 },
  ]);

  const [monthlyAppointmentsData, setMonthlyAppointmentsData] = useState([
    { name: 'Jun', appointments: 0 },
    { name: 'Jul', appointments: 0 },
    { name: 'Aug', appointments: 0 },
    { name: 'Sep', appointments: 0 },
    { name: 'Oct', appointments: 0 },
    { name: 'Nov', appointments: 3 },
  ]);

  const [riskDistributionData, setRiskDistributionData] = useState([
    { name: 'Low', value: 33.3, color: '#4caf50' },
    { name: 'Medium', value: 16.7, color: '#ff9800' },
    { name: 'High', value: 33.3, color: '#f44336' },
    { name: 'Critical', value: 16.7, color: '#8b0000' },
  ]);

  const [monthlyPrescriptionsData, setMonthlyPrescriptionsData] = useState([
    { name: 'Jun', prescriptions: 0 },
    { name: 'Jul', prescriptions: 0 },
    { name: 'Aug', prescriptions: 0 },
    { name: 'Sep', prescriptions: 0 },
    { name: 'Oct', prescriptions: 2 },
    { name: 'Nov', prescriptions: 0 },
  ]);

  const [recentActivity, setRecentActivity] = useState([
    { type: 'Follow-up', patient: 'John Doe', date: '10/15/2025', time: '8:00:00 AM', icon: 'calendar', color: '#9c27b0' },
    { type: 'Prescription', patient: 'John Doe', date: '10/15/2025', time: '8:00:00 AM', icon: 'medication', color: '#ec407a' },
    { type: 'Follow-up', patient: 'Maria Santos', date: '10/10/2025', time: '8:00:00 AM', icon: 'calendar', color: '#9c27b0' },
    { type: 'Prescription', patient: 'Maria Santos', date: '10/10/2025', time: '8:00:00 AM', icon: 'medication', color: '#ec407a' },
  ]);

  const [alerts, setAlerts] = useState([]);

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userRole === 'patient' && currentUser) {
      fetchPatientData();
    }
  }, [userRole, currentUser]);

  useEffect(() => {
    // Simulate receiving real-time alerts
    if (socket) {
      socket.on('systemAlert', (alert) => {
        setAlerts((prev) => [alert, ...prev].slice(0, 5)); // Keep only the latest 5 alerts
      });
    }

    return () => {
      if (socket) {
        socket.off('systemAlert');
      }
    };
  }, [socket]);

  const getCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
          setUserRole(data.user.role);
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async () => {
    try {
      const token = getAuthToken();
      if (!token || !currentUser) return;

      const patientId =
        currentUser.patient?.patient_id ||
        currentUser.patient_id ||
        currentUser.patientId;
      if (!patientId) return;

      // Fetch appointments
      const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        if (appointmentsData.success) {
          const now = new Date();
          const upcoming = (appointmentsData.data || [])
            .filter((apt) => {
              const aptDate = new Date(apt.scheduled_start);
              return (
                aptDate >= now &&
                (apt.status === 'scheduled' || apt.status === 'confirmed')
              );
            })
            .sort(
              (a, b) =>
                new Date(a.scheduled_start) - new Date(b.scheduled_start)
            );
          setUpcomingAppointments(upcoming);
        }
      }

      // Fetch prescriptions
      const prescriptionsResponse = await fetch(
        `${API_BASE_URL}/prescriptions?patient_id=${patientId}&status=active`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (prescriptionsResponse.ok) {
        const prescriptionsData = await prescriptionsResponse.json();
        if (prescriptionsData.success) {
          setActivePrescriptions(prescriptionsData.data || []);

          // Build today's medications from prescriptions
          const today = new Date();
          const todayMeds = [];
          (prescriptionsData.data || []).forEach((prescription) => {
            if (prescription.items && prescription.items.length > 0) {
              prescription.items.forEach((item) => {
                // Extract time from frequency or use default
                let reminderTime = '09:00';
                if (item.frequency) {
                  const timeMatch = item.frequency.match(/(\d{1,2}):(\d{2})/);
                  if (timeMatch) {
                    reminderTime = timeMatch[0];
                  }
                }

                todayMeds.push({
                  medication_name: item.medication_name || 'Medication',
                  dosage: item.dosage || '',
                  frequency: item.frequency || 'daily',
                  reminder_time: reminderTime,
                  prescription_id: prescription.prescription_id,
                });
              });
            }
          });
          setTodayMedications(todayMeds);
        }
      }

      // Fetch reminders (from medication adherence)
      const remindersResponse = await fetch(
        `${API_BASE_URL}/prescriptions?patient_id=${patientId}&status=active`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (remindersResponse.ok) {
        const remindersData = await remindersResponse.json();
        if (remindersData.success) {
          const activeRemindersList = [];
          (remindersData.data || []).forEach((prescription) => {
            if (prescription.items && prescription.items.length > 0) {
              prescription.items.forEach((item) => {
                activeRemindersList.push({
                  medication_name: item.medication_name,
                  reminder_time: item.frequency || 'daily',
                });
              });
            }
          });
          setActiveReminders(activeRemindersList);
        }
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <Card sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderRadius: '8px',
    }}>
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography 
              variant="h4" 
              component="h2" 
              sx={{ 
                fontWeight: 700, 
                color: '#333',
                mb: 0.5,
                fontSize: '32px',
              }}
            >
              {value}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666',
                fontSize: '14px',
              }}
            >
              {title}
            </Typography>
          </Box>
          <Box sx={{ color, fontSize: '40px' }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Patient Dashboard
  if (userRole === 'patient') {
    const userName =
      currentUser?.full_name || currentUser?.username || 'Patient';
    const upcomingCount = upcomingAppointments.length;
    const remindersCount = activeReminders.length;
    const prescriptionsCount = activePrescriptions.length;

    return (
      <Box
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          backgroundColor: 'white',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {/* Welcome Header */}
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: '#A31D1D', mb: 1 }}
          >
            Welcome back, {userName.split(' ')[0]}!
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: '#A31D1D', fontSize: '1.1rem' }}
          >
            Here's your health summary
          </Typography>
        </Box>

        {/* Summary Cards */}
        <Grid
          container
          spacing={{ xs: 2, sm: 3 }}
          sx={{ mb: { xs: 3, sm: 4 } }}
        >
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: { xs: 2, sm: 3 },
                }}
              >
                <Box>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: '#A31D1D', mb: 1 }}
                  >
                    {upcomingCount}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#666' }}>
                    Upcoming Appointments
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background:
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CalendarIcon sx={{ color: '#FFFFFF', fontSize: 28 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: { xs: 2, sm: 3 },
                }}
              >
                <Box>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: '#A31D1D', mb: 1 }}
                  >
                    {remindersCount}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#666' }}>
                    Active Reminders
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background:
                      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BellIcon sx={{ color: '#FFFFFF', fontSize: 28 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: { xs: 2, sm: 3 },
                }}
              >
                <Box>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: '#A31D1D', mb: 1 }}
                  >
                    {prescriptionsCount}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#666' }}>
                    Active Prescriptions
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background:
                      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PrescriptionIcon sx={{ color: '#FFFFFF', fontSize: 28 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Sections */}
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Upcoming Appointments */}
          <Grid item xs={12} lg={6}>
            <Paper
              sx={{
                p: { xs: 2, sm: 3 },
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: '#333' }}
                >
                  Upcoming Appointments
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/my-appointments')}
                  sx={{
                    backgroundColor: '#D84040',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    textTransform: 'none',
                    px: 2,
                    '&:hover': {
                      backgroundColor: '#B82D2D',
                    },
                  }}
                >
                  Book Appointment
                </Button>
              </Box>
              {upcomingAppointments.length === 0 ? (
                <Typography sx={{ color: '#666', mt: 2 }}>
                  No upcoming appointments
                </Typography>
              ) : (
                <Box>
                  {upcomingAppointments.slice(0, 3).map((apt, index) => {
                    const aptDate = new Date(apt.scheduled_start);
                    return (
                      <Box
                        key={apt.appointment_id || index}
                        sx={{
                          mb: 2,
                          p: 2,
                          backgroundColor: '#F8F2DE',
                          borderRadius: '8px',
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}
                        >
                          {apt.facility_name || 'Appointment'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {aptDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}{' '}
                          at{' '}
                          {aptDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Today's Medications */}
          <Grid item xs={12} lg={6}>
            <Paper
              sx={{
                p: { xs: 2, sm: 3 },
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: '#A31D1D', mb: 2 }}
              >
                Today's Medications
              </Typography>
              {todayMedications.length === 0 ? (
                <Typography sx={{ color: '#666', mt: 2 }}>
                  No medications scheduled for today
                </Typography>
              ) : (
                <Box>
                  {todayMedications.map((med, index) => (
                    <Box
                      key={index}
                      sx={{
                        mb: 2,
                        p: 2,
                        backgroundColor: '#F8F2DE',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}
                        >
                          {med.medication_name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Take at {med.reminder_time} daily
                        </Typography>
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{
                          color: '#D84040',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                        }}
                      >
                        {med.reminder_time}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Admin/Staff Dashboard (existing)
  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, sm: 3 },
        width: '100%',
        overflowX: 'hidden',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#333',
            mb: 0.5,
            fontSize: { xs: '24px', sm: '28px' },
            marginTop: '80px'
          }}
        >
          Dashboard Overview
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: '#666',
            fontSize: '14px',
          }}
        >
          Real-time system statistics and alerts
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 1, sm: 1 }}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} lg={3} sx={{ ml: 12.5 }}>
  <StatCard
    title="Total Patients"
    value={stats.totalPatients}
    icon={<PeopleIcon sx={{ fontSize: 40, width: '112px' }} />}
    color="#9c27b0"
  />
</Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Today's Appointments"
            value={stats.todayAppointments}
            icon={<AppointmentIcon sx={{ fontSize: 40, width: '34px' }} />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Low Stock Alerts"
            value={stats.lowStockAlerts}
            icon={<WarningIcon sx={{ fontSize: 40, width: '70px' }} />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Prescriptions This Month"
            value={stats.monthlyPrescriptions}
            icon={<PrescriptionIcon sx={{ fontSize: 40, width: '45px' }} />}
            color="#ec407a"
          />
        </Grid>

        {/* Charts */}
        <Grid item xs={12} lg={6} sx={{ mt: 1 }}>
          <Paper sx={{ 
            p: 3, 
            height: { xs: 300, sm: 350, md: 400 },
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            minHeight: '200px', 
            width: '500px',
            marginLeft: '100px',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
              Patient Enrollment Trend
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 2, fontSize: '12px' }}>
              Last 6 Months
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={patientRegistrationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis domain={[0, 3]} stroke="#666" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="patients"
                  stroke="#1976d2"
                  fill="#1976d2"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

          <Grid item xs={12} lg={6} sx={{ mt: 1 }}>
          <Paper sx={{ 
            p: 3, 
            height: { xs: 300, sm: 350, md: 400 },
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            minHeight: '200px', 
            width: '500px',
            marginRight: '90px',  
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
              Monthly Appointments
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 2, fontSize: '12px' }}>
              Last 6 Months
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={monthlyAppointmentsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis domain={[0, 3]} stroke="#666" />
                <Tooltip />
                <Bar dataKey="appointments" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={{ 
            p: 3, 
            height: { xs: 300, sm: 350, md: 400 },
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            minHeight: '200px', 
            width: '500px',
            marginLeft: '100px'   
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', mb: 2 }}>
              Risk Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(1)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                mt: 1,
                color: '#666',
                fontWeight: 600,
              }}
            >
              Total 6
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Paper sx={{ 
            p: 3, 
            height: { xs: 300, sm: 350, md: 400 },
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            minHeight: '200px', 
            width: '500px',
            marginRight: '80px', 
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
              Monthly Prescriptions
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', mb: 2, fontSize: '12px' }}>
              Last 6 Months
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <AreaChart data={monthlyPrescriptionsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#666" />
                <YAxis domain={[0, 2]} stroke="#666" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="prescriptions"
                  stroke="#9c27b0"
                  fill="#9c27b0"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* System Alerts Card */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              width: '1009px',
              marginLeft: '100px',
              marginTop: '10px'
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#333',
                mb: 2,
              }}
            >
              System Alerts
            </Typography>
            <Paper
              sx={{
                p: 2,
                backgroundColor: '#fff9c4',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography sx={{ color: '#8b4513', fontSize: '14px' }}>
                {stats.lowStockAlerts} medication(s) are low in stock
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/inventory')}
                sx={{
                  textTransform: 'none',
                  backgroundColor: '#f5f5f5',
                  borderColor: '#d0d0d0',
                  color: '#333',
                  fontSize: '12px',
                  px: 2,
                  py: 0.5,
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: '#e8e8e8',
                    borderColor: '#b0b0b0',
                  },
                }}
              >
                View
              </Button>
            </Paper>
          </Paper>
        </Grid>

        {/* Recent Activity Card */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              borderRadius: '8px',
               width: '1009px',
              marginLeft: '100px',
              marginTop: '5px'
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#333',
                mb: 2,
              }}
            >
              Recent Activity
            </Typography>
            <Box>
              {recentActivity.map((activity, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    pb: 2,
                    mb: 2,
                    borderBottom: index < recentActivity.length - 1 ? '1px solid #e0e0e0' : 'none',
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: activity.color + '20',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    {activity.icon === 'calendar' ? (
                      <CalendarIcon sx={{ color: activity.color, fontSize: 20 }} />
                    ) : (
                      <PrescriptionIcon sx={{ color: activity.color, fontSize: 20 }} />
                    )}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ color: '#333', fontWeight: 600, fontSize: '14px', mb: 0.5 }}>
                      {activity.type === 'Prescription' ? `New prescription for ${activity.patient}` : `${activity.patient} - ${activity.type}`}
                    </Typography>
                    <Typography sx={{ color: '#666', fontSize: '12px' }}>
                      {activity.date}, {activity.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
