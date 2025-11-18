import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

const LabTests = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState('results');
  
  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [testFilter, setTestFilter] = useState('all');
  
  // State for loading and toast notifications
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // State for patients and facilities (for forms)
  const [patients, setPatients] = useState([]);
  const [facilities, setFacilities] = useState([]);
  
  // State for test results
  const [testResults, setTestResults] = useState([]);
  
  // State for lab orders
  const [labOrders, setLabOrders] = useState([]);
  
  // State for lab files
  const [labFiles, setLabFiles] = useState([]);
  
  // State to track deleting files (to disable delete buttons)
  const [deletingFiles, setDeletingFiles] = useState(new Set());

  // Users with their names and roles
  const [users] = useState([
    { name: 'Admin User', role: 'ADMIN' },
    { name: 'Dr. Alice Johnson', role: 'PHYSICIAN' },
    { name: 'Dr. Bob Williams', role: 'PHYSICIAN' },
    { name: 'Nurse Carol Davis', role: 'NURSE' },
    { name: 'Manager Frank Wright', role: 'CASE MANAGER' },
    { name: 'Lab Tech Eve Miller', role: 'LAB PERSONNEL' },
  ]);

  // Extract unique roles for the role dropdown
  const uniqueRoles = [...new Set(users.map((user) => user.role))];

  // Fetch data on component mount
  useEffect(() => {
    fetchPatients();
    fetchFacilities();
    fetchLabOrders(); // Fetch orders for the form dropdown
  }, []);

  // Fetch lab results when results tab is active or filters change
  useEffect(() => {
    if (activeTab === 'results') {
      // If search term exists, debounce the fetch
      if (searchTerm) {
        const timeoutId = setTimeout(() => {
          fetchLabResults();
        }, 300); // Debounce search
        return () => clearTimeout(timeoutId);
      } else {
        // If no search term, fetch immediately
        fetchLabResults();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTerm, testFilter]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Get auth token helper
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Fetch patients from API
  const fetchPatients = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/patients?status=active`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let patientsArray = [];
      
      if (data.success && data.patients) {
        patientsArray = data.patients;
      } else if (Array.isArray(data)) {
        patientsArray = data;
      } else if (data && typeof data === 'object') {
        patientsArray = data.patients || data.data || [];
      }

      setPatients(patientsArray);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  // Fetch facilities from API
  const fetchFacilities = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/facilities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let facilitiesArray = [];
      
      if (data.success && data.data) {
        facilitiesArray = data.data;
      } else if (Array.isArray(data)) {
        facilitiesArray = data;
      } else if (data && typeof data === 'object') {
        facilitiesArray = data.facilities || data.data || [];
      }

      setFacilities(facilitiesArray);
    } catch (error) {
      console.error('Error fetching facilities:', error);
    }
  };

  // Fetch lab results from API
  const fetchLabResults = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({
          message: 'Please login to view lab results',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (testFilter && testFilter !== 'all') params.append('test_name', testFilter);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/lab-results${queryString ? `?${queryString}` : ''}`;

      console.log('Fetching lab results from:', url);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Lab results response:', data);

      if (data.success && data.data) {
        console.log('Setting lab results:', data.data.length, 'results');
        setTestResults(data.data);
      } else {
        console.warn('No data in response or success is false');
        setTestResults([]);
      }
    } catch (error) {
      console.error('Error fetching lab results:', error);
      setToast({
        message: `Failed to load lab results: ${error.message}`,
        type: 'error',
      });
      setTestResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch lab files from API
  const fetchLabFiles = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({
          message: 'Please login to view lab files',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/lab-files`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Lab files response:', data);

      if (data.success && data.data) {
        console.log('Setting lab files:', data.data.length, 'files');
        setLabFiles(data.data);
      } else {
        console.warn('No data in response or success is false');
        setLabFiles([]);
      }
    } catch (error) {
      console.error('Error fetching lab files:', error);
      setToast({
        message: `Failed to load lab files: ${error.message}`,
        type: 'error',
      });
      setLabFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch lab orders from API
  const fetchLabOrders = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({
          message: 'Please login to view lab orders',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const queryString = params.toString();
      const url = `${API_BASE_URL}/lab-orders${queryString ? `?${queryString}` : ''}`;

      console.log('Fetching lab orders from:', url);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Lab orders response:', data);

      if (data.success && data.data) {
        console.log('Setting lab orders:', data.data.length, 'orders');
        setLabOrders(data.data);
      } else {
        console.warn('No data in response or success is false');
        setLabOrders([]);
      }
    } catch (error) {
      console.error('Error fetching lab orders:', error);
      setToast({
        message: `Failed to load lab orders: ${error.message}`,
        type: 'error',
      });
      setLabOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('addResult'); // 'addResult', 'addOrder', 'viewResult', 'editResult', 'uploadFile'
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form state
  const [newTest, setNewTest] = useState({
    order_id: '',
    patient_id: '',
    test_code: '',
    test_name: '',
    result_value: '',
    unit: '',
    reported_at: '',
    collected_at: '',
    reference_range_min: '',
    reference_range_max: '',
    reference_range_text: '',
    notes: ''
  });
  
  const [newOrder, setNewOrder] = useState({
    patient_id: '',
    test_panel: '',
    order_date: '',
    facility_id: '',
    status: 'ordered',
    priority: 'routine',
    collection_date: '',
    notes: ''
  });
  
  const [newFile, setNewFile] = useState({
    result_id: '',
    file: null
  });

  // Handle input changes for forms
  const handleInputChange = (e, formType = 'test') => {
    const { name, value } = e.target;
    
    if (formType === 'test') {
      setNewTest((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else if (formType === 'order') {
      setNewOrder((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else if (formType === 'file') {
      setNewFile((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };
  
  // Handle file selection
  const handleFileChange = (e) => {
    setNewFile(prev => ({
      ...prev,
      file: e.target.files[0]
    }));
  };

  // Submit handlers
  const handleSubmitResult = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({ message: 'Please login to create lab results', type: 'error' });
        return;
      }

      if (!newTest.order_id || !newTest.patient_id || !newTest.test_name || !newTest.result_value) {
        setToast({ message: 'Please fill in all required fields', type: 'error' });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/lab-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: newTest.order_id,
          patient_id: newTest.patient_id,
          test_code: newTest.test_code || newTest.test_name.substring(0, 10).toUpperCase().replace(/\s/g, ''),
          test_name: newTest.test_name,
          result_value: newTest.result_value,
          unit: newTest.unit || null,
          reference_range_min: newTest.reference_range_min ? parseFloat(newTest.reference_range_min) : null,
          reference_range_max: newTest.reference_range_max ? parseFloat(newTest.reference_range_max) : null,
          reference_range_text: newTest.reference_range_text || null,
          collected_at: newTest.collected_at || null,
          reported_at: newTest.reported_at || new Date().toISOString().split('T')[0],
          notes: newTest.notes || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create lab result');
      }

      if (data.success) {
        setToast({ 
          message: data.is_critical 
            ? 'Lab result created successfully (CRITICAL VALUE DETECTED!)' 
            : 'Lab result created successfully', 
          type: data.is_critical ? 'error' : 'success' 
        });
        resetTestForm();
        setShowModal(false);
        fetchLabResults(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to create lab result');
      }
    } catch (error) {
      console.error('Error creating lab result:', error);
      setToast({ message: `Failed to create lab result: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({ message: 'Please login to create lab orders', type: 'error' });
        return;
      }

      if (!newOrder.patient_id || !newOrder.test_panel || !newOrder.facility_id) {
        setToast({ message: 'Please fill in all required fields', type: 'error' });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/lab-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patient_id: newOrder.patient_id,
          test_panel: newOrder.test_panel,
          order_date: newOrder.order_date || new Date().toISOString().split('T')[0],
          facility_id: newOrder.facility_id,
          priority: newOrder.priority,
          status: newOrder.status,
          collection_date: newOrder.collection_date || null,
          notes: newOrder.notes || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create lab order');
      }

      if (data.success) {
        setToast({ message: 'Lab order created successfully', type: 'success' });
        resetOrderForm();
        setShowModal(false);
        fetchLabOrders(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to create lab order');
      }
    } catch (error) {
      console.error('Error creating lab order:', error);
      setToast({ message: `Failed to create lab order: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitFile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({ message: 'Please login to upload lab files', type: 'error' });
        return;
      }

      if (!newFile.result_id || !newFile.file) {
        setToast({ message: 'Please select a result and file', type: 'error' });
        return;
      }

      const formData = new FormData();
      formData.append('file', newFile.file);
      formData.append('result_id', newFile.result_id);

      const response = await fetch(`${API_BASE_URL}/lab-files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload lab file');
      }

      if (data.success) {
        setToast({ message: 'Lab file uploaded successfully', type: 'success' });
        resetFileForm();
        setShowModal(false);
        fetchLabFiles(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to upload lab file');
      }
    } catch (error) {
      console.error('Error uploading lab file:', error);
      setToast({ message: `Failed to upload lab file: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Reset form functions
  const resetTestForm = () => {
    setNewTest({
      order_id: '',
      patient_id: '',
      test_code: '',
      test_name: '',
      result_value: '',
      unit: '',
      reported_at: '',
      collected_at: '',
      reference_range_min: '',
      reference_range_max: '',
      reference_range_text: '',
      notes: ''
    });
  };
  
  const resetOrderForm = () => {
    setNewOrder({
      patient_id: '',
      test_panel: '',
      order_date: '',
      facility_id: '',
      status: 'ordered',
      priority: 'routine',
      collection_date: '',
      notes: ''
    });
  };
  
  const resetFileForm = () => {
    setNewFile({
      result_id: '',
      file: null
    });
  };

  // Modal control functions
  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    
    if (type === 'editResult' && item) {
      setNewTest({
        order_id: item.order_id || '',
        patient_id: item.patient_id || '',
        test_code: item.test_code || '',
        test_name: item.testName || item.test_name || '',
        result_value: item.result_value || item.result?.split(' ')[0] || '',
        unit: item.unit || item.result?.split(' ').slice(1).join(' ') || '',
        reported_at: item.reported_at || item.date || '',
        collected_at: item.collected_at || '',
        reference_range_min: item.reference_range_min || '',
        reference_range_max: item.reference_range_max || '',
        reference_range_text: item.reference_range_text || '',
        notes: item.notes || ''
      });
    } else if (type === 'uploadFile' && item) {
      setNewFile({
        result_id: item.result_id || item.id,
        file: null
      });
    }
    
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    resetTestForm();
    resetOrderForm();
    resetFileForm();
    setSelectedItem(null);
  };
  
  // Delete functions
  const deleteResult = async (id) => {
    if (!window.confirm('Are you sure you want to delete this test result?')) {
      return;
    }

    const resultId = typeof id === 'object' ? (id.result_id || id.id) : id;

    // Add to deleting set to disable button
    setDeletingFiles(prev => new Set(prev).add(resultId));

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({ message: 'Please login to delete lab results', type: 'error' });
        setDeletingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(resultId);
          return newSet;
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/lab-results/${resultId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete lab result');
      }

      if (data.success) {
        setToast({ message: 'Lab result deleted successfully', type: 'success' });
        // Optimistically remove from list immediately
        setTestResults(prev => prev.filter(r => (r.result_id || r.id) !== resultId));
        // Remove from deleting set
        setDeletingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(resultId);
          return newSet;
        });
        // Refresh the list to ensure consistency
        fetchLabResults();
      } else {
        throw new Error(data.message || 'Failed to delete lab result');
      }
    } catch (error) {
      console.error('Error deleting lab result:', error);
      setToast({ message: `Failed to delete lab result: ${error.message}`, type: 'error' });
      // Remove from deleting set on error so button can be clicked again
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(resultId);
        return newSet;
      });
    } finally {
      setLoading(false);
    }
  };
  
  const deleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this lab order?')) {
      return;
    }

    // Add to deleting set to disable button
    setDeletingFiles(prev => new Set(prev).add(id));

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({ message: 'Please login to delete lab orders', type: 'error' });
        setDeletingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/lab-orders/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete lab order');
      }

      if (data.success) {
        setToast({ message: 'Lab order cancelled successfully', type: 'success' });
        // Optimistically remove from list immediately
        setLabOrders(prev => prev.filter(o => (o.order_id || o.id) !== id));
        // Remove from deleting set
        setDeletingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        // Refresh the list to ensure consistency
        fetchLabOrders();
      } else {
        throw new Error(data.message || 'Failed to delete lab order');
      }
    } catch (error) {
      console.error('Error deleting lab order:', error);
      setToast({ message: `Failed to cancel lab order: ${error.message}`, type: 'error' });
      // Remove from deleting set on error so button can be clicked again
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } finally {
      setLoading(false);
    }
  };
  
  const deleteFile = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    const fileId = typeof id === 'object' ? (id.file_id || id.id) : id;

    // Add to deleting set to disable button
    setDeletingFiles(prev => new Set(prev).add(fileId));

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({ message: 'Please login to delete lab files', type: 'error' });
        setDeletingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/lab-files/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete lab file');
      }

      if (data.success) {
        setToast({ message: 'Lab file deleted successfully', type: 'success' });
        // Optimistically remove from list immediately
        setLabFiles(prev => prev.filter(f => (f.file_id || f.id) !== fileId));
        // Remove from deleting set
        setDeletingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        // Refresh the list to ensure consistency
        fetchLabFiles();
      } else {
        throw new Error(data.message || 'Failed to delete lab file');
      }
    } catch (error) {
      console.error('Error deleting lab file:', error);
      setToast({ message: `Failed to delete lab file: ${error.message}`, type: 'error' });
      // Remove from deleting set on error so button can be clicked again
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Update result function
  const updateResult = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setToast({ message: 'Please login to update lab results', type: 'error' });
        return;
      }

      const resultId = selectedItem.result_id || selectedItem.id;

      const response = await fetch(`${API_BASE_URL}/lab-results/${resultId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          test_code: newTest.test_code || selectedItem.test_code,
          test_name: newTest.test_name,
          result_value: newTest.result_value,
          unit: newTest.unit || null,
          reference_range_min: newTest.reference_range_min ? parseFloat(newTest.reference_range_min) : null,
          reference_range_max: newTest.reference_range_max ? parseFloat(newTest.reference_range_max) : null,
          reference_range_text: newTest.reference_range_text || null,
          collected_at: newTest.collected_at || null,
          reported_at: newTest.reported_at || null,
          notes: newTest.notes || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update lab result');
      }

      if (data.success) {
        setToast({ message: 'Lab result updated successfully', type: 'success' });
        resetTestForm();
        setShowModal(false);
        fetchLabResults(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to update lab result');
      }
    } catch (error) {
      console.error('Error updating lab result:', error);
      setToast({ message: `Failed to update lab result: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Filter functions
  const filteredResults = testResults.filter(result => {
    const matchesSearch = searchTerm === '' || 
      result.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.result.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTest = testFilter === 'all' || result.testName === testFilter;
    
    return matchesSearch && matchesTest;
  });
  
  // Fetch lab orders when orders tab is active or filters change
  useEffect(() => {
    if (activeTab === 'orders') {
      // If search term exists, debounce the fetch
      if (searchTerm) {
        const timeoutId = setTimeout(() => {
          fetchLabOrders();
        }, 300); // Debounce search
        return () => clearTimeout(timeoutId);
      } else {
        // If no search term, fetch immediately
        fetchLabOrders();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchTerm, statusFilter]);

  // Fetch lab files when files tab is active
  useEffect(() => {
    if (activeTab === 'files') {
      fetchLabFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Filter orders (client-side filtering as backup, but API handles most filtering)
  const filteredOrders = labOrders;
  
  // Get unique test names for filter
  const uniqueTestNames = [...new Set(testResults.map(result => result.testName))];

  // Styles
  const styles = {
    pageContainer: {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
    },
    topBar: {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '0 5px',
    },
    adminUser: {
      color: '#555',
      fontSize: '14px',
      marginRight: '15px',
    },
    notificationIcon: {
      position: 'relative',
      cursor: 'pointer',
      color: '#555',
    },
    notificationBadge: {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      backgroundColor: '#e74c3c',
      color: 'white',
      borderRadius: '50%',
      width: '16px',
      height: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: 'bold',
    },
    tabsContainer: {
      display: 'flex',
      marginBottom: '20px',
      borderBottom: '1px solid #ddd',
    },
    tab: {
      padding: '12px 20px',
      cursor: 'pointer',
      borderBottom: '2px solid transparent',
      fontWeight: '500',
      color: '#555',
    },
    activeTab: {
      borderBottom: '2px solid #007bff',
      color: '#007bff',
    },
    mainCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 25px',
      borderBottom: '1px solid #e9ecef',
    },
    cardTitle: {
      color: '#333',
      fontSize: '24px',
      fontWeight: 'bold',
      margin: 0,
    },
    addButton: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '5px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    filterContainer: {
      display: 'flex',
      gap: '15px',
      padding: '15px 25px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #e9ecef',
    },
    searchInput: {
      flex: 1,
      padding: '8px 12px',
      border: '1px solid #ced4da',
      borderRadius: '5px',
      fontSize: '14px',
    },
    filterSelect: {
      padding: '8px 12px',
      border: '1px solid #ced4da',
      borderRadius: '5px',
      fontSize: '14px',
      backgroundColor: 'white',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    tableHeaderCell: {
      padding: '12px 25px',
      textAlign: 'left',
      fontWeight: 'bold',
      fontSize: '14px',
      color: '#495057',
      backgroundColor: '#f8f9fa',
      borderBottom: '2px solid #dee2e6',
    },
    tableRow: {
      borderBottom: '1px solid #dee2e6',
      transition: 'background-color 0.2s',
    },
    tableCell: {
      padding: '15px 25px',
      color: '#333',
      fontSize: '14px',
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    completedStatus: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },
    orderedStatus: {
      backgroundColor: '#d1ecf1',
      color: '#0c5460',
    },
    inProgressStatus: {
      backgroundColor: '#fff3cd',
      color: '#856404',
    },
    priorityBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    routinePriority: {
      backgroundColor: '#e2e3e5',
      color: '#383d41',
    },
    urgentPriority: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    },
    actionsCell: {
      display: 'flex',
      gap: '8px',
    },
    actionButton: {
      padding: '4px 8px',
      fontSize: '12px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    viewButton: {
      backgroundColor: '#17a2b8',
      color: 'white',
    },
    editButton: {
      backgroundColor: '#ffc107',
      color: '#212529',
    },
    deleteButton: {
      backgroundColor: '#dc3545',
      color: 'white',
    },
    uploadButton: {
      backgroundColor: '#6f42c1',
      color: 'white',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '600px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    modalHeader: {
      padding: '20px 25px',
      borderBottom: '1px solid #dee2e6',
      backgroundColor: '#f8f9fa',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      margin: 0,
      color: '#333',
      fontSize: '20px',
      fontWeight: '600',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#6c757d',
    },
    form: {
      padding: '25px',
    },
    formRow: {
      display: 'flex',
      gap: '20px',
      marginBottom: '20px',
    },
    formGroup: {
      flex: 1,
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      color: '#495057',
      fontSize: '14px',
      fontWeight: '600',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #ced4da',
      borderRadius: '5px',
      fontSize: '14px',
      color: '#495057',
      backgroundColor: 'white',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #ced4da',
      borderRadius: '5px',
      fontSize: '14px',
      color: '#495057',
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #ced4da',
      borderRadius: '5px',
      fontSize: '14px',
      color: '#495057',
      minHeight: '80px',
      resize: 'vertical',
    },
    modalActions: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '25px',
      paddingTop: '20px',
      borderTop: '1px solid #dee2e6',
    },
    cancelButton: {
      padding: '10px 20px',
      border: '1px solid #6c757d',
      backgroundColor: 'white',
      color: '#6c757d',
      borderRadius: '5px',
      fontSize: '14px',
      cursor: 'pointer',
      fontWeight: '500',
    },
    submitButton: {
      padding: '10px 20px',
      border: 'none',
      backgroundColor: '#007bff',
      color: 'white',
      borderRadius: '5px',
      fontSize: '14px',
      cursor: 'pointer',
      fontWeight: '500',
    },
    updateButton: {
      padding: '10px 20px',
      border: 'none',
      backgroundColor: '#28a745',
      color: 'white',
      borderRadius: '5px',
      fontSize: '14px',
      cursor: 'pointer',
      fontWeight: '500',
    },
    emptyState: {
      padding: '40px',
      textAlign: 'center',
      color: '#6c757d',
    },
    emptyStateIcon: {
      fontSize: '48px',
      marginBottom: '15px',
      color: '#dee2e6',
    },
    emptyStateText: {
      fontSize: '16px',
      marginBottom: '20px',
    },
    toast: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '15px 20px',
      borderRadius: '5px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: 2000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      minWidth: '250px',
    },
    toastSuccess: {
      backgroundColor: '#28a745',
    },
    toastError: {
      backgroundColor: '#dc3545',
    },
  };

  return (
    <div style={styles.pageContainer}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          ...styles.toast,
          ...(toast.type === 'success' ? styles.toastSuccess : styles.toastError)
        }}>
          {toast.message}
        </div>
      )}

      {/* Top Bar for User and Notifications */}
      <div style={styles.topBar}>
        <span style={styles.adminUser}>Admin User</span>
        <div style={styles.notificationIcon}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span style={styles.notificationBadge}>3</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <div 
          style={{...styles.tab, ...(activeTab === 'results' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('results')}
        >
          Lab Results
        </div>
        <div 
          style={{...styles.tab, ...(activeTab === 'orders' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('orders')}
        >
          Lab Orders
        </div>
        <div 
          style={{...styles.tab, ...(activeTab === 'files' ? styles.activeTab : {})}}
          onClick={() => setActiveTab('files')}
        >
          Lab Files
        </div>
      </div>

      {/* Main Card containing Title, Button, and Table */}
      <div style={styles.mainCard}>
        {/* Lab Results Tab */}
        {activeTab === 'results' && (
          <>
            <div style={styles.cardHeader}>
              <h1 style={styles.cardTitle}>Laboratory Test Results</h1>
              <button 
                style={styles.addButton} 
                onClick={() => openModal('addResult')}
              >
                Add Test Result
              </button>
            </div>
            
            <div style={styles.filterContainer}>
              <input
                type="text"
                placeholder="Search results..."
                style={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                style={styles.filterSelect}
                value={testFilter}
                onChange={(e) => setTestFilter(e.target.value)}
              >
                <option value="all">All Tests</option>
                {uniqueTestNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeaderCell}>PATIENT</th>
                  <th style={styles.tableHeaderCell}>TEST NAME</th>
                  <th style={styles.tableHeaderCell}>RESULT</th>
                  <th style={styles.tableHeaderCell}>DATE</th>
                  <th style={styles.tableHeaderCell}>STATUS</th>
                  <th style={styles.tableHeaderCell}>PRIORITY</th>
                  <th style={styles.tableHeaderCell}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={styles.tableCell}>
                      <div style={styles.emptyState}>
                        <div style={styles.emptyStateText}>Loading lab results...</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={styles.tableCell}>
                      <div style={styles.emptyState}>
                        <div style={styles.emptyStateIcon}>📋</div>
                        <div style={styles.emptyStateText}>No lab results found</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((result) => (
                    <tr
                      key={result.id}
                      style={styles.tableRow}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = '#f8f9fa')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <td style={styles.tableCell}>{result.patient}</td>
                      <td style={styles.tableCell}>{result.testName}</td>
                      <td style={styles.tableCell}>{result.result}</td>
                      <td style={styles.tableCell}>{result.date}</td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.statusBadge,
                          ...(result.status === 'completed' ? styles.completedStatus : 
                              result.status === 'ordered' ? styles.orderedStatus : 
                              styles.inProgressStatus)
                        }}>
                          {result.status}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.priorityBadge,
                          ...(result.priority === 'routine' ? styles.routinePriority : 
                              styles.urgentPriority)
                        }}>
                          {result.priority}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionsCell}>
                          <button 
                            style={{...styles.actionButton, ...styles.viewButton}}
                            onClick={() => openModal('viewResult', result)}
                          >
                            View
                          </button>
                          <button 
                            style={{...styles.actionButton, ...styles.editButton}}
                            onClick={() => openModal('editResult', result)}
                          >
                            Edit
                          </button>
                          <button 
                            style={{
                              ...styles.actionButton, 
                              ...styles.deleteButton,
                              opacity: deletingFiles.has(result.result_id || result.id) ? 0.5 : 1,
                              cursor: deletingFiles.has(result.result_id || result.id) ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => deleteResult(result.result_id || result.id)}
                            disabled={deletingFiles.has(result.result_id || result.id)}
                          >
                            {deletingFiles.has(result.result_id || result.id) ? 'Deleting...' : 'Delete'}
                          </button>
                          <button 
                            style={{...styles.actionButton, ...styles.uploadButton}}
                            onClick={() => openModal('uploadFile', result)}
                          >
                            Upload
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
        
        {/* Lab Orders Tab */}
        {activeTab === 'orders' && (
          <>
            <div style={styles.cardHeader}>
              <h1 style={styles.cardTitle}>Laboratory Orders</h1>
              <button 
                style={styles.addButton} 
                onClick={() => openModal('addOrder')}
              >
                Add Lab Order
              </button>
            </div>
            
            <div style={styles.filterContainer}>
              <input
                type="text"
                placeholder="Search orders..."
                style={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                style={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="ordered">Ordered</option>
                <option value="collected">Collected</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeaderCell}>PATIENT</th>
                  <th style={styles.tableHeaderCell}>TEST NAME</th>
                  <th style={styles.tableHeaderCell}>DATE</th>
                  <th style={styles.tableHeaderCell}>STATUS</th>
                  <th style={styles.tableHeaderCell}>PRIORITY</th>
                  <th style={styles.tableHeaderCell}>ORDERED BY</th>
                  <th style={styles.tableHeaderCell}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={styles.tableCell}>
                      <div style={styles.emptyState}>
                        <div style={styles.emptyStateText}>Loading lab orders...</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={styles.tableCell}>
                      <div style={styles.emptyState}>
                        <div style={styles.emptyStateIcon}>📋</div>
                        <div style={styles.emptyStateText}>No lab orders found</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      style={styles.tableRow}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = '#f8f9fa')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <td style={styles.tableCell}>{order.patient}</td>
                      <td style={styles.tableCell}>{order.testName}</td>
                      <td style={styles.tableCell}>{order.date}</td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.statusBadge,
                          ...(order.status === 'completed' ? styles.completedStatus : 
                              order.status === 'ordered' ? styles.orderedStatus : 
                              order.status === 'collected' ? styles.orderedStatus :
                              order.status === 'cancelled' ? { backgroundColor: '#f8d7da', color: '#721c24' } :
                              styles.inProgressStatus)
                        }}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{
                          ...styles.priorityBadge,
                          ...(order.priority === 'routine' ? styles.routinePriority : 
                              order.priority === 'stat' ? { backgroundColor: '#f8d7da', color: '#721c24', fontWeight: 'bold' } :
                              styles.urgentPriority)
                        }}>
                          {order.priority.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.tableCell}>{order.orderedBy}</td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionsCell}>
                          <button 
                            style={{...styles.actionButton, ...styles.viewButton}}
                            onClick={() => openModal('viewOrder', order)}
                          >
                            View
                          </button>
                          <button 
                            style={{
                              ...styles.actionButton, 
                              ...styles.deleteButton,
                              opacity: deletingFiles.has(order.order_id || order.id) ? 0.5 : 1,
                              cursor: deletingFiles.has(order.order_id || order.id) ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => deleteOrder(order.order_id || order.id)}
                            disabled={deletingFiles.has(order.order_id || order.id)}
                          >
                            {deletingFiles.has(order.order_id || order.id) ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
        
        {/* Lab Files Tab */}
        {activeTab === 'files' && (
          <>
            <div style={styles.cardHeader}>
              <h1 style={styles.cardTitle}>Laboratory Files</h1>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeaderCell}>FILE NAME</th>
                  <th style={styles.tableHeaderCell}>RESULT</th>
                  <th style={styles.tableHeaderCell}>FILE SIZE</th>
                  <th style={styles.tableHeaderCell}>UPLOADED AT</th>
                  <th style={styles.tableHeaderCell}>UPLOADED BY</th>
                  <th style={styles.tableHeaderCell}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={styles.tableCell}>
                      <div style={styles.emptyState}>
                        <div style={styles.emptyStateText}>Loading lab files...</div>
                      </div>
                    </td>
                  </tr>
                ) : labFiles.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={styles.tableCell}>
                      <div style={styles.emptyState}>
                        <div style={styles.emptyStateIcon}>📁</div>
                        <div style={styles.emptyStateText}>No lab files found</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  labFiles.map((file) => {
                    const fileId = file.file_id || file.id;
                    const isDeleting = deletingFiles.has(fileId);
                    return (
                      <tr
                        key={file.id}
                        style={styles.tableRow}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = '#f8f9fa')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = 'transparent')
                        }
                      >
                        <td style={styles.tableCell}>{file.fileName || file.file_name}</td>
                        <td style={styles.tableCell}>
                          {file.patient && file.testName ? `${file.patient} - ${file.testName}` : 'N/A'}
                        </td>
                        <td style={styles.tableCell}>{file.fileSize || '0 KB'}</td>
                        <td style={styles.tableCell}>{file.uploadedAt || file.uploaded_at}</td>
                        <td style={styles.tableCell}>{file.uploadedBy || 'Unknown'}</td>
                        <td style={styles.tableCell}>
                          <div style={styles.actionsCell}>
                            <button 
                              style={{...styles.actionButton, ...styles.viewButton}}
                              onClick={async () => {
                                try {
                                  const token = getAuthToken();
                                  if (!token) {
                                    setToast({ message: 'Please login to download files', type: 'error' });
                                    return;
                                  }

                                  const response = await fetch(`${API_BASE_URL}/lab-files/${fileId}/download`, {
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  });

                                  if (!response.ok) {
                                    throw new Error('Failed to download file');
                                  }

                                  // Get filename from Content-Disposition header or use file name
                                  const contentDisposition = response.headers.get('Content-Disposition');
                                  let filename = file.fileName || file.file_name || 'download';
                                  if (contentDisposition) {
                                    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                                    if (filenameMatch) {
                                      filename = decodeURIComponent(filenameMatch[1]);
                                    }
                                  }

                                  // Create blob and download
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = filename;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                } catch (error) {
                                  console.error('Error downloading file:', error);
                                  setToast({ message: `Failed to download file: ${error.message}`, type: 'error' });
                                }
                              }}
                            >
                              Download
                            </button>
                            <button 
                              style={{
                                ...styles.actionButton, 
                                ...styles.deleteButton,
                                opacity: isDeleting ? 0.5 : 1,
                                cursor: isDeleting ? 'not-allowed' : 'pointer'
                              }}
                              onClick={() => deleteFile(fileId)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modalType === 'addResult' && 'Add Lab Test Result'}
                {modalType === 'addOrder' && 'Add Lab Order'}
                {modalType === 'viewResult' && 'View Test Result'}
                {modalType === 'editResult' && 'Edit Test Result'}
                {modalType === 'viewOrder' && 'View Lab Order'}
                {modalType === 'uploadFile' && 'Upload File'}
              </h2>
              <button style={styles.closeButton} onClick={closeModal}>×</button>
            </div>
            
            {/* Add/Edit Result Form */}
            {(modalType === 'addResult' || modalType === 'editResult') && (
              <form style={styles.form} onSubmit={modalType === 'addResult' ? handleSubmitResult : updateResult}>
                {modalType === 'addResult' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="order_id">
                      Lab Order * (Select order to auto-fill patient and test)
                    </label>
                    <select
                      id="order_id"
                      name="order_id"
                      value={newTest.order_id}
                      onChange={(e) => {
                        const selectedOrder = labOrders.find(o => o.order_id === e.target.value);
                        if (selectedOrder) {
                          setNewTest(prev => ({
                            ...prev,
                            order_id: e.target.value,
                            patient_id: selectedOrder.patient_id,
                            test_name: selectedOrder.testName
                          }));
                        } else {
                          handleInputChange(e, 'test');
                        }
                      }}
                      style={styles.select}
                      required={modalType === 'addResult'}
                    >
                      <option value="">Select Lab Order</option>
                      {labOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').map((order) => (
                        <option key={order.order_id} value={order.order_id}>
                          {order.patient} - {order.testName} ({order.status}) - {order.date}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="patient_id">
                      Patient *
                    </label>
                    <select
                      id="patient_id"
                      name="patient_id"
                      value={newTest.patient_id}
                      onChange={(e) => handleInputChange(e, 'test')}
                      style={styles.select}
                      required
                      disabled={modalType === 'addResult' && newTest.order_id}
                    >
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient.patient_id} value={patient.patient_id}>
                          {patient.first_name} {patient.middle_name || ''} {patient.last_name} {patient.suffix || ''} ({patient.uic})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="test_name">
                      Test Name *
                    </label>
                    <select
                      id="test_name"
                      name="test_name"
                      value={newTest.test_name}
                      onChange={(e) => handleInputChange(e, 'test')}
                      style={styles.select}
                      required
                      disabled={modalType === 'addResult' && newTest.order_id}
                    >
                      <option value="">Select Test</option>
                      <option value="CD4 Count">CD4 Count</option>
                      <option value="Viral Load">Viral Load</option>
                      <option value="Liver Function">Liver Function</option>
                      <option value="Kidney Function">Kidney Function</option>
                      <option value="Hepatitis B">Hepatitis B</option>
                      <option value="Hepatitis C">Hepatitis C</option>
                      <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="test_code">
                      Test Code
                    </label>
                    <input
                      type="text"
                      id="test_code"
                      name="test_code"
                      value={newTest.test_code}
                      onChange={(e) => handleInputChange(e, 'test')}
                      placeholder="Auto-generated if empty"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="result_value">
                      Result Value *
                    </label>
                    <input
                      type="text"
                      id="result_value"
                      name="result_value"
                      value={newTest.result_value}
                      onChange={(e) => handleInputChange(e, 'test')}
                      placeholder="Enter result value"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="unit">
                      Unit
                    </label>
                    <input
                      type="text"
                      id="unit"
                      name="unit"
                      value={newTest.unit}
                      onChange={(e) => handleInputChange(e, 'test')}
                      placeholder="e.g. cells/μL, copies/mL"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="reported_at">
                      Reported Date *
                    </label>
                    <input
                      type="date"
                      id="reported_at"
                      name="reported_at"
                      value={newTest.reported_at}
                      onChange={(e) => handleInputChange(e, 'test')}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="collected_at">
                      Collection Date
                    </label>
                    <input
                      type="date"
                      id="collected_at"
                      name="collected_at"
                      value={newTest.collected_at}
                      onChange={(e) => handleInputChange(e, 'test')}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="reference_range_text">
                      Reference Range (Text)
                    </label>
                    <input
                      type="text"
                      id="reference_range_text"
                      name="reference_range_text"
                      value={newTest.reference_range_text}
                      onChange={(e) => handleInputChange(e, 'test')}
                      placeholder="e.g. 500-1200 cells/μL"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="reference_range_min">
                      Reference Range Min
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="reference_range_min"
                      name="reference_range_min"
                      value={newTest.reference_range_min}
                      onChange={(e) => handleInputChange(e, 'test')}
                      placeholder="Min value"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="reference_range_max">
                      Reference Range Max
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="reference_range_max"
                      name="reference_range_max"
                      value={newTest.reference_range_max}
                      onChange={(e) => handleInputChange(e, 'test')}
                      placeholder="Max value"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={newTest.notes}
                    onChange={(e) => handleInputChange(e, 'test')}
                    placeholder="Additional notes about the test result"
                    style={styles.textarea}
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={closeModal}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={modalType === 'addResult' ? styles.submitButton : styles.updateButton}
                    disabled={loading}
                  >
                    {loading ? (modalType === 'addResult' ? 'Creating...' : 'Updating...') : (modalType === 'addResult' ? 'Add Test Result' : 'Update Result')}
                  </button>
                </div>
              </form>
            )}
            
            {/* Add Order Form */}
            {modalType === 'addOrder' && (
              <form style={styles.form} onSubmit={handleSubmitOrder}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="patient_id">
                      Patient *
                    </label>
                    <select
                      id="patient_id"
                      name="patient_id"
                      value={newOrder.patient_id}
                      onChange={(e) => handleInputChange(e, 'order')}
                      style={styles.select}
                      required
                    >
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient.patient_id} value={patient.patient_id}>
                          {patient.first_name} {patient.middle_name || ''} {patient.last_name} {patient.suffix || ''} ({patient.uic})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="test_panel">
                      Test Panel *
                    </label>
                    <select
                      id="test_panel"
                      name="test_panel"
                      value={newOrder.test_panel}
                      onChange={(e) => handleInputChange(e, 'order')}
                      style={styles.select}
                      required
                    >
                      <option value="">Select Test</option>
                      <option value="CD4 Count">CD4 Count</option>
                      <option value="Viral Load">Viral Load</option>
                      <option value="Liver Function">Liver Function</option>
                      <option value="Kidney Function">Kidney Function</option>
                      <option value="Hepatitis B">Hepatitis B</option>
                      <option value="Hepatitis C">Hepatitis C</option>
                      <option value="Complete Blood Count (CBC)">Complete Blood Count (CBC)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="order_date">
                      Order Date *
                    </label>
                    <input
                      type="date"
                      id="order_date"
                      name="order_date"
                      value={newOrder.order_date}
                      onChange={(e) => handleInputChange(e, 'order')}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="facility_id">
                      Facility *
                    </label>
                    <select
                      id="facility_id"
                      name="facility_id"
                      value={newOrder.facility_id}
                      onChange={(e) => handleInputChange(e, 'order')}
                      style={styles.select}
                      required
                    >
                      <option value="">Select Facility</option>
                      {facilities.map((facility) => (
                        <option key={facility.facility_id} value={facility.facility_id}>
                          {facility.facility_name || facility.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="collection_date">
                      Collection Date
                    </label>
                    <input
                      type="date"
                      id="collection_date"
                      name="collection_date"
                      value={newOrder.collection_date}
                      onChange={(e) => handleInputChange(e, 'order')}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="priority">
                      Priority *
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={newOrder.priority}
                      onChange={(e) => handleInputChange(e, 'order')}
                      style={styles.select}
                      required
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="status">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={newOrder.status}
                    onChange={(e) => handleInputChange(e, 'order')}
                    style={styles.select}
                    required
                  >
                    <option value="ordered">Ordered</option>
                    <option value="collected">Collected</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={newOrder.notes}
                    onChange={(e) => handleInputChange(e, 'order')}
                    placeholder="Additional notes about the lab order"
                    style={styles.textarea}
                  />
                </div>

                <div style={styles.modalActions}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={closeModal}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={styles.submitButton}
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Add Lab Order'}
                  </button>
                </div>
              </form>
            )}
            
            {/* View Result Modal */}
            {modalType === 'viewResult' && selectedItem && (
              <div style={styles.form}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Patient</label>
                    <input
                      type="text"
                      value={selectedItem.patient}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Test Name</label>
                    <input
                      type="text"
                      value={selectedItem.testName}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Result</label>
                    <input
                      type="text"
                      value={selectedItem.result}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date</label>
                    <input
                      type="text"
                      value={selectedItem.date}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status</label>
                    <input
                      type="text"
                      value={selectedItem.status}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Priority</label>
                    <input
                      type="text"
                      value={selectedItem.priority}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Lab Code</label>
                    <input
                      type="text"
                      value={selectedItem.labCode}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Performed By</label>
                    <input
                      type="text"
                      value={selectedItem.performedBy}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                </div>
                
                {selectedItem.notes && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Notes</label>
                    <textarea
                      value={selectedItem.notes}
                      readOnly
                      style={styles.textarea}
                    />
                  </div>
                )}
                
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            
            {/* View Order Modal */}
            {modalType === 'viewOrder' && selectedItem && (
              <div style={styles.form}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Patient</label>
                    <input
                      type="text"
                      value={selectedItem.patient}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Test Name</label>
                    <input
                      type="text"
                      value={selectedItem.testName}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date</label>
                    <input
                      type="text"
                      value={selectedItem.date}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Lab Code</label>
                    <input
                      type="text"
                      value={selectedItem.labCode}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status</label>
                    <input
                      type="text"
                      value={selectedItem.status}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Priority</label>
                    <input
                      type="text"
                      value={selectedItem.priority}
                      readOnly
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Ordered By</label>
                  <input
                    type="text"
                    value={selectedItem.orderedBy}
                    readOnly
                    style={styles.input}
                  />
                </div>
                
                {selectedItem.notes && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Notes</label>
                    <textarea
                      value={selectedItem.notes}
                      readOnly
                      style={styles.textarea}
                    />
                  </div>
                )}
                
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={closeModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            
            {/* Upload File Modal */}
            {modalType === 'uploadFile' && selectedItem && (
              <form style={styles.form} onSubmit={handleSubmitFile}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Result</label>
                  <input
                    type="text"
                    value={`${selectedItem.patient || 'Unknown'} - ${selectedItem.testName || selectedItem.test_name || 'Unknown Test'}`}
                    readOnly
                    style={styles.input}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="file">
                    File *
                  </label>
                  <input
                    type="file"
                    id="file"
                    onChange={handleFileChange}
                    style={styles.input}
                    required
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                  />
                  {newFile.file && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
                      Selected: {newFile.file.name} ({(newFile.file.size / 1024).toFixed(2)} KB)
                    </div>
                  )}
                </div>
                
                <div style={styles.modalActions}>
                  <button
                    type="button"
                    style={styles.cancelButton}
                    onClick={closeModal}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={styles.submitButton}
                    disabled={loading || !newFile.file}
                  >
                    {loading ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LabTests;