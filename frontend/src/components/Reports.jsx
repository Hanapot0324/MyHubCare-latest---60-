import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { FileText, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

const Reports = ({ socket }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Sample data for charts (in production, this would come from API)
  const patientDemographicsData = [
    { name: 'Male', value: 66.7, color: '#1976d2' },
    { name: 'Female', value: 33.3, color: '#ec407a' },
  ];

  const adherenceTrendsData = [
    { name: 'Jan', value: 20 },
    { name: 'Feb', value: 25 },
    { name: 'Mar', value: 30 },
    { name: 'Apr', value: 28 },
    { name: 'May', value: 85 },
  ];

  const inventoryLevelsData = [
    { name: 'Tenofovir/Lamivudine', value: 500 },
    { name: 'Efavirenz 600mg', value: 250 },
    { name: 'Atazanavir 300mg', value: 80 },
    { name: 'Lopinavir 100mg', value: 150 },
    { name: 'Dolutegravir', value: 750 },
  ];

  const appointmentAttendanceData = [
    { name: 'Completed', value: 33.3, color: '#4caf50' },
    { name: 'Scheduled', value: 66.7, color: '#1976d2' },
  ];

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Get current user
  const getCurrentUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setUserRole(user.role);
      } else {
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
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Check access
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!['admin', 'physician'].includes(userRole)) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 2, backgroundColor: '#f8d7da', color: '#721c24' }}>
          Access denied. Only administrators and physicians can access reports.
        </Paper>
      </Box>
    );
  }

  // Handle report generation
  const handleGenerateReport = (reportType) => {
    setToast({
      message: `${reportType} report generation started...`,
      type: 'success',
    });
    // In production, this would trigger actual report generation
  };

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, sm: 3 },
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
                System Reports
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#666',
                  fontSize: '14px',
                }}
              >
                Comprehensive analytics and visualizations
              </Typography>
            </Box>

      {/* System Reports Section - Charts */}
      <Grid container spacing={1} sx={{ mb: 4, maxWidth: '1900px', mx: 'auto' }}>
        {/* Patient Demographics */}
        <Grid item xs={12} sm={6} lg={6}>
          <Card
            sx={{
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              minHeight: '200px',  // Reduced from 320px
              width: '500px',
              marginLeft: '100px'   
              // Reduced from 600px
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  mb: 2,
                  fontSize: '16px',
                }}
              >
                Patient Demographics
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={patientDemographicsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value}%)`}
                    outerRadius={75}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {patientDemographicsData.map((entry, index) => (
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
                Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Adherence Trends */}
        <Grid item xs={12} sm={6} lg={6}>
          <Card
            sx={{
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              minHeight: '200px',  // Reduced from 320px
              width: '500px',   
              marginRight: '90px',   // Reduced from 600px
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  mb: 2,
                  fontSize: '16px',
                }}
              >
                Adherence Trends
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={adherenceTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#666"
                    label={{ value: 'Adherence Rate (%)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4caf50"
                    strokeWidth={2}
                    dot={{ fill: '#4caf50', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Levels */}
        <Grid item xs={12} sm={6} lg={6}>
          <Card
            sx={{
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              minHeight: '200px',  // Reduced from 320px
              width: '500px',
              marginLeft: '100px'   
              // Reduced from 600px
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  mb: 2,
                  fontSize: '16px',
                }}
              >
                Inventory Levels
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={inventoryLevelsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="name"
                    stroke="#666"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={10}
                  />
                  <YAxis
                    domain={[0, 800]}
                    stroke="#666"
                    label={{ value: 'Stock Levels', angle: 90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ff9800" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Appointment Attendance */}
        <Grid item xs={12} sm={6} lg={6}>
          <Card
            sx={{
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              minHeight: '200px',  // Reduced from 320px
              width: '500px',   
            
              marginRight: '90px',   // Reduced from 600px
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  mb: 2,
                  fontSize: '16px',
                }}
              >
                Appointment Attendance
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={appointmentAttendanceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value}%)`}
                    outerRadius={75}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {appointmentAttendanceData.map((entry, index) => (
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
                Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Report Generation Section */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          color: '#333',
          mb: 3,
          fontSize: { xs: '20px', sm: '24px' },
        }}
      >
        Report Generation
      </Typography>

      <Grid container spacing={1}>
        {/* Patient Statistics */}
        <Grid item xs={12} sm={6} md={6}>
          <Card
            sx={{
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              width: '300px'
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  mb: 1,
                  fontSize: '18px',
                }}
              >
                Patient Statistics
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#666',
                  mb: 2,
                  flexGrow: 1,
                  fontSize: '14px',
                }}
              >
                View patient enrollment and demographic reports
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleGenerateReport('Patient Statistics')}
                sx={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                }}
                startIcon={<FileText size={18} />}
              >
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Adherence Report */}
        <Grid item xs={12} sm={6} md={6}>
          <Card
            sx={{
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              width: '300px'
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  mb: 1,
                  fontSize: '18px',
                }}
              >
                Adherence Report
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#666',
                  mb: 2,
                  flexGrow: 1,
                  fontSize: '14px',
                }}
              >
                Review medication adherence and compliance
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleGenerateReport('Adherence')}
                sx={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                }}
                startIcon={<FileText size={18} />}
              >
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Report */}
        <Grid item xs={12} sm={6} md={6}>
          <Card
            sx={{
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              width: '300px'
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  mb: 1,
                  fontSize: '18px',
                  
                }}
              >
                Inventory Report
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#666',
                  mb: 2,
                  flexGrow: 1,
                  fontSize: '14px',
                }}
              >
                Check stock levels and consumption patterns
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleGenerateReport('Inventory')}
                sx={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                }}
                startIcon={<FileText size={18} />}
              >
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Appointment Report */}
        <Grid item xs={12} sm={6} md={6}>
          <Card
            sx={{
              height: '100%',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              width: '300px'
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  color: '#333',
                  mb: 1,
                  fontSize: '18px',
                }}
              >
                Appointment Report
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#666',
                  mb: 2,
                  flexGrow: 1,
                  fontSize: '14px',
                }}
              >
                View appointment statistics and attendance rates
              </Typography>
              <Button
                variant="contained"
                onClick={() => handleGenerateReport('Appointment')}
                sx={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    backgroundColor: '#1565c0',
                  },
                }}
                startIcon={<FileText size={18} />}
              >
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Toast Notification */}
      {toast && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            backgroundColor:
              toast.type === 'success'
                ? '#4caf50'
                : toast.type === 'error'
                ? '#f44336'
                : '#1976d2',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '4px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease',
          }}
        >
          <AlertCircle size={20} />
          <Typography sx={{ fontSize: '14px' }}>{toast.message}</Typography>
        </Box>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </Box>
  );
};

export default Reports;
