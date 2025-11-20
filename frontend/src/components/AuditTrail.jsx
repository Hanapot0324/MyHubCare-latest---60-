import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Remove as RemoveIcon,
  LockOpen as LockOpenIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';

const AuditTrail = ({ socket }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [toast, setToast] = useState(null);

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

  // Load audit logs
  const loadAuditLogs = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      // Try to fetch from API first
      try {
        const response = await fetch(`${API_BASE_URL}/audit-logs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.logs) {
            setAuditLogs(data.logs);
            setFilteredLogs(data.logs);
            return;
          }
        }
      } catch (error) {
        console.log('API not available, using localStorage');
      }

      // Fallback to localStorage
      const storedLogs = JSON.parse(localStorage.getItem('auditLogs')) || [];
      setAuditLogs(storedLogs);
      setFilteredLogs(storedLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  useEffect(() => {
    getCurrentUser();
    loadAuditLogs();
  }, []);

  // Filter logs
  useEffect(() => {
    let filtered = [...auditLogs];

    // Filter by user role (non-admin see only their logs)
    if (userRole !== 'admin') {
      filtered = filtered.filter((log) => log.user_id === currentUser?.user_id);
    }

    // Filter by action
    if (actionFilter) {
      filtered = filtered.filter((log) => log.action.toLowerCase() === actionFilter.toLowerCase());
    }

    // Filter by module
    if (moduleFilter) {
      filtered = filtered.filter((log) => log.module.toLowerCase() === moduleFilter.toLowerCase());
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.timestamp || log.created_at).toISOString().split('T')[0];
        return logDate === dateFilter;
      });
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.created_at);
      const dateB = new Date(b.timestamp || b.created_at);
      return dateB - dateA;
    });

    setFilteredLogs(filtered);
  }, [actionFilter, moduleFilter, dateFilter, auditLogs, userRole, currentUser]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Get action color
  const getActionColor = (action) => {
    const actionUpper = action?.toUpperCase() || '';
    const colors = {
      CREATE: '#10b981',
      UPDATE: '#3b82f6',
      DELETE: '#ef4444',
      LOGIN: '#8b5cf6',
      LOGOUT: '#6b7280',
      VIEW: '#06b6d4',
      EXPORT: '#f59e0b',
      REPORT: '#f59e0b',
    };
    return colors[actionUpper] || '#6b7280';
  };

  // Get action icon
  const getActionIcon = (action) => {
    const actionUpper = action?.toUpperCase() || '';
    const icons = {
      CREATE: <AddIcon sx={{ fontSize: 16 }} />,
      UPDATE: <EditIcon sx={{ fontSize: 16 }} />,
      DELETE: <RemoveIcon sx={{ fontSize: 16 }} />,
      LOGIN: <LockOpenIcon sx={{ fontSize: 16 }} />,
      LOGOUT: <LockIcon sx={{ fontSize: 16 }} />,
      VIEW: <VisibilityIcon sx={{ fontSize: 16 }} />,
      EXPORT: <FileDownloadIcon sx={{ fontSize: 16 }} />,
      REPORT: <FileDownloadIcon sx={{ fontSize: 16 }} />,
    };
    return icons[actionUpper] || <CheckCircleIcon sx={{ fontSize: 16 }} />;
  };

  // Format audit log entry
  const formatAuditLog = (log) => {
    const timestamp = new Date(log.timestamp || log.created_at);
    const formattedTime = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
    const userName = log.user_name || 'Unknown User';
    const userRole = log.user_role || 'UNKNOWN';
    const action = log.action?.toUpperCase() || 'UNKNOWN';
    const module = log.module?.toUpperCase() || 'UNKNOWN';
    const recordId = log.record_id ? ` ${log.record_id}` : '';

    let logString = `[${formattedTime}] - `;
    logString += `<strong>${userName}</strong> (`;
    logString += `<span style="color: #2563eb;">${userRole}</span>) `;
    logString += `performed <strong style="color: #2563eb;">${action}</strong> `;
    logString += `on <strong>${module}${recordId}</strong>.`;

    // Add change summary or details
    if (log.change_summary) {
      logString += ` ${log.change_summary}.`;
    } else if (log.old_value && log.new_value) {
      try {
        const oldVal = typeof log.old_value === 'string' ? JSON.parse(log.old_value) : log.old_value;
        const newVal = typeof log.new_value === 'string' ? JSON.parse(log.new_value) : log.new_value;
        logString += ` <span style="color: #dc2626;">${JSON.stringify(oldVal)}</span> → <span style="color: #10b981;">${JSON.stringify(newVal)}</span>.`;
      } catch (e) {
        logString += ` ${log.old_value} → ${log.new_value}.`;
      }
    }

    // Add IP Address
    if (log.ip_address) {
      logString += ` <span style="color: #6b7280;">[IP: ${log.ip_address}]</span>`;
    }

    // Add Device
    if (log.device_type) {
      logString += ` <span style="color: #6b7280;">[Device: ${log.device_type}]</span>`;
    }

    // Add remarks
    if (log.remarks) {
      logString += ` <em style="color: #f59e0b;">[${log.remarks}]</em>`;
    }

    return logString;
  };

  // Export audit log
  const handleExportLog = () => {
    let csv = 'Timestamp,User,Role,Action,Module,Record ID,Change Summary,IP Address,Device,Status\n';

    filteredLogs.forEach((log) => {
      const timestamp = new Date(log.timestamp || log.created_at).toLocaleString();
      csv += `"${timestamp}","${log.user_name || 'Unknown'}","${log.user_role || 'N/A'}","${log.action || 'N/A'}","${log.module || 'N/A'}","${log.record_id || 'N/A'}","${log.change_summary || 'N/A'}","${log.ip_address || 'N/A'}","${log.device_type || 'N/A'}","${log.status || 'success'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    setToast({ message: 'Audit trail exported successfully!', type: 'success' });
  };

  // Clear old logs
  const handleClearOldLogs = () => {
    if (!window.confirm('Are you sure you want to clear logs older than 90 days?\n\nThis action cannot be undone.')) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const filtered = auditLogs.filter((log) => {
      const logDate = new Date(log.timestamp || log.created_at);
      return logDate > cutoffDate;
    });

    const removed = auditLogs.length - filtered.length;
    setAuditLogs(filtered);
    localStorage.setItem('auditLogs', JSON.stringify(filtered));

    setToast({ message: `${removed} old log entries cleared successfully!`, type: 'success' });
  };

  // Refresh logs
  const handleRefresh = () => {
    loadAuditLogs();
    setToast({ message: 'Logs refreshed', type: 'success' });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const isAdmin = userRole === 'admin';
  const pageTitle = isAdmin ? 'Audit Trail (All Users)' : 'My Activity Log';

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, sm: 3 },
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        paddingTop: '100px',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#333',
            fontSize: { xs: '24px', sm: '28px' },
            mb: 2,
          }}
        >
          📋 {pageTitle}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportLog}
            sx={{
              textTransform: 'none',
              borderColor: '#d0d0d0',
              color: '#333',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: 'rgba(0,0,0,0.05)',
              },
            }}
          >
            Export Log
          </Button>
          {isAdmin && (
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={handleClearOldLogs}
              sx={{
                textTransform: 'none',
                borderColor: '#d0d0d0',
                color: '#333',
                '&:hover': {
                  borderColor: '#999',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                },
              }}
            >
              Clear Old Logs
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Card */}
      <Paper
        sx={{
          p: 3,
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: '8px',
        }}
      >
        {/* Card Header with Filters */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#333',
            }}
          >
            {isAdmin ? 'System Activity Log' : 'My Activity History'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="action-filter-label">All Actions</InputLabel>
              <Select
                labelId="action-filter-label"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                label="All Actions"
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="update">Update</MenuItem>
                <MenuItem value="delete">Delete</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="logout">Logout</MenuItem>
                <MenuItem value="view">View</MenuItem>
                <MenuItem value="export">Export</MenuItem>
                <MenuItem value="report">Report</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="module-filter-label">All Modules</InputLabel>
              <Select
                labelId="module-filter-label"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                label="All Modules"
              >
                <MenuItem value="">All Modules</MenuItem>
                <MenuItem value="patients">Patients</MenuItem>
                <MenuItem value="appointments">Appointments</MenuItem>
                <MenuItem value="prescriptions">Prescriptions</MenuItem>
                <MenuItem value="inventory">Inventory</MenuItem>
                <MenuItem value="vaccinations">Vaccinations</MenuItem>
                <MenuItem value="reminders">Reminders</MenuItem>
                <MenuItem value="surveys">Surveys</MenuItem>
                <MenuItem value="forum">Forum</MenuItem>
                {isAdmin && (
                  <>
                    <MenuItem value="users">Users</MenuItem>
                    <MenuItem value="facilities">Facilities</MenuItem>
                  </>
                )}
                <MenuItem value="system">System</MenuItem>
                <MenuItem value="mobile-app">Mobile App</MenuItem>
                <MenuItem value="reports">Reports</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type="date"
              size="small"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="dd/mm/yyyy"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
              inputProps={{
                placeholder: 'dd/mm/yyyy',
              }}
            />
          </Box>
        </Box>

        {/* Audit Log Entries */}
        <Box>
          {filteredLogs.length === 0 ? (
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                color: '#666',
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                No audit logs found
              </Typography>
              <Typography variant="body2" sx={{ color: '#999' }}>
                {isAdmin ? 'System activities will be logged here' : 'Your activities will be logged here'}
              </Typography>
            </Box>
          ) : (
            <Box>
              {filteredLogs.map((log, index) => {
                const actionColor = getActionColor(log.action);
                const status = log.status || 'success';

                return (
                  <Box
                    key={log.audit_id || log.id || index}
                    sx={{
                      p: 2,
                      mb: 1.5,
                      backgroundColor: '#f9fafb',
                      borderLeft: `4px solid ${actionColor}`,
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      lineHeight: 1.8,
                    }}
                  >
                    <Box
                      sx={{
                        color: '#1f2937',
                        '& strong': {
                          fontWeight: 600,
                        },
                      }}
                      dangerouslySetInnerHTML={{ __html: formatAuditLog(log) }}
                    />
                    <Box
                      sx={{
                        mt: 1,
                        pt: 1,
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        fontSize: '11px',
                        color: '#6b7280',
                        fontFamily: 'sans-serif',
                      }}
                    >
                      <Chip
                        icon={getActionIcon(log.action)}
                        label={log.action?.toUpperCase() || 'UNKNOWN'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '10px',
                          backgroundColor: actionColor,
                          color: 'white',
                          '& .MuiChip-icon': {
                            color: 'white',
                          },
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {status === 'success' ? (
                          <CheckCircleIcon sx={{ fontSize: 14, color: '#10b981' }} />
                        ) : (
                          <CancelIcon sx={{ fontSize: 14, color: '#ef4444' }} />
                        )}
                        <Typography sx={{ fontSize: '11px' }}>
                          Status: {status === 'success' ? 'Success' : status}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography sx={{ color: '#666', fontSize: '14px' }}>
            <strong>Total Logs:</strong> {filteredLogs.length}{' '}
            <span style={{ color: '#999' }}>
              | {actionFilter || moduleFilter || dateFilter ? `Showing ${filteredLogs.length} of ${auditLogs.length} entries` : 'Showing all entries'}
            </span>
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{
              textTransform: 'none',
              borderColor: '#d0d0d0',
              color: '#333',
              '&:hover': {
                borderColor: '#999',
                backgroundColor: 'rgba(0,0,0,0.05)',
              },
            }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

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
          }}
        >
          <Typography sx={{ fontSize: '14px' }}>{toast.message}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default AuditTrail;

