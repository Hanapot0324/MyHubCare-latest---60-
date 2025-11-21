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

  // Dashboard statistics state
  const [dashboardStats, setDashboardStats] = useState(null);
  const [patientDemographicsData, setPatientDemographicsData] = useState([
    { name: 'Male', value: 0, color: '#1976d2' },
    { name: 'Female', value: 0, color: '#ec407a' },
  ]);
  const [adherenceTrendsData, setAdherenceTrendsData] = useState([]);
  const [inventoryLevelsData, setInventoryLevelsData] = useState([]);
  const [appointmentAttendanceData, setAppointmentAttendanceData] = useState([
    { name: 'Completed', value: 0, color: '#4caf50' },
    { name: 'Scheduled', value: 0, color: '#1976d2' },
  ]);

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

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/reports/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setDashboardStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  // Fetch patient demographics
  const fetchPatientDemographics = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.patients) {
          const patients = data.patients;
          // Database uses 'sex' column with values 'M', 'F', 'O'
          const maleCount = patients.filter(p => 
            p.sex === 'M' || p.sex === 'male' || p.sex === 'Male'
          ).length;
          const femaleCount = patients.filter(p => 
            p.sex === 'F' || p.sex === 'female' || p.sex === 'Female'
          ).length;
          const total = patients.length;
          
          if (total > 0) {
            setPatientDemographicsData([
              { name: 'Male', value: Math.round((maleCount / total) * 100), color: '#1976d2' },
              { name: 'Female', value: Math.round((femaleCount / total) * 100), color: '#ec407a' },
            ]);
          } else {
            // Reset to zero if no patients
            setPatientDemographicsData([
              { name: 'Male', value: 0, color: '#1976d2' },
              { name: 'Female', value: 0, color: '#ec407a' },
            ]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching patient demographics:', error);
    }
  };

  // Fetch adherence trends data
  const fetchAdherenceTrends = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/reports/charts/adherence-trends?months=6`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setAdherenceTrendsData(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching adherence trends:', error);
      // Set empty array on error
      setAdherenceTrendsData([]);
    }
  };

  // Fetch inventory levels data
  const fetchInventoryLevels = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/reports/charts/inventory-levels?limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setInventoryLevelsData(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching inventory levels:', error);
      // Set empty array on error
      setInventoryLevelsData([]);
    }
  };

  // Fetch appointment attendance data
  const fetchAppointmentAttendance = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/reports/charts/appointment-attendance`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Format for pie chart
          const formattedData = data.data.map(item => ({
            name: item.name,
            value: item.percentage || item.value,
            color: item.color,
          }));
          setAppointmentAttendanceData(formattedData);
        }
      }
    } catch (error) {
      console.error('Error fetching appointment attendance:', error);
      // Reset to default on error
      setAppointmentAttendanceData([
        { name: 'Completed', value: 0, color: '#4caf50' },
        { name: 'Scheduled', value: 0, color: '#1976d2' },
      ]);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userRole && ['admin', 'physician'].includes(userRole)) {
      fetchDashboardStats();
      fetchPatientDemographics();
      fetchAdherenceTrends();
      fetchInventoryLevels();
      fetchAppointmentAttendance();
    }
  }, [userRole]);

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
  const handleGenerateReport = async (reportType) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setToast({
          message: 'Authentication required',
          type: 'error',
        });
        return;
      }

      // Map report type to backend format
      const reportTypeMap = {
        'Patient Statistics': 'patient',
        'Adherence': 'adherence',
        'Inventory': 'inventory',
        'Appointment': 'appointment',
      };

      const backendReportType = reportTypeMap[reportType] || reportType.toLowerCase();

      setToast({
        message: `Generating ${reportType} report...`,
        type: 'success',
      });

      const response = await fetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          report_type: backendReportType,
          // Optional: Add facility_id, date_from, date_to if needed
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToast({
          message: `${reportType} report generated successfully! Run ID: ${data.run.run_id.substring(0, 8)}...`,
          type: 'success',
        });
        
        // Refresh all charts after report generation
        if (userRole && ['admin', 'physician'].includes(userRole)) {
          fetchDashboardStats();
          
          // Refresh relevant charts based on report type
          if (reportType === 'Patient Statistics' || backendReportType === 'patient') {
            fetchPatientDemographics();
          }
          if (reportType === 'Adherence' || backendReportType === 'adherence') {
            fetchAdherenceTrends();
          }
          if (reportType === 'Inventory' || backendReportType === 'inventory') {
            fetchInventoryLevels();
          }
          if (reportType === 'Appointment' || backendReportType === 'appointment') {
            fetchAppointmentAttendance();
          }
        }
      } else {
        setToast({
          message: data.message || `Failed to generate ${reportType} report`,
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setToast({
        message: `Error generating ${reportType} report: ${error.message}`,
        type: 'error',
      });
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      minHeight: '100vh', 
      paddingTop: '100px' 
    }}>
      <div style={{ 
        marginBottom: '30px', 
        background: 'linear-gradient(to right, #D84040, #A31D1D)', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 15px rgba(216, 64, 64, 0.2)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>System Reports</h2>
            <p style={{ margin: 0, color: '#F8F2DE', fontSize: '16px' }}>Comprehensive analytics and visualizations</p>
          </div>
        </div>
      </div>

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
                {adherenceTrendsData.length > 0 ? (
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
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      No adherence data available
                    </Typography>
                  </Box>
                )}
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
                {inventoryLevelsData.length > 0 ? (
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
                      stroke="#666"
                      label={{ value: 'Stock Levels', angle: 90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ff9800" />
                  </BarChart>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      No inventory data available
                    </Typography>
                  </Box>
                )}
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
                {appointmentAttendanceData.length > 0 ? (
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
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      No appointment data available
                    </Typography>
                  </Box>
                )}
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
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
    </div>
  );
};

export default Reports;