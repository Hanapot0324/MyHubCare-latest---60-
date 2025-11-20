// web/src/components/Sidebar.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Medication as MedicationIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  CheckCircle as CheckIcon,
  MedicalServices as MedicalServicesIcon,
  LocalHospital as HospitalIcon,
  Science as ScienceIcon,
  Assignment as AssignmentIcon,
  ManageAccounts as ManageAccountsIcon,
  Business as BusinessIcon,
  Vaccines as VaccinesIcon,
  Person as PersonIcon,
  ListAlt as ListAltIcon,
  Assessment as AssessmentIcon,
  History as HistoryIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

// Define menu items with role-based access (removed Medication)
const allMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient'] },
  { text: 'Patients', icon: <PersonIcon />, path: '/patient', roles: ['admin', 'physician', 'nurse', 'case_manager'] },
  { text: 'Appointments', icon: <CalendarIcon />, path: '/appointments', roles: ['admin', 'physician', 'nurse', 'case_manager'] },
  { text: 'My Appointments', icon: <CalendarIcon />, path: '/my-appointments', roles: ['patient'] },
  { text: 'Profile', icon: <PersonIcon />, path: '/profile', roles: ['patient'] },
  { text: 'Clinical Visit', icon: <MedicalServicesIcon />, path: '/clinical-visit', roles: ['admin', 'physician', 'nurse', 'case_manager'] },
  { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory', roles: ['admin', 'nurse', 'lab_personnel'] },
  { text: 'Prescriptions', icon: <DescriptionIcon />, path: '/prescriptions', roles: ['admin', 'physician', 'nurse', 'case_manager'] },
  { text: 'Medication Reminder', icon: <MedicationIcon />, path: '/medication-adherence', roles: ['admin', 'physician', 'nurse', 'case_manager', 'patient'] },
  { text: 'ART Regimens', icon: <MedicationIcon />, path: '/art-regimen', roles: ['admin', 'physician', 'nurse', 'case_manager'] },
  { text: 'Education', icon: <SchoolIcon />, path: '/education', roles: ['admin', 'physician', 'nurse', 'case_manager', 'patient'] },
  { text: 'Vaccination Program', icon: <VaccinesIcon />, path: '/vaccination-program', roles: ['admin', 'physician', 'nurse'] },
  { text: 'Lab Test', icon: <ScienceIcon />, path: '/lab-test', roles: ['admin', 'physician', 'nurse', 'lab_personnel'] },
  { text: 'HTS Sessions', icon: <AssignmentIcon />, path: '/hts-sessions', roles: ['admin', 'physician', 'nurse', 'case_manager'] },
  { text: 'Counseling Sessions', icon: <PeopleIcon />, path: '/counseling', roles: ['admin', 'physician', 'nurse', 'case_manager'] },
  { text: 'Referrals', icon: <HospitalIcon />, path: '/referrals', roles: ['admin', 'physician', 'nurse', 'case_manager'] },
  { text: 'Care Tasks', icon: <ListAltIcon />, path: '/care-tasks', roles: ['admin', 'case_manager'] },
  { text: 'Reports', icon: <AssessmentIcon />, path: '/reports', roles: ['admin', 'physician'] },
  { text: 'Audit Trail', icon: <HistoryIcon />, path: '/audit-trail', roles: ['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel'] },
  { text: 'Branch', icon: <BusinessIcon />, path: '/branch-management', roles: ['admin'] },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings', roles: ['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient'] },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = React.useState(null);

  React.useEffect(() => {
    // Get user role from localStorage or API
    const getUserRole = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserRole(user.role);
        } else {
          // Try to fetch from API
          const token = localStorage.getItem('token');
          if (token) {
            const response = await fetch('http://localhost:5000/api/auth/me', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                setUserRole(data.user.role);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error getting user role:', error);
      }
    };
    getUserRole();
  }, []);

  // Filter menu items based on user role
  const menuItems = userRole
    ? allMenuItems.filter((item) => item.roles.includes(userRole))
    : [];

  const handleLogout = () => {
    // Clear any authentication tokens and user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Redirect to home page
    navigate('/');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'white',
          color: '#333333',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e5e7eb',
        },
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ color: '#B82132', fontWeight: 600 }}
        >
          My Hub Cares
        </Typography>
      </Toolbar>
      <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
        <List>
          {menuItems.length === 0 ? (
            <ListItem>
              <ListItemText primary="Loading..." />
            </ListItem>
          ) : (
            menuItems.map((item) => (
            <ListItem
              button
              key={item.text}
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 1,
                mx: 1,
                my: 0.5,
                borderLeft:
                  location.pathname === item.path
                    ? '4px solid #B82132'
                    : '4px solid transparent',
                transition: 'all 0.2s ease-in-out',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(184, 33, 50, 0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(184, 33, 50, 0.15)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#B82132',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#B82132',
                    fontWeight: 500,
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(184, 33, 50, 0.05)',
                  borderLeft: '4px solid #B82132',
                  '& .MuiListItemIcon-root': {
                    color: '#B82132',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#B82132',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === item.path ? '#B82132' : '#64748b',
                  minWidth: 40,
                  transition: 'color 0.2s ease-in-out',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                sx={{
                  '& .MuiListItemText-primary': {
                    color:
                      location.pathname === item.path ? '#B82132' : '#333333',
                    fontWeight: location.pathname === item.path ? 500 : 400,
                    transition: 'color 0.2s ease-in-out',
                    fontSize: '0.875rem', // Reduced font size
                  },
                }}
              />
            </ListItem>
            ))
          )}
        </List>
      </Box>
      <Box sx={{ p: 1, mb: 1 }}>
        <Divider sx={{ mb: 1 }} />
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 1,
            mx: 1,
            backgroundColor: '#B82132',
            color: 'white',
            '&:hover': {
              backgroundColor: '#8B1A26',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ color: 'white' }} />
        </ListItem>
      </Box>
    </Drawer>
  );
};

export default Sidebar;