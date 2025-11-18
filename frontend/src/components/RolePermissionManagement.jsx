import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Check, 
  AlertCircle,
  CheckSquare,
  Square
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const RolePermissionManagement = () => {
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'permissions'
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({}); // { roleId: [permissionIds] }
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  
  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [editingPermission, setEditingPermission] = useState(null);
  
  // Form states
  const [roleForm, setRoleForm] = useState({
    role_code: '',
    role_name: '',
    description: '',
    is_system_role: false
  });
  
  const [permissionForm, setPermissionForm] = useState({
    permission_code: '',
    permission_name: '',
    module: '',
    action: '',
    description: ''
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (roles.length > 0 && permissions.length > 0) {
      fetchRolePermissions();
    }
  }, [roles, permissions]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRoles(data.roles || []);
        }
      } else {
        // If endpoint doesn't exist, use mock data structure
        setRoles([]);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPermissions(data.permissions || []);
        }
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const token = getAuthToken();
      const rolePermMap = {};
      
      for (const role of roles) {
        const response = await fetch(`${API_BASE_URL}/roles/${role.role_id}/permissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            rolePermMap[role.role_id] = data.permissions?.map(p => p.permission_id) || [];
          }
        }
      }
      
      setRolePermissions(rolePermMap);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  const handleSaveRole = async () => {
    try {
      const token = getAuthToken();
      const url = editingRole 
        ? `${API_BASE_URL}/roles/${editingRole.role_id}`
        : `${API_BASE_URL}/roles`;
      
      const method = editingRole ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(roleForm),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: editingRole ? 'Role updated successfully' : 'Role created successfully',
          type: 'success',
        });
        setShowRoleModal(false);
        setEditingRole(null);
        setRoleForm({ role_code: '', role_name: '', description: '', is_system_role: false });
        fetchRoles();
      } else {
        throw new Error(data.message || 'Failed to save role');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      setToast({
        message: 'Failed to save role: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleSavePermission = async () => {
    try {
      const token = getAuthToken();
      const url = editingPermission
        ? `${API_BASE_URL}/permissions/${editingPermission.permission_id}`
        : `${API_BASE_URL}/permissions`;
      
      const method = editingPermission ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(permissionForm),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: editingPermission ? 'Permission updated successfully' : 'Permission created successfully',
          type: 'success',
        });
        setShowPermissionModal(false);
        setEditingPermission(null);
        setPermissionForm({ permission_code: '', permission_name: '', module: '', action: '', description: '' });
        fetchPermissions();
      } else {
        throw new Error(data.message || 'Failed to save permission');
      }
    } catch (error) {
      console.error('Error saving permission:', error);
      setToast({
        message: 'Failed to save permission: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'Role deleted successfully', type: 'success' });
        fetchRoles();
      } else {
        throw new Error(data.message || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      setToast({
        message: 'Failed to delete role: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleDeletePermission = async (permissionId) => {
    if (!window.confirm('Are you sure you want to delete this permission?')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'Permission deleted successfully', type: 'success' });
        fetchPermissions();
      } else {
        throw new Error(data.message || 'Failed to delete permission');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
      setToast({
        message: 'Failed to delete permission: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleTogglePermission = async (roleId, permissionId, isGranted) => {
    try {
      const token = getAuthToken();
      const url = `${API_BASE_URL}/roles/${roleId}/permissions/${permissionId}`;
      const method = isGranted ? 'DELETE' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: isGranted ? 'Permission removed' : 'Permission granted',
          type: 'success',
        });
        fetchRolePermissions();
      } else {
        throw new Error(data.message || 'Failed to update permission');
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
      setToast({
        message: 'Failed to update permission: ' + error.message,
        type: 'error',
      });
    }
  };

  const openEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({
      role_code: role.role_code,
      role_name: role.role_name,
      description: role.description || '',
      is_system_role: role.is_system_role || false
    });
    setShowRoleModal(true);
  };

  const openEditPermission = (permission) => {
    setEditingPermission(permission);
    setPermissionForm({
      permission_code: permission.permission_code,
      permission_name: permission.permission_name,
      module: permission.module,
      action: permission.action,
      description: permission.description || ''
    });
    setShowPermissionModal(true);
  };

  const getFilteredRoles = () => {
    if (!searchTerm) return roles;
    return roles.filter(role => 
      role.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.role_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const getFilteredPermissions = () => {
    if (!searchTerm) return permissions;
    return permissions.filter(perm => 
      perm.permission_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.permission_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.module.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getPermissionsByModule = () => {
    const grouped = {};
    permissions.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    return grouped;
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>Role & Permission Management</h2>
          <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
            Manage system roles and their permissions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #dee2e6' }}>
        <button
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'roles' ? '3px solid #D84040' : '3px solid transparent',
            color: activeTab === 'roles' ? '#D84040' : '#6c757d',
            fontWeight: activeTab === 'roles' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          <Shield size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Roles
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'permissions' ? '3px solid #D84040' : '3px solid transparent',
            color: activeTab === 'permissions' ? '#D84040' : '#6c757d',
            fontWeight: activeTab === 'permissions' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          <Key size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Permissions
        </button>
        <button
          onClick={() => setActiveTab('assign')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'assign' ? '3px solid #D84040' : '3px solid transparent',
            color: activeTab === 'assign' ? '#D84040' : '#6c757d',
            fontWeight: activeTab === 'assign' ? 600 : 400,
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          <Users size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Assign Permissions
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
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
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px 8px 36px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              width: '100%',
            }}
          />
        </div>
        {activeTab === 'roles' && (
          <button
            onClick={() => {
              setEditingRole(null);
              setRoleForm({ role_code: '', role_name: '', description: '', is_system_role: false });
              setShowRoleModal(true);
            }}
            style={{
              padding: '8px 16px',
              background: '#D84040',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={16} />
            Add Role
          </button>
        )}
        {activeTab === 'permissions' && (
          <button
            onClick={() => {
              setEditingPermission(null);
              setPermissionForm({ permission_code: '', permission_name: '', module: '', action: '', description: '' });
              setShowPermissionModal(true);
            }}
            style={{
              padding: '8px 16px',
              background: '#D84040',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={16} />
            Add Permission
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>Loading...</p>
      ) : activeTab === 'roles' ? (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Role Code</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Role Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>System Role</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredRoles().map((role) => (
                <tr key={role.role_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{role.role_code}</td>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{role.role_name}</td>
                  <td style={{ padding: '12px', color: '#6c757d' }}>{role.description || '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {role.is_system_role ? (
                      <span style={{ color: '#28a745', fontWeight: 500 }}>Yes</span>
                    ) : (
                      <span style={{ color: '#6c757d' }}>No</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => openEditRole(role)}
                        style={{
                          padding: '4px 8px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      {!role.is_system_role && (
                        <button
                          onClick={() => handleDeleteRole(role.role_id)}
                          style={{
                            padding: '4px 8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {getFilteredRoles().length === 0 && (
            <p style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>No roles found</p>
          )}
        </div>
      ) : activeTab === 'permissions' ? (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Permission Code</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Permission Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Module</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredPermissions().map((perm) => (
                <tr key={perm.permission_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>{perm.permission_code}</td>
                  <td style={{ padding: '12px', fontWeight: 500 }}>{perm.permission_name}</td>
                  <td style={{ padding: '12px' }}>{perm.module}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: '#e7f3ff',
                      color: '#0066cc',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}>
                      {perm.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#6c757d' }}>{perm.description || '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => openEditPermission(perm)}
                        style={{
                          padding: '4px 8px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePermission(perm.permission_id)}
                        style={{
                          padding: '4px 8px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {getFilteredPermissions().length === 0 && (
            <p style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>No permissions found</p>
          )}
        </div>
      ) : (
        <div>
          {roles.map((role) => {
            const rolePerms = rolePermissions[role.role_id] || [];
            const permissionsByModule = getPermissionsByModule();
            
            return (
              <div key={role.role_id} style={{ marginBottom: '30px', background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#333' }}>{role.role_name}</h3>
                {Object.entries(permissionsByModule).map(([module, modulePerms]) => (
                  <div key={module} style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#6c757d', fontSize: '14px', fontWeight: 600 }}>{module}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
                      {modulePerms.map((perm) => {
                        const isGranted = rolePerms.includes(perm.permission_id);
                        return (
                          <div
                            key={perm.permission_id}
                            onClick={() => handleTogglePermission(role.role_id, perm.permission_id, isGranted)}
                            style={{
                              padding: '12px',
                              border: `2px solid ${isGranted ? '#28a745' : '#dee2e6'}`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: isGranted ? '#f0f9f4' : 'white',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            {isGranted ? (
                              <CheckSquare size={18} color="#28a745" />
                            ) : (
                              <Square size={18} color="#6c757d" />
                            )}
                            <div>
                              <div style={{ fontWeight: 500, fontSize: '14px' }}>{perm.permission_name}</div>
                              <div style={{ fontSize: '12px', color: '#6c757d' }}>{perm.permission_code}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>{editingRole ? 'Edit Role' : 'Create Role'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Role Code</label>
                <input
                  type="text"
                  value={roleForm.role_code}
                  onChange={(e) => setRoleForm({ ...roleForm, role_code: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                  disabled={editingRole?.is_system_role}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Role Name</label>
                <input
                  type="text"
                  value={roleForm.role_name}
                  onChange={(e) => setRoleForm({ ...roleForm, role_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Description</label>
                <textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', minHeight: '80px' }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={roleForm.is_system_role}
                    onChange={(e) => setRoleForm({ ...roleForm, is_system_role: e.target.checked })}
                    disabled={editingRole?.is_system_role}
                  />
                  <span>System Role</span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setEditingRole(null);
                  setRoleForm({ role_code: '', role_name: '', description: '', is_system_role: false });
                }}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                style={{
                  padding: '8px 16px',
                  background: '#D84040',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <Save size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>{editingPermission ? 'Edit Permission' : 'Create Permission'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Permission Code</label>
                <input
                  type="text"
                  value={permissionForm.permission_code}
                  onChange={(e) => setPermissionForm({ ...permissionForm, permission_code: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Permission Name</label>
                <input
                  type="text"
                  value={permissionForm.permission_name}
                  onChange={(e) => setPermissionForm({ ...permissionForm, permission_name: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Module</label>
                <input
                  type="text"
                  value={permissionForm.module}
                  onChange={(e) => setPermissionForm({ ...permissionForm, module: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Action</label>
                <select
                  value={permissionForm.action}
                  onChange={(e) => setPermissionForm({ ...permissionForm, action: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                >
                  <option value="">Select action</option>
                  <option value="create">Create</option>
                  <option value="read">Read</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="manage">Manage</option>
                  <option value="export">Export</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Description</label>
                <textarea
                  value={permissionForm.description}
                  onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', minHeight: '80px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setEditingPermission(null);
                  setPermissionForm({ permission_code: '', permission_name: '', module: '', action: '', description: '' });
                }}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermission}
                style={{
                  padding: '8px 16px',
                  background: '#D84040',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <Save size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: toast.type === 'success' ? '#28a745' : '#dc3545',
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
          {toast.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontSize: '14px' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default RolePermissionManagement;

