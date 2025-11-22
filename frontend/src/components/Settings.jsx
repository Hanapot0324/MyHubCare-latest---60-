import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Users, Shield, Lock, Info, HelpCircle } from 'lucide-react';
import UserManagement from './UserManagement';
import RolePermissionManagement from './RolePermissionManagement';
import ChangePassword from './ChangePassword';
import About from './About';
import FAQs from './FAQs';

const API_BASE_URL = 'http://localhost:5000/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('password'); // 'users', 'roles', 'password', 'about', or 'faqs'
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserRole(user.role);
          // Set default tab based on role
          if (user.role === 'patient') {
            setActiveTab('password');
          } else {
            setActiveTab('users');
          }
        } else {
          // Try to fetch from API
          const token = localStorage.getItem('token');
          if (token) {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (response.ok) {
              const data = await response.json();
              if (data.success) {
                setUserRole(data.user.role);
                // Set default tab based on role
                if (data.user.role === 'patient') {
                  setActiveTab('password');
                } else {
                  setActiveTab('users');
                }
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

  const isPatient = userRole === 'patient';

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        minHeight: '100vh',
        paddingTop: '100px',
      }}
    >
      {/* Header - Matching Other Components Style */}
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
              Settings
            </h2>
            <p style={{ margin: 0, color: '#F8F2DE', fontSize: '16px' }}>
              {isPatient
                ? 'Manage your account settings and password'
                : 'Manage system settings, users, roles, and permissions'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0', 
        marginBottom: '30px', 
        borderBottom: '2px solid #dee2e6',
        background: 'white',
        borderRadius: '8px 8px 0 0',
        padding: '0 20px',
      }}>
        {!isPatient && (
          <>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '16px 24px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'users' ? '3px solid #D84040' : '3px solid transparent',
                color: activeTab === 'users' ? '#D84040' : '#6c757d',
                fontWeight: activeTab === 'users' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <Users size={18} />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              style={{
                padding: '16px 24px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'roles' ? '3px solid #D84040' : '3px solid transparent',
                color: activeTab === 'roles' ? '#D84040' : '#6c757d',
                fontWeight: activeTab === 'roles' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <Shield size={18} />
              Roles & Permissions
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('password')}
          style={{
            padding: '16px 24px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'password' ? '3px solid #D84040' : '3px solid transparent',
            color: activeTab === 'password' ? '#D84040' : '#6c757d',
            fontWeight: activeTab === 'password' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <Lock size={18} />
          Change Password
        </button>
        <button
          onClick={() => setActiveTab('about')}
          style={{
            padding: '16px 24px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'about' ? '3px solid #D84040' : '3px solid transparent',
            color: activeTab === 'about' ? '#D84040' : '#6c757d',
            fontWeight: activeTab === 'about' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <Info size={18} />
          About
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          style={{
            padding: '16px 24px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'faqs' ? '3px solid #D84040' : '3px solid transparent',
            color: activeTab === 'faqs' ? '#D84040' : '#6c757d',
            fontWeight: activeTab === 'faqs' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          <HelpCircle size={18} />
          FAQs
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ 
        background: 'white', 
        borderRadius: '0 8px 8px 8px',
        minHeight: '500px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {activeTab === 'users' && !isPatient ? (
          <UserManagement />
        ) : activeTab === 'roles' && !isPatient ? (
          <RolePermissionManagement />
        ) : activeTab === 'password' ? (
          <ChangePassword />
        ) : activeTab === 'about' ? (
          <About />
        ) : activeTab === 'faqs' ? (
          <FAQs />
        ) : (
          <ChangePassword />
        )}
      </div>
    </div>
  );
};

export default Settings;