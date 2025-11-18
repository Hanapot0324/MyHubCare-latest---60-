import React, { useState, useEffect } from 'react';
import { Search, Edit, Save, X, AlertCircle, Check } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const roles = ['admin', 'physician', 'nurse', 'case_manager', 'lab_personnel', 'patient'];
  const statuses = ['active', 'inactive', 'suspended', 'pending'];

  useEffect(() => {
    fetchUsers();
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCurrentUser(data.user);
          }
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`${API_BASE_URL}/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setToast({
        message: 'Failed to fetch users: ' + error.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'User role updated successfully',
          type: 'success',
        });
        setEditingUser(null);
        fetchUsers();
      } else {
        throw new Error(data.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setToast({
        message: 'Failed to update role: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'User status updated successfully',
          type: 'success',
        });
        fetchUsers();
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setToast({
        message: 'Failed to update status: ' + error.message,
        type: 'error',
      });
    }
  };

  const getFilteredUsers = () => {
    return users;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: '#dc3545',
      physician: '#007bff',
      nurse: '#28a745',
      case_manager: '#ffc107',
      lab_personnel: '#17a2b8',
      patient: '#6c757d',
    };
    return colors[role] || '#6c757d';
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: '#28a745',
      inactive: '#6c757d',
      suspended: '#dc3545',
      pending: '#ffc107',
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>
            User Management
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
            Manage user roles and permissions
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search
            size={18}
            color="#6c757d"
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setTimeout(() => fetchUsers(), 300);
            }}
            style={{
              padding: '8px 12px 8px 36px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              width: '100%',
            }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setTimeout(() => fetchUsers(), 100);
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            minWidth: '150px',
          }}
        >
          <option value="">All Roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setTimeout(() => fetchUsers(), 100);
          }}
          style={{
            padding: '8px 12px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            minWidth: '150px',
          }}
        >
          <option value="">All Statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      {loading ? (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          Loading users...
        </p>
      ) : getFilteredUsers().length === 0 ? (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          No users found
        </p>
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Username</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Facility</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredUsers().map((user) => (
                <tr
                  key={user.user_id}
                  style={{
                    borderBottom: '1px solid #dee2e6',
                    '&:hover': { background: '#f8f9fa' },
                  }}
                >
                  <td style={{ padding: '12px' }}>{user.full_name}</td>
                  <td style={{ padding: '12px' }}>{user.username}</td>
                  <td style={{ padding: '12px' }}>{user.email}</td>
                  <td style={{ padding: '12px' }}>
                    {editingUser === user.user_id ? (
                      <select
                        value={user.role}
                        onChange={(e) => {
                          const updatedUsers = users.map((u) =>
                            u.user_id === user.user_id
                              ? { ...u, role: e.target.value }
                              : u
                          );
                          setUsers(updatedUsers);
                        }}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                        }}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'white',
                          background: getRoleBadgeColor(user.role),
                        }}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.user_id, e.target.value)}
                      disabled={currentUser?.user_id === user.user_id}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        background: currentUser?.user_id === user.user_id ? '#f8f9fa' : 'white',
                        cursor: currentUser?.user_id === user.user_id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {user.facility_name || 'N/A'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {editingUser === user.user_id ? (
                      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            handleRoleChange(user.user_id, user.role);
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Save size={14} />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingUser(null);
                            fetchUsers();
                          }}
                          style={{
                            padding: '4px 8px',
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingUser(user.user_id)}
                        disabled={currentUser?.user_id === user.user_id}
                        style={{
                          padding: '4px 8px',
                          background: currentUser?.user_id === user.user_id ? '#6c757d' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: currentUser?.user_id === user.user_id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title={
                          currentUser?.user_id === user.user_id
                            ? 'Cannot edit your own role'
                            : 'Edit role'
                        }
                      >
                        <Edit size={14} />
                        Edit Role
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor:
              toast.type === 'success'
                ? '#28a745'
                : toast.type === 'error'
                ? '#dc3545'
                : '#17a2b8',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            zIndex: 9999,
          }}
        >
          {toast.type === 'success' ? (
            <Check size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span style={{ fontSize: '14px' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default UserManagement;






