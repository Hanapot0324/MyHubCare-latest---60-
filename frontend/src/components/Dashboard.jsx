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
  Button
} from '@mui/material';
import {
  People as PeopleIcon,
  EventAvailable as AppointmentIcon,
  Warning as WarningIcon,
  Medication as PrescriptionIcon,
  CalendarMonth as CalendarIcon,
  Notifications as BellIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
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
    lowStockAlerts: 0,
    monthlyPrescriptions: 0
  });

  const [patientRegistrationData, setPatientRegistrationData] = useState([
    { name: 'Jan', patients: 2 },
    { name: 'Feb', patients: 3 },
    { name: 'Mar', patients: 5 },
    { name: 'Apr', patients: 4 },
    { name: 'May', patients: 6 },
    { name: 'Jun', patients: 8 }
  ]);

  const [monthlyAppointmentsData, setMonthlyAppointmentsData] = useState([
    { name: 'Jan', appointments: 10 },
    { name: 'Feb', appointments: 15 },
    { name: 'Mar', appointments: 12 },
    { name: 'Apr', appointments: 18 },
    { name: 'May', appointments: 14 },
    { name: 'Jun', appointments: 20 }
  ]);

  const [riskDistributionData, setRiskDistributionData] = useState([
    { name: 'Low', value: 60, color: '#4caf50' },
    { name: 'Medium', value: 30, color: '#ff9800' },
    { name: 'High', value: 10, color: '#f44336' }
  ]);

  const [monthlyPrescriptionsData, setMonthlyPrescriptionsData] = useState([
    { name: 'Jan', prescriptions: 5 },
    { name: 'Feb', prescriptions: 8 },
    { name: 'Mar', prescriptions: 7 },
    { name: 'Apr', prescriptions: 10 },
    { name: 'May', prescriptions: 9 },
    { name: 'Jun', prescriptions: 12 }
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
        setAlerts(prev => [alert, ...prev].slice(0, 5)); // Keep only the latest 5 alerts
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
        headers: { Authorization: `Bearer ${token}` }
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

      const patientId = currentUser.patient?.patient_id || currentUser.patient_id || currentUser.patientId;
      if (!patientId) return;

      // Fetch appointments
      const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        if (appointmentsData.success) {
          const now = new Date();
          const upcoming = (appointmentsData.data || []).filter(apt => {
            const aptDate = new Date(apt.scheduled_start);
            return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
          }).sort((a, b) => new Date(a.scheduled_start) - new Date(b.scheduled_start));
          setUpcomingAppointments(upcoming);
        }
      }

      // Fetch prescriptions
      const prescriptionsResponse = await fetch(`${API_BASE_URL}/prescriptions?patient_id=${patientId}&status=active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (prescriptionsResponse.ok) {
        const prescriptionsData = await prescriptionsResponse.json();
        if (prescriptionsData.success) {
          setActivePrescriptions(prescriptionsData.data || []);
          
          // Build today's medications from prescriptions
          const today = new Date();
          const todayMeds = [];
          (prescriptionsData.data || []).forEach(prescription => {
            if (prescription.items && prescription.items.length > 0) {
              prescription.items.forEach(item => {
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
                  prescription_id: prescription.prescription_id
                });
              });
            }
          });
          setTodayMedications(todayMeds);
        }
      }

      // Fetch reminders (from medication adherence)
      const remindersResponse = await fetch(`${API_BASE_URL}/prescriptions?patient_id=${patientId}&status=active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (remindersResponse.ok) {
        const remindersData = await remindersResponse.json();
        if (remindersData.success) {
          const activeRemindersList = [];
          (remindersData.data || []).forEach(prescription => {
            if (prescription.items && prescription.items.length > 0) {
              prescription.items.forEach(item => {
                activeRemindersList.push({
                  medication_name: item.medication_name,
                  reminder_time: item.frequency || 'daily'
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
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" alignItems="center">
          <Box sx={{ mr: 2, color }}>
            {icon}
          </Box>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Patient Dashboard
  if (userRole === 'patient') {
    const userName = currentUser?.full_name || currentUser?.username || 'Patient';
    const upcomingCount = upcomingAppointments.length;
    const remindersCount = activeReminders.length;
    const prescriptionsCount = activePrescriptions.length;

    return (
      <Box sx={{ 
        flexGrow: 1, 
        p: 3, 
        backgroundColor: '#F5F5F5',
        minHeight: '100vh'
      }}>
        {/* Welcome Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#333', mb: 1 }}>
            Welcome back, {userName.split(' ')[0]}!
          </Typography>
          <Typography variant="body1" sx={{ color: '#666', fontSize: '1.1rem' }}>
            Here's your health summary
          </Typography>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ 
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: '#333', mb: 1 }}>
                    {upcomingCount}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#666' }}>
                    Upcoming Appointments
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CalendarIcon sx={{ color: '#FFFFFF', fontSize: 28 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ 
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: '#333', mb: 1 }}>
                    {remindersCount}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#666' }}>
                    Active Reminders
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BellIcon sx={{ color: '#FFFFFF', fontSize: 28 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ 
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CardContent sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: '#333', mb: 1 }}>
                    {prescriptionsCount}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#666' }}>
                    Active Prescriptions
                  </Typography>
                </Box>
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <PrescriptionIcon sx={{ color: '#FFFFFF', fontSize: 28 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Sections */}
        <Grid container spacing={3}>
          {/* Upcoming Appointments */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: 3, 
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#333' }}>
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
                    }
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
                      <Box key={apt.appointment_id || index} sx={{ 
                        mb: 2, 
                        p: 2, 
                        backgroundColor: '#F8F2DE',
                        borderRadius: '8px'
                      }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
                          {apt.facility_name || 'Appointment'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          {aptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {aptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Today's Medications */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: 3, 
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#333', mb: 2 }}>
                Today's Medications
              </Typography>
              {todayMedications.length === 0 ? (
                <Typography sx={{ color: '#666', mt: 2 }}>
                  No medications scheduled for today
                </Typography>
              ) : (
                <Box>
                  {todayMedications.map((med, index) => (
                    <Box key={index} sx={{ 
                      mb: 2, 
                      p: 2, 
                      backgroundColor: '#F8F2DE',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
                          {med.medication_name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#666' }}>
                          Take at {med.reminder_time} daily
                        </Typography>
                      </Box>
                      <Typography variant="h6" sx={{ 
                        color: '#D84040', 
                        fontWeight: 700,
                        fontSize: '1.1rem'
                      }}>
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
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Patients"
            value={stats.totalPatients}
            icon={<PeopleIcon fontSize="large" />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Appointments"
            value={stats.todayAppointments}
            icon={<AppointmentIcon fontSize="large" />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Low Stock Alerts"
            value={stats.lowStockAlerts}
            icon={<WarningIcon fontSize="large" />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Prescriptions"
            value={stats.monthlyPrescriptions}
            icon={<PrescriptionIcon fontSize="large" />}
            color="#9c27b0"
          />
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Patient Registration Trend
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={patientRegistrationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="patients" stroke="#1976d2" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Appointments
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAppointmentsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="appointments" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Risk Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 300 }}>
            <Typography variant="h6" gutterBottom>
              Monthly Prescriptions
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyPrescriptionsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="prescriptions" stroke="#9c27b0" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* System Alerts */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              System Alerts
            </Typography>
            {alerts.length === 0 ? (
              <Alert severity="info">
                <AlertTitle>No alerts</AlertTitle>
                All systems are running normally.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alerts.map((alert, index) => (
                      <TableRow key={index}>
                        <TableCell>{alert.time}</TableCell>
                        <TableCell>
                          <Alert severity={alert.severity} sx={{ py: 0 }}>
                            {alert.type}
                          </Alert>
                        </TableCell>
                        <TableCell>{alert.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
