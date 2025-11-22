// web/src/components/Header.jsx
import React from 'react';
import { AppBar, Toolbar, Typography, Avatar, Box } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import { Menu as MenuIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import NotificationSystem from './NotificationSystem';
import NotificationSystemStaff from './NotificationSystemStaff';
import NotificationSystemPatient from './NotificationSystemPatient';
import logoImage from '../assets/logowoname.png';

const Logo = () => (
  <img
    src={logoImage}
    alt="My Hub Cares Logo"
    style={{
      height: '40px',
      width: 'auto',
      marginRight: '10px',
      objectFit: 'contain',
    }}
  />
);

// Map paths to display names
const pathNames = {
  '/dashboard': 'Dashboard',
  '/patient': 'Patients',
  '/patients': 'Patients',
  '/appointments': 'Appointments',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

const Header = ({ socket }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [userRole, setUserRole] = React.useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Get user role from localStorage
  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  }, []);

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#ffffff',
        color: '#B82132',
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Logo />
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              marginTop: '10px', 
            }}
          >
            My Hub Cares
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {userRole === 'patient' ? (
            <NotificationSystemPatient socket={socket} />
          ) : (
            <NotificationSystemStaff socket={socket} />
          )}
          {/* <Avatar
            sx={{
              bgcolor: '#D84040',
              ml: 1,
              cursor: 'default',
            }}
          >
            <AccountCircle />
          </Avatar> */}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;