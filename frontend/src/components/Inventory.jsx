import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Search, Filter, AlertCircle, Edit, Package } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [restockingItem, setRestockingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState([]);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'medications'

  useEffect(() => {
    fetchInventory();
    fetchMedications();
  }, []);
  

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/inventory`);
      const data = await response.json();

      if (data.success) {
        setInventory(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setToast({
        message: 'Failed to fetch inventory: ' + error.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMedications = async () => {
    try {
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
    }
  };

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleShowAddItemModal = () => {
    setShowModal(true);
  };

  const handleAddItem = async (itemData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Inventory item added successfully',
          type: 'success',
        });
        setShowModal(false);
        fetchInventory(); // Refresh the inventory list
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error adding inventory item:', error);
      setToast({
        message: 'Failed to add inventory item: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleUpdateItem = async (itemData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${editingItem.inventory_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Inventory item updated successfully',
          type: 'success',
        });
        setShowEditModal(false);
        setEditingItem(null);
        fetchInventory(); // Refresh the inventory list
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error updating inventory item:', error);
      setToast({
        message: 'Failed to update inventory item: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleRestockItem = (item) => {
    setRestockingItem(item);
    setShowRestockModal(true);
  };

  const handleRestock = async (quantity) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${restockingItem.inventory_id}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: parseInt(quantity) }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Inventory item restocked successfully',
          type: 'success',
        });
        setShowRestockModal(false);
        setRestockingItem(null);
        fetchInventory(); // Refresh the inventory list
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error restocking inventory item:', error);
      setToast({
        message: 'Failed to restock inventory item: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/inventory/${itemId}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          setToast({
            message: 'Inventory item deleted successfully',
            type: 'success',
          });
          fetchInventory(); // Refresh the inventory list
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        setToast({
          message: 'Failed to delete inventory item: ' + error.message,
          type: 'error',
        });
      }
    }
  };

  // Medication CRUD handlers
  const handleShowAddMedicationModal = () => {
    setEditingMedication(null);
    setShowMedicationModal(true);
  };

  const handleEditMedication = (medication) => {
    setEditingMedication(medication);
    setShowMedicationModal(true);
  };

  const handleAddMedication = async (medicationData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/medications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicationData),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Medication added successfully',
          type: 'success',
        });
        setShowMedicationModal(false);
        setEditingMedication(null);
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

  const handleUpdateMedication = async (medicationData) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/medications/${editingMedication.medication_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(medicationData),
        }
      );

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Medication updated successfully',
          type: 'success',
        });
        setShowMedicationModal(false);
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

  const handleDeleteMedication = async (medicationId) => {
    if (window.confirm('Are you sure you want to delete this medication?')) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/medications/${medicationId}`,
          {
            method: 'DELETE',
          }
        );

        const data = await response.json();

        if (data.success) {
          setToast({
            message: data.message || 'Medication deleted successfully',
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
    }
  };

  const getFilteredInventory = () => {
    let filtered = inventory;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.medication_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.facility_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType === 'low') {
      filtered = filtered.filter(
        (item) => item.quantity_on_hand <= item.reorder_level
      );
    } else if (filterType === 'expiring') {
      filtered = filtered.filter((item) => {
        const expiryDate = new Date(item.expiry_date);
        const monthsUntilExpiry =
          (expiryDate - new Date()) / (1000 * 60 * 60 * 24 * 30);
        return monthsUntilExpiry < 3;
      });
    }

    return filtered;
  };

  const renderInventoryGrid = () => {
    const filteredInventory = getFilteredInventory();

    if (loading) {
      return (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          Loading inventory...
        </p>
      );
    }

    if (filteredInventory.length === 0) {
      return (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          No inventory items found
        </p>
      );
    }

    return filteredInventory.map((item) => {
      const isLowStock = item.quantity_on_hand <= item.reorder_level;
      const expiryDate = new Date(item.expiry_date);
      const monthsUntilExpiry =
        (expiryDate - new Date()) / (1000 * 60 * 60 * 24 * 30);
      const isExpiringSoon = monthsUntilExpiry < 3;

      return (
        <div
          key={item.inventory_id}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: isLowStock ? '1px solid #dc3545' : 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '10px',
            }}
          >
            <h3 style={{ margin: 0, color: '#333', fontSize: '16px' }}>
              {item.medication_name}
            </h3>
            <div style={{ display: 'flex', gap: '5px' }}>
              {isLowStock && (
                <span
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AlertCircle size={12} />
                  LOW STOCK
                </span>
              )}
              {isExpiringSoon && (
                <span
                  style={{
                    background: '#ffc107',
                    color: '#333',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                >
                  EXPIRING SOON
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: isLowStock ? '#dc3545' : '#007bff',
              marginBottom: '10px',
            }}
          >
            {item.quantity_on_hand} {item.unit}
          </div>

          <div
            style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}
          >
            <strong>Reorder Level:</strong> {item.reorder_level} {item.unit}
          </div>

          <div
            style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}
          >
            <strong>Expiry:</strong>{' '}
            {new Date(item.expiry_date).toLocaleDateString()}
          </div>

          <div
            style={{ fontSize: '14px', color: '#6c757d', marginBottom: '5px' }}
          >
            <strong>Facility:</strong> {item.facility_name}
          </div>

          <div
            style={{ fontSize: '14px', color: '#6c757d', marginBottom: '15px' }}
          >
            <strong>Supplier:</strong> {item.supplier}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleEditItem(item)}
              style={{
                padding: '6px 12px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Edit size={14} />
              Edit
            </button>
            <button
              onClick={() => handleRestockItem(item)}
              style={{
                padding: '6px 12px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Package size={14} />
              Restock
            </button>
            <button
              onClick={() => handleDeleteItem(item.inventory_id)}
              style={{
                padding: '6px 12px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div style={{ padding: '20px', paddingTop: '80px' }}>
      {/* Header with Title */}
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
            Inventory Management
          </h2>
          <p
            style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}
          >
            Manage medication stock and supplies
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'inventory' ? (
            <button
              onClick={handleShowAddItemModal}
              style={{
                padding: '10px 16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} />
              Add New Item
            </button>
          ) : (
            <button
              onClick={handleShowAddMedicationModal}
              style={{
                padding: '10px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} />
              Add Medication
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          borderBottom: '2px solid #e9ecef',
        }}
      >
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'inventory' ? '3px solid #007bff' : '3px solid transparent',
            color: activeTab === 'inventory' ? '#007bff' : '#6c757d',
            fontWeight: activeTab === 'inventory' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Inventory
        </button>
        <button
          onClick={() => setActiveTab('medications')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom:
              activeTab === 'medications'
                ? '3px solid #007bff'
                : '3px solid transparent',
            color: activeTab === 'medications' ? '#007bff' : '#6c757d',
            fontWeight: activeTab === 'medications' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Medications
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Search and Filter */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
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
                placeholder="Search inventory..."
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
            <div style={{ position: 'relative' }}>
              <Filter
                size={18}
                color="#6c757d"
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '8px 12px 8px 36px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  appearance: 'none',
                }}
              >
                <option value="all">All Items</option>
                <option value="low">Low Stock</option>
                <option value="expiring">Expiring Soon</option>
              </select>
            </div>
          </div>

          {/* Inventory Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '20px',
            }}
          >
            {renderInventoryGrid()}
          </div>
        </>
      ) : (
        <>
          {/* Medications Table */}
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
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '14px',
                    }}
                  >
                    Medication Name
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '14px',
                    }}
                  >
                    Generic Name
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '14px',
                    }}
                  >
                    Form
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '14px',
                    }}
                  >
                    Strength
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '14px',
                    }}
                  >
                    ATC Code
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '14px',
                    }}
                  >
                    ART
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '14px',
                    }}
                  >
                    Controlled
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '14px',
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: '#333',
                      fontSize: '14px',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {medications.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#6c757d',
                      }}
                    >
                      No medications found
                    </td>
                  </tr>
                ) : (
                  medications.map((med) => (
                    <tr
                      key={med.medication_id}
                      style={{
                        borderBottom: '1px solid #dee2e6',
                        '&:hover': { background: '#f8f9fa' },
                      }}
                    >
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {med.medication_name}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6c757d' }}>
                        {med.generic_name || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {med.form}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {med.strength || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {med.atc_code || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {med.is_art ? (
                          <span
                            style={{
                              background: '#28a745',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                          >
                            Yes
                          </span>
                        ) : (
                          <span style={{ color: '#6c757d' }}>No</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {med.is_controlled ? (
                          <span
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                          >
                            Yes
                          </span>
                        ) : (
                          <span style={{ color: '#6c757d' }}>No</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {med.active ? (
                          <span
                            style={{
                              background: '#28a745',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                          >
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#6c757d',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                          >
                            Inactive
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '12px',
                          fontSize: '14px',
                          display: 'flex',
                          gap: '8px',
                          justifyContent: 'center',
                        }}
                      >
                        <button
                          onClick={() => handleEditMedication(med)}
                          style={{
                            padding: '4px 8px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMedication(med.medication_id)}
                          style={{
                            padding: '4px 8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
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
              borderRadius: '8px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: 'calc(100vh - 104px)',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ margin: 0 }}>Edit Inventory Item</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px',
                }}
              >
                <X size={24} color="#6c757d" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const itemData = {
                  quantity_on_hand: editingItem.quantity_on_hand, // Keep current value, not editable
                  unit: formData.get('unit'),
                  expiry_date: formData.get('expiry_date'),
                  reorder_level: formData.get('reorder_level'),
                  supplier: formData.get('supplier'),
                };
                handleUpdateItem(itemData);
              }}
            >
              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Drug Name
                </label>
                <input
                  type="text"
                  value={editingItem.medication_name}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    background: '#e9ecef',
                    color: '#6c757d',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Stock Quantity
                  </label>
                  <input
                    type="text"
                    value={`${editingItem.quantity_on_hand} ${editingItem.unit}`}
                    disabled
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      background: '#e9ecef',
                      color: '#6c757d',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Unit <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    name="unit"
                    required
                    defaultValue={editingItem.unit}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  >
                    <option value="tablets">Tablets</option>
                    <option value="capsules">Capsules</option>
                    <option value="bottles">Bottles</option>
                    <option value="vials">Vials</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Expiry Date <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    required
                    defaultValue={editingItem.expiry_date ? editingItem.expiry_date.split('T')[0] : ''}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Reorder Level <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="reorder_level"
                    required
                    min="0"
                    defaultValue={editingItem.reorder_level}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Supplier <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="supplier"
                  required
                  defaultValue={editingItem.supplier}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
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
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Item Modal */}
      {showRestockModal && restockingItem && (
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
              borderRadius: '8px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ margin: 0 }}>Restock Item</h2>
              <button
                onClick={() => {
                  setShowRestockModal(false);
                  setRestockingItem(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px',
                }}
              >
                <X size={24} color="#6c757d" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const quantity = formData.get('quantity_to_add');
                handleRestock(quantity);
              }}
            >
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Drug Name
                </label>
                <input
                  type="text"
                  value={restockingItem.medication_name}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    background: '#e9ecef',
                    color: '#6c757d',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Current Stock
                </label>
                <input
                  type="text"
                  value={`${restockingItem.quantity_on_hand} ${restockingItem.unit}`}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    background: '#e9ecef',
                    color: '#6c757d',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Quantity to Add <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="number"
                  name="quantity_to_add"
                  required
                  min="1"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowRestockModal(false);
                    setRestockingItem(null);
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
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
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
              borderRadius: '8px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: 'calc(100vh - 104px)',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ margin: 0 }}>Add Inventory Item</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px',
                }}
              >
                <X size={24} color="#6c757d" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const itemData = {
                  medication_id: formData.get('medication_id'),
                  quantity_on_hand: parseInt(formData.get('quantity_on_hand')),
                  unit: formData.get('unit'),
                  expiry_date: formData.get('expiry_date') || null,
                  reorder_level: parseInt(formData.get('reorder_level')),
                  supplier: formData.get('supplier') || null,
                  batch_number: formData.get('batch_number') || null,
                  cost_per_unit: formData.get('cost_per_unit')
                    ? parseFloat(formData.get('cost_per_unit'))
                    : null,
                };
                handleAddItem(itemData);
              }}
            >
              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Medication <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  name="medication_id"
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                >
                  <option value="">Select a medication</option>
                  {medications
                    .filter((med) => med.active !== false)
                    .map((med) => (
                      <option key={med.medication_id} value={med.medication_id}>
                        {med.medication_name}
                        {med.generic_name ? ` (${med.generic_name})` : ''}
                        {med.strength ? ` - ${med.strength}` : ''}
                        {med.form ? ` [${med.form}]` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Stock Quantity <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity_on_hand"
                    required
                    min="0"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Unit <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    name="unit"
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  >
                    <option value="tablets">Tablets</option>
                    <option value="capsules">Capsules</option>
                    <option value="bottles">Bottles</option>
                    <option value="vials">Vials</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Batch Number
                </label>
                <input
                  type="text"
                  name="batch_number"
                  placeholder="Optional batch number"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Reorder Level <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="reorder_level"
                    required
                    min="0"
                    defaultValue="0"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Supplier
                  </label>
                  <input
                    type="text"
                    name="supplier"
                    placeholder="Optional supplier name"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Cost per Unit
                  </label>
                  <input
                    type="number"
                    name="cost_per_unit"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medication Modal */}
      {showMedicationModal && (
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
              borderRadius: '8px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: 'calc(100vh - 104px)',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2 style={{ margin: 0 }}>
                {editingMedication ? 'Edit Medication' : 'Add Medication'}
              </h2>
              <button
                onClick={() => {
                  setShowMedicationModal(false);
                  setEditingMedication(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  borderRadius: '4px',
                }}
              >
                <X size={24} color="#6c757d" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const medicationData = {
                  medication_name: formData.get('medication_name'),
                  generic_name: formData.get('generic_name') || null,
                  form: formData.get('form'),
                  strength: formData.get('strength') || null,
                  atc_code: formData.get('atc_code') || null,
                  is_art: formData.get('is_art') === 'true',
                  is_controlled: formData.get('is_controlled') === 'true',
                  active: formData.get('active') !== 'false',
                };

                if (editingMedication) {
                  handleUpdateMedication(medicationData);
                } else {
                  handleAddMedication(medicationData);
                }
              }}
            >
              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Medication Name <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  name="medication_name"
                  required
                  defaultValue={editingMedication?.medication_name || ''}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Generic Name
                </label>
                <input
                  type="text"
                  name="generic_name"
                  defaultValue={editingMedication?.generic_name || ''}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Form <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    name="form"
                    required
                    defaultValue={editingMedication?.form || ''}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  >
                    <option value="">Select form</option>
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup</option>
                    <option value="injection">Injection</option>
                    <option value="cream">Cream</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: 'bold',
                    }}
                  >
                    Strength
                  </label>
                  <input
                    type="text"
                    name="strength"
                    defaultValue={editingMedication?.strength || ''}
                    placeholder="e.g., 500mg"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  ATC Code
                </label>
                <input
                  type="text"
                  name="atc_code"
                  defaultValue={editingMedication?.atc_code || ''}
                  maxLength="10"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    name="is_art"
                    value="true"
                    defaultChecked={editingMedication?.is_art || false}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 'bold' }}>ART Medication</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    name="is_controlled"
                    value="true"
                    defaultChecked={editingMedication?.is_controlled || false}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 'bold' }}>Controlled Substance</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    name="active"
                    value="true"
                    defaultChecked={
                      editingMedication ? editingMedication.active !== false : true
                    }
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 'bold' }}>Active</span>
                </label>
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowMedicationModal(false);
                    setEditingMedication(null);
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
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {editingMedication ? 'Update Medication' : 'Add Medication'}
                </button>
              </div>
            </form>
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
            animation: 'slideIn 0.3s ease',
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

      {/* Add keyframes for animation */}
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

export default Inventory;