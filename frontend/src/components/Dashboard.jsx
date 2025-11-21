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
  Refresh as RefreshIcon,
  Download as DownloadIcon,
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
    totalPatients: 0,
    todayAppointments: 0,
    lowStockAlerts: 0,
    monthlyPrescriptions: 0,
  });

  const [patientRegistrationData, setPatientRegistrationData] = useState([]);
  const [monthlyAppointmentsData, setMonthlyAppointmentsData] = useState([]);
  const [riskDistributionData, setRiskDistributionData] = useState([]);
  const [monthlyPrescriptionsData, setMonthlyPrescriptionsData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

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
    } else if (userRole && ['admin', 'physician', 'nurse', 'case_manager'].includes(userRole)) {
      fetchDashboardData();
    }
  }, [userRole, currentUser]);

  const fetchDashboardData = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      // Fetch all dashboard data in parallel
      const [
        overviewResponse,
        patientRegResponse,
        appointmentsResponse,
        prescriptionsResponse,
        riskResponse,
        activityResponse,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/reports/dashboard/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/reports/dashboard/patient-registration-trends?months=6`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/reports/dashboard/monthly-appointments?months=6`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/reports/dashboard/monthly-prescriptions?months=6`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/reports/dashboard/risk-distribution`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/reports/dashboard/recent-activity?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Process overview stats
      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        if (overviewData.success && overviewData.stats) {
          setStats(overviewData.stats);
        }
      }

      // Process patient registration trends
      if (patientRegResponse.ok) {
        const regData = await patientRegResponse.json();
        if (regData.success && regData.data) {
          setPatientRegistrationData(regData.data);
        }
      }

      // Process monthly appointments
      if (appointmentsResponse.ok) {
        const aptData = await appointmentsResponse.json();
        if (aptData.success && aptData.data) {
          setMonthlyAppointmentsData(aptData.data);
        }
      }

      // Process monthly prescriptions
      if (prescriptionsResponse.ok) {
        const presData = await prescriptionsResponse.json();
        if (presData.success && presData.data) {
          setMonthlyPrescriptionsData(presData.data);
        }
      }

      // Process risk distribution
      if (riskResponse.ok) {
        const riskData = await riskResponse.json();
        if (riskData.success && riskData.data) {
          // Calculate percentages if total is provided
          const total = riskData.total || riskData.data.reduce((sum, item) => sum + item.value, 0);
          const formattedData = riskData.data.map(item => ({
            ...item,
            value: total > 0 ? (item.value / total) * 100 : 0,
            count: item.value, // Store original count
          }));
          setRiskDistributionData(formattedData);
        }
      }

      // Process recent activity
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        if (activityData.success && activityData.data) {
          setRecentActivity(activityData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

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
      <div
        style={{
          padding: '20px',
          backgroundColor: 'white',
          minHeight: '100vh',
          paddingTop: '100px',
        }}
      >
        {/* Header with Title - Consistent with Patients.jsx */}
        <div style={{ 
          marginBottom: '30px', 
          background: 'linear-gradient(to right, #D84040, #A31D1D)', 
          padding: '30px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 15px rgba(216, 64, 64, 0.2)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                Welcome back, {userName.split(' ')[0]}!
              </h2>
              <p style={{ margin: 0, color: '#F8F2DE', fontSize: '16px' }}>
                Here's your health summary
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigate('/my-appointments')}
                style={{
                  padding: '10px 16px',
                  background: '#ECDCBF',
                  color: '#A31D1D',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#F8F2DE';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ECDCBF';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px',
                }}
              >
                <div>
                  <h3
                    style={{ fontWeight: 700, color: '#A31D1D', margin: '0 0 5px 0', fontSize: '32px' }}
                  >
                    {upcomingCount}
                  </h3>
                  <p style={{ color: '#666', margin: 0 }}>
                    Upcoming Appointments
                  </p>
                </div>
                <div
                  style={{
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
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: '1', minWidth: '300px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px',
                }}
              >
                <div>
                  <h3
                    style={{ fontWeight: 700, color: '#A31D1D', margin: '0 0 5px 0', fontSize: '32px' }}
                  >
                    {remindersCount}
                  </h3>
                  <p style={{ color: '#666', margin: 0 }}>
                    Active Reminders
                  </p>
                </div>
                <div
                  style={{
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
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: '1', minWidth: '300px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px',
                }}
              >
                <div>
                  <h3
                    style={{ fontWeight: 700, color: '#A31D1D', margin: '0 0 5px 0', fontSize: '32px' }}
                  >
                    {prescriptionsCount}
                  </h3>
                  <p style={{ color: '#666', margin: 0 }}>
                    Active Prescriptions
                  </p>
                </div>
                <div
                  style={{
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Sections */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {/* Upcoming Appointments */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div
              style={{
                padding: '20px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <h3
                  style={{ fontWeight: 700, color: '#333', margin: 0 }}
                >
                  Upcoming Appointments
                </h3>
                <button
                  onClick={() => navigate('/my-appointments')}
                  style={{
                    padding: '8px 16px',
                    background: '#D84040',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  View All
                </button>
              </div>
              {upcomingAppointments.length === 0 ? (
                <p style={{ color: '#666', marginTop: '15px' }}>
                  No upcoming appointments
                </p>
              ) : (
                <div>
                  {upcomingAppointments.slice(0, 3).map((apt, index) => {
                    const aptDate = new Date(apt.scheduled_start);
                    return (
                      <div
                        key={apt.appointment_id || index}
                        style={{
                          marginBottom: '15px',
                          padding: '15px',
                          backgroundColor: '#F8F2DE',
                          borderRadius: '8px',
                        }}
                      >
                        <h4
                          style={{ fontWeight: 600, color: '#333', margin: '0 0 5px 0' }}
                        >
                          {apt.facility_name || 'Appointment'}
                        </h4>
                        <p style={{ color: '#666', margin: 0 }}>
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
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Today's Medications */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div
              style={{
                padding: '20px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h3
                style={{ fontWeight: 700, color: '#A31D1D', margin: '0 0 15px 0' }}
              >
                Today's Medications
              </h3>
              {todayMedications.length === 0 ? (
                <p style={{ color: '#666', marginTop: '15px' }}>
                  No medications scheduled for today
                </p>
              ) : (
                <div>
                  {todayMedications.map((med, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: '15px',
                        padding: '15px',
                        backgroundColor: '#F8F2DE',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div>
                        <h4
                          style={{ fontWeight: 600, color: '#333', margin: '0 0 5px 0' }}
                        >
                          {med.medication_name}
                        </h4>
                        <p style={{ color: '#666', margin: 0 }}>
                          Take at {med.reminder_time} daily
                        </p>
                      </div>
                      <h4
                        style={{
                          color: '#D84040',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          margin: 0,
                        }}
                      >
                        {med.reminder_time}
                      </h4>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin/Staff Dashboard
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        minHeight: '100vh',
        paddingTop: '100px',
      }}
    >
      <div style={{ 
        marginBottom: '30px', 
        background: 'linear-gradient(to right, #D84040, #A31D1D)', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 15px rgba(216, 64, 64, 0.2)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>Dashboard Overview</h2>
            <p style={{ margin: 0, color: '#F8F2DE', fontSize: '16px' }}>Real-time system statistics and alerts</p>
          </div>
        </div>
      </div>

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
              {patientRegistrationData.length > 0 ? (
                <AreaChart data={patientRegistrationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="patients"
                    stroke="#1976d2"
                    fill="#1976d2"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    No patient registration data available
                  </Typography>
                </Box>
              )}
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
              {monthlyAppointmentsData.length > 0 ? (
                <BarChart data={monthlyAppointmentsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip />
                  <Bar dataKey="appointments" fill="#4caf50" />
                </BarChart>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    No appointment data available
                  </Typography>
                </Box>
              )}
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
              {riskDistributionData.length > 0 ? (
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
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    No risk distribution data available
                  </Typography>
                </Box>
              )}
            </ResponsiveContainer>
            {riskDistributionData.length > 0 && (
              <Typography
                variant="body2"
                sx={{
                  textAlign: 'center',
                  mt: 1,
                  color: '#666',
                  fontWeight: 600,
                }}
              >
                Total {stats.totalPatients || 0}
              </Typography>
            )}
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
              {monthlyPrescriptionsData.length > 0 ? (
                <AreaChart data={monthlyPrescriptionsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="prescriptions"
                    stroke="#9c27b0"
                    fill="#9c27b0"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    No prescription data available
                  </Typography>
                </Box>
              )}
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
              {recentActivity.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No recent activity
                </Typography>
              ) : (
                recentActivity.map((activity, index) => (
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
              )))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;