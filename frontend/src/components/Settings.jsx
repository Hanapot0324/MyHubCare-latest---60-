import React, { useState } from 'react';
import { Settings as SettingsIcon, Users, Shield } from 'lucide-react';
import UserManagement from './UserManagement';
import RolePermissionManagement from './RolePermissionManagement';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'roles'

  return (
    <div style={{ padding: '20px', paddingTop: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <SettingsIcon size={28} color="#D84040" />
          <h2 style={{ margin: 0, color: '#333', fontSize: '28px' }}>Settings</h2>
        </div>
        <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
          Manage system settings, users, roles, and permissions
        </p>
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
      </div>

      {/* Tab Content */}
      <div style={{ 
        background: 'white', 
        borderRadius: activeTab === 'users' ? '0 8px 8px 8px' : '8px 0 8px 8px',
        minHeight: '500px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {activeTab === 'users' ? (
          <UserManagement />
        ) : (
          <RolePermissionManagement />
        )}
      </div>
    </div>
  );
};

export default Settings;

