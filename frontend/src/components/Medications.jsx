import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Edit,
  Trash2,
  Pill,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const Medications = ({ socket }) => {
  const [medications, setMedications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newMedication, setNewMedication] = useState({
    medication_name: '',
    generic_name: '',
    form: 'tablet',
    strength: '',
    atc_code: '',
    is_art: false,
    is_controlled: false,
    active: true,
  });

  useEffect(() => {
    fetchMedications();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/medications`);
      const data = await response.json();

      if (data.success) {
        setMedications(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error fetching medications:', error);
      setToast({
        message: 'Failed to fetch medications: ' + error.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async () => {
    try {
      if (!newMedication.medication_name || !newMedication.form) {
        setToast({
          message: 'Medication name and form are required',
          type: 'error',
        });
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/medications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(newMedication),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Medication added successfully',
          type: 'success',
        });
        setShowModal(false);
        setNewMedication({
          medication_name: '',
          generic_name: '',
          form: 'tablet',
          strength: '',
          atc_code: '',
          is_art: false,
          is_controlled: false,
          active: true,
        });
        fetchMedications();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error adding medication:', error);
      setToast({
        message: 'Failed to add medication: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleEditMedication = (medication) => {
    setEditingMedication(medication);
    setShowEditModal(true);
  };

  const handleUpdateMedication = async () => {
    try {
      if (!editingMedication.medication_name || !editingMedication.form) {
        setToast({
          message: 'Medication name and form are required',
          type: 'error',
        });
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/medications/${editingMedication.medication_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(editingMedication),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Medication updated successfully',
          type: 'success',
        });
        setShowEditModal(false);
        setEditingMedication(null);
        fetchMedications();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error updating medication:', error);
      setToast({
        message: 'Failed to update medication: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleDeleteMedication = async (medication) => {
    if (!window.confirm(`Are you sure you want to ${medication.active ? 'deactivate' : 'delete'} ${medication.medication_name}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/medications/${medication.medication_id}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: data.message || 'Medication deleted/deactivated successfully',
          type: 'success',
        });
        fetchMedications();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error deleting medication:', error);
      setToast({
        message: 'Failed to delete medication: ' + error.message,
        type: 'error',
      });
    }
  };

  const filteredMedications = medications.filter((med) => {
    const matchesSearch =
      med.medication_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.strength?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'active') return matchesSearch && med.active;
    if (filterType === 'inactive') return matchesSearch && !med.active;
    if (filterType === 'art') return matchesSearch && med.is_art;
    if (filterType === 'controlled') return matchesSearch && med.is_controlled;

    return matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', paddingTop: '100px' }}>
        <p>Loading medications...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh', paddingTop: '100px' }}>
      {/* Header */}
      <div
        style={{
          marginBottom: '30px',
          background: 'linear-gradient(to right, #D84040, #A31D1D)',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(216, 64, 64, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
              Medications Management
            </h2>
            <p style={{ margin: 0, color: '#F8F2DE', fontSize: '16px' }}>
              Manage medication catalog and drug information
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '12px 24px',
              background: '#F8F2DE',
              color: '#D84040',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={20} />
            Add Medication
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div
        style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6c757d',
            }}
          />
          <input
            type="text"
            placeholder="Search medications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              border: '1px solid #ced4da',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '12px 16px',
            border: '1px solid #ced4da',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Medications</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
          <option value="art">ART Medications</option>
          <option value="controlled">Controlled Substances</option>
        </select>
      </div>

      {/* Medications Table */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>
                Medication Name
              </th>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>
                Generic Name
              </th>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>
                Form
              </th>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>
                Strength
              </th>
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: 600, fontSize: '14px' }}>
                ART
              </th>
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: 600, fontSize: '14px' }}>
                Controlled
              </th>
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: 600, fontSize: '14px' }}>
                Status
              </th>
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: 600, fontSize: '14px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMedications.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                  No medications found
                </td>
              </tr>
            ) : (
              filteredMedications.map((med) => (
                <tr
                  key={med.medication_id}
                  style={{
                    borderBottom: '1px solid #e9ecef',
                    '&:hover': { background: '#f8f9fa' },
                  }}
                >
                  <td style={{ padding: '15px', fontSize: '14px', fontWeight: 500 }}>
                    {med.medication_name}
                  </td>
                  <td style={{ padding: '15px', fontSize: '14px', color: '#6c757d' }}>
                    {med.generic_name || '-'}
                  </td>
                  <td style={{ padding: '15px', fontSize: '14px', textTransform: 'capitalize' }}>
                    {med.form}
                  </td>
                  <td style={{ padding: '15px', fontSize: '14px' }}>{med.strength || '-'}</td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {med.is_art ? (
                      <CheckCircle size={20} color="#28a745" />
                    ) : (
                      <XCircle size={20} color="#dc3545" />
                    )}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {med.is_controlled ? (
                      <CheckCircle size={20} color="#ffc107" />
                    ) : (
                      <XCircle size={20} color="#6c757d" />
                    )}
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: med.active ? '#d4edda' : '#f8d7da',
                        color: med.active ? '#155724' : '#721c24',
                      }}
                    >
                      {med.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditMedication(med)}
                        style={{
                          padding: '6px 12px',
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                        }}
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMedication(med)}
                        style={{
                          padding: '6px 12px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Medication Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Add New Medication</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={newMedication.medication_name}
                  onChange={(e) => setNewMedication({ ...newMedication, medication_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                  Generic Name
                </label>
                <input
                  type="text"
                  value={newMedication.generic_name}
                  onChange={(e) => setNewMedication({ ...newMedication, generic_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                    Form *
                  </label>
                  <select
                    value={newMedication.form}
                    onChange={(e) => setNewMedication({ ...newMedication, form: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="cream">Cream</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                    Strength
                  </label>
                  <input
                    type="text"
                    value={newMedication.strength}
                    onChange={(e) => setNewMedication({ ...newMedication, strength: e.target.value })}
                    placeholder="e.g., 600mg, 10mg/ml"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                  ATC Code
                </label>
                <input
                  type="text"
                  value={newMedication.atc_code}
                  onChange={(e) => setNewMedication({ ...newMedication, atc_code: e.target.value })}
                  placeholder="e.g., J05AR10"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newMedication.is_art}
                    onChange={(e) => setNewMedication({ ...newMedication, is_art: e.target.checked })}
                  />
                  ART Medication
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newMedication.is_controlled}
                    onChange={(e) => setNewMedication({ ...newMedication, is_controlled: e.target.checked })}
                  />
                  Controlled Substance
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newMedication.active}
                    onChange={(e) => setNewMedication({ ...newMedication, active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMedication}
                style={{
                  padding: '10px 20px',
                  background: '#D84040',
                  color: '#F8F2DE',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Add Medication
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medication Modal */}
      {showEditModal && editingMedication && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#333' }}>Edit Medication</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMedication(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={editingMedication.medication_name}
                  onChange={(e) => setEditingMedication({ ...editingMedication, medication_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                  Generic Name
                </label>
                <input
                  type="text"
                  value={editingMedication.generic_name || ''}
                  onChange={(e) => setEditingMedication({ ...editingMedication, generic_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                    Form *
                  </label>
                  <select
                    value={editingMedication.form}
                    onChange={(e) => setEditingMedication({ ...editingMedication, form: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="cream">Cream</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                    Strength
                  </label>
                  <input
                    type="text"
                    value={editingMedication.strength || ''}
                    onChange={(e) => setEditingMedication({ ...editingMedication, strength: e.target.value })}
                    placeholder="e.g., 600mg, 10mg/ml"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
                  ATC Code
                </label>
                <input
                  type="text"
                  value={editingMedication.atc_code || ''}
                  onChange={(e) => setEditingMedication({ ...editingMedication, atc_code: e.target.value })}
                  placeholder="e.g., J05AR10"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingMedication.is_art || false}
                    onChange={(e) => setEditingMedication({ ...editingMedication, is_art: e.target.checked })}
                  />
                  ART Medication
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingMedication.is_controlled || false}
                    onChange={(e) => setEditingMedication({ ...editingMedication, is_controlled: e.target.checked })}
                  />
                  Controlled Substance
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editingMedication.active !== false}
                    onChange={(e) => setEditingMedication({ ...editingMedication, active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMedication(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMedication}
                style={{
                  padding: '10px 20px',
                  background: '#D84040',
                  color: '#F8F2DE',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Update Medication
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
          <AlertCircle size={20} />
          <span style={{ fontSize: '14px' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Medications;

