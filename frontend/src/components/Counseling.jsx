// web/src/pages/Counseling.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

const Counseling = () => {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [physicians, setPhysicians] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Map display names to database enum values
  const sessionTypeMap = {
    'Adherence Counseling': 'adherence',
    'Mental Health Support': 'mental_health',
    'Pre-ART Counseling': 'pre_test',
    'Disclosure Support': 'support',
    'Family Counseling': 'support',
    'Substance Abuse': 'other',
  };

  // Reverse map for display
  const sessionTypeDisplayMap = {
    'adherence': 'Adherence Counseling',
    'mental_health': 'Mental Health Support',
    'pre_test': 'Pre-ART Counseling',
    'post_test': 'Post-Test Counseling',
    'support': 'Support',
    'other': 'Other',
  };

  const [newSession, setNewSession] = useState({
    patient_id: '',
    counselor_id: '',
    facility_id: '',
    session_date: new Date().toISOString().split('T')[0],
    session_type: '',
    duration: 45,
    topics: [],
    session_notes: '',
    follow_up_required: false,
    follow_up_date: '',
    follow_up_reason: '',
  });

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Load counseling sessions from API
  const loadSessions = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/counseling-sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Counseling Sessions API Response:', data);
        if (data.success) {
          console.log('Loaded counseling sessions:', data.sessions?.length || 0);
          console.log('Sample session:', data.sessions?.[0]);
          setSessions(data.sessions || []);
        } else {
          console.error('API returned success=false:', data);
          setSessions([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to load counseling sessions:', response.status, errorData);
        alert(`Failed to load counseling sessions: ${errorData.message || response.status}`);
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading counseling sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load patients
  const loadPatients = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Loaded patients:', data.patients?.length || 0);
          setPatients(data.patients || []);
        } else {
          console.error('API returned success=false for patients:', data);
        }
      } else {
        console.error('Failed to load patients:', response.status);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  // Load facilities
  const loadFacilities = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('No auth token available for loading facilities');
        setFacilities([]);
        return;
      }

      const response = await fetch(`${API_URL}/facilities?is_active=1`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Facilities API response:', data);
        
        // Handle different response formats
        let facilitiesArray = [];
        if (data.success && data.data && Array.isArray(data.data)) {
          facilitiesArray = data.data;
        } else if (data.success && data.facilities && Array.isArray(data.facilities)) {
          facilitiesArray = data.facilities;
        } else if (Array.isArray(data)) {
          facilitiesArray = data;
        } else if (data && typeof data === 'object') {
          facilitiesArray = data.facilities || data.data || [];
        }
        
        // Filter to only active facilities if is_active field exists
        if (facilitiesArray.length > 0 && facilitiesArray[0].hasOwnProperty('is_active')) {
          facilitiesArray = facilitiesArray.filter(f => f.is_active === 1 || f.is_active === true);
        }
        
        console.log('Loaded facilities:', facilitiesArray.length);
        setFacilities(facilitiesArray);
        
        if (facilitiesArray.length === 0) {
          console.warn('No active facilities found');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to load facilities:', response.status, errorData);
        setFacilities([]);
      }
    } catch (error) {
      console.error('Error loading facilities:', error);
      setFacilities([]);
    }
  };

  // Load physicians (counselors)
  const loadPhysicians = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/users/providers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Loaded physicians:', data.providers?.length || 0);
          setPhysicians(data.providers || []);
        } else {
          console.error('API returned success=false for providers:', data);
        }
      } else {
        console.error('Failed to load providers:', response.status);
      }
    } catch (error) {
      console.error('Error loading physicians:', error);
    }
  };

  useEffect(() => {
    loadSessions();
    loadPatients();
    loadFacilities();
    loadPhysicians();
  }, []);

  // Calculate statistics
  const totalSessions = sessions.length;
  const followUpNeeded = sessions.filter(
    (s) => s.follow_up_required && s.follow_up_date && new Date(s.follow_up_date) <= new Date()
  ).length;

  // Calculate average duration
  const getAvgDuration = (sessions) => {
    if (sessions.length === 0) return 0;
    const durations = sessions
      .map((s) => {
        try {
          const notesData = s.session_notes ? JSON.parse(s.session_notes) : {};
          return notesData.duration || 0;
        } catch {
          return 0;
        }
      })
      .filter((d) => d > 0);
    if (durations.length === 0) return 0;
    const total = durations.reduce((sum, d) => sum + d, 0);
    return Math.round(total / durations.length);
  };

  const avgDuration = getAvgDuration(sessions);

  // Filter sessions based on search and type filter
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions]; // Create a copy

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((session) => {
        const patientName = (session.patient_name || '').toLowerCase();
        const sessionTypeDisplay = (sessionTypeDisplayMap[session.session_type] || session.session_type || '').toLowerCase();
        const sessionType = (session.session_type || '').toLowerCase();
        return patientName.includes(searchTerm.toLowerCase()) ||
               sessionTypeDisplay.includes(searchTerm.toLowerCase()) ||
               sessionType.includes(searchTerm.toLowerCase());
      });
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((session) => {
        return session.session_type === sessionTypeMap[typeFilter] ||
               sessionTypeDisplayMap[session.session_type] === typeFilter;
      });
    }
    
    console.log('Filtered counseling sessions:', filtered.length, 'out of', sessions.length);
    return filtered;
  }, [sessions, searchTerm, typeFilter]);

  // Get topics from session notes
  const getSessionTopics = (session) => {
    try {
      const notesData = session.session_notes ? JSON.parse(session.session_notes) : {};
      return notesData.topics || [];
    } catch {
      return [];
    }
  };

  // Get duration from session notes
  const getSessionDuration = (session) => {
    try {
      const notesData = session.session_notes ? JSON.parse(session.session_notes) : {};
      return notesData.duration || 0;
    } catch {
      return 0;
    }
  };

  // Check if follow-up is due
  const isFollowUpDue = (session) => {
    return session.follow_up_required && 
           session.follow_up_date && 
           new Date(session.follow_up_date) <= new Date();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'follow_up_required') {
      setNewSession((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'checkbox' && name.startsWith('topic_')) {
      const topicValue = value;
      setNewSession((prev) => {
        const topics = prev.topics || [];
        if (checked) {
          return { ...prev, topics: [...topics, topicValue] };
        } else {
          return { ...prev, topics: topics.filter((t) => t !== topicValue) };
        }
      });
    } else if (type === 'number') {
      setNewSession((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setNewSession((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newSession.patient_id || !newSession.counselor_id || !newSession.facility_id || !newSession.session_date || !newSession.session_type) {
      alert('Please fill in all required fields');
      return;
    }

    if (!newSession.topics || newSession.topics.length === 0) {
      alert('Please select at least one topic');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please log in to record counseling sessions');
        return;
      }

      // Prepare notes with additional fields
      const notesData = {
        duration: newSession.duration || 45,
        topics: newSession.topics || [],
        notes: newSession.session_notes || '',
      };

      const response = await fetch(`${API_URL}/counseling-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patient_id: newSession.patient_id,
          facility_id: newSession.facility_id,
          session_date: newSession.session_date,
          session_type: sessionTypeMap[newSession.session_type] || newSession.session_type || 'other',
          session_notes: JSON.stringify(notesData),
          follow_up_required: newSession.follow_up_required || false,
          follow_up_date: newSession.follow_up_required && newSession.follow_up_date ? newSession.follow_up_date : null,
          follow_up_reason: newSession.follow_up_required && newSession.follow_up_reason ? newSession.follow_up_reason : null,
          counselor_id: newSession.counselor_id || null, // Use selected counselor or current user
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Successfully created counseling session:', data);
          await loadSessions();
          setNewSession({
            patient_id: '',
            counselor_id: '',
            facility_id: '',
            session_date: new Date().toISOString().split('T')[0],
            session_type: '',
            duration: 45,
            topics: [],
            session_notes: '',
            follow_up_required: false,
            follow_up_date: '',
            follow_up_reason: '',
          });
          setShowModal(false);
          alert('Counseling session recorded successfully');
        } else {
          console.error('API returned success=false:', data);
          alert(data.message || 'Failed to record counseling session');
        }
      } else {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to create counseling session:', response.status, error);
        alert(error.message || 'Failed to record counseling session');
      }
    } catch (error) {
      console.error('Error creating counseling session:', error);
      alert('Error creating counseling session');
    }
  };

  const handleCancel = () => {
    setNewSession({
      patient_id: '',
      counselor_id: '',
      facility_id: '',
      session_date: new Date().toISOString().split('T')[0],
      session_type: '',
      duration: 45,
      topics: [],
      session_notes: '',
      follow_up_required: false,
      follow_up_date: '',
      follow_up_reason: '',
    });
    setShowModal(false);
  };

  const viewSessionDetails = (sessionId) => {
    const session = sessions.find((s) => {
      const sId = s.session_id || s.id;
      return sId === sessionId;
    });
    if (session) {
      setSelectedSession(session);
      setShowDetailsModal(true);
    }
  };

  const scheduleFollowUp = (sessionId) => {
    // Navigate to appointments page
    navigate('/appointments');
  };

  // Styles matching the screenshots
  const styles = {
    pageContainer: {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
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
    headerSection: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    headerTitle: {
      color: '#333',
      fontSize: '24px',
      fontWeight: 'bold',
      margin: 0,
    },
    headerSubtitle: {
      color: '#6c757d',
      margin: '5px 0 0 0',
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
    alertWarning: {
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeeba',
      color: '#856404',
      padding: '15px',
      borderRadius: '5px',
      marginBottom: '20px',
    },
    statsContainer: {
      display: 'flex',
      gap: '20px',
      marginBottom: '20px',
    },
    statCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      padding: '20px',
      flex: '1',
      display: 'flex',
      alignItems: 'center',
    },
    statIcon: {
      fontSize: '32px',
      marginRight: '15px',
    },
    statContent: {
      flex: '1',
    },
    statValue: {
      fontSize: '28px',
      fontWeight: 'bold',
      margin: '0 0 5px 0',
    },
    statLabel: {
      fontSize: '14px',
      color: '#6c757d',
      margin: 0,
    },
    filterBar: {
      display: 'flex',
      gap: '15px',
      marginBottom: '20px',
      backgroundColor: 'white',
      padding: '15px 20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    searchInput: {
      flex: '1',
      padding: '10px 12px',
      border: '1px solid #ced4da',
      borderRadius: '5px',
      fontSize: '14px',
    },
    filterSelect: {
      padding: '10px 12px',
      border: '1px solid #ced4da',
      borderRadius: '5px',
      fontSize: '14px',
      width: '200px',
    },
    // New card-based list styles
    listContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
    },
    patientCard: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    patientInfo: {
      flex: 1,
    },
    patientName: {
      fontSize: '18px',
      fontWeight: 'bold',
      margin: '0 0 10px 0',
    },
    patientMeta: {
      display: 'flex',
      gap: '20px',
      fontSize: '14px',
      color: '#495057',
      marginBottom: '10px',
    },
    patientTopics: {
      fontSize: '14px',
      color: '#495057',
      margin: 0,
    },
    // --- UPDATED STYLE ---
    patientActions: {
      display: 'flex',
      flexDirection: 'row', // Changed to 'row'
      alignItems: 'center', // Changed to 'center'
      gap: '10px',
    },
    // --- UPDATED STYLE ---
    badgeWarning: {
      display: 'inline-block',
      padding: '8px 16px', // Updated padding to match buttons
      fontSize: '14px', // Updated font size to match buttons
      fontWeight: '500', // Updated font weight to match buttons
      color: '#856404',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeeba',
      borderRadius: '5px', // Updated border radius to match buttons
    },
    actionButton: {
      padding: '8px 16px',
      fontSize: '14px',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontWeight: '500',
    },
    primaryButton: {
      backgroundColor: '#007bff',
      color: 'white',
    },
    successButton: {
      backgroundColor: '#28a745',
      color: 'white',
    },
    // Modal styles (largely unchanged)
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
      padding: '20px',
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    modalHeader: {
      padding: '20px 25px',
      borderBottom: '1px solid #dee2e6',
      backgroundColor: '#f8f9fa',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      flexShrink: 0,
    },
    modalTitle: {
      margin: 0,
      color: '#333',
      fontSize: '20px',
      fontWeight: '600',
    },
    modalBody: {
      overflowY: 'auto',
      flex: 1,
      minHeight: 0,
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
      minHeight: '100px',
      resize: 'vertical',
    },
    checkboxGroup: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '14px',
      color: '#495057',
    },
    checkboxInput: {
      marginRight: '8px',
    },
    modalActions: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '25px',
      paddingTop: '20px',
      paddingBottom: '20px',
      paddingLeft: '25px',
      paddingRight: '25px',
      borderTop: '1px solid #dee2e6',
      backgroundColor: 'white',
      flexShrink: 0,
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
    alertInfo: {
      backgroundColor: '#d1ecf1',
      border: '1px solid #bee5eb',
      color: '#0c5460',
      padding: '15px',
      borderRadius: '5px',
      marginTop: '15px',
    },
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      minHeight: '100vh', 
      paddingTop: '100px' 
    }}>
      <div style={{ 
        marginBottom: '30px', 
        background: 'linear-gradient(to right, #D84040, #A31D1D)', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 15px rgba(216, 64, 64, 0.2)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>Counseling Sessions</h2>
            <p style={{ margin: 0, color: '#F8F2DE', fontSize: '16px' }}>Manage patient counseling and support sessions</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '10px 16px',
                background: '#ECDCBF',
                color: '#A31D1D',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#F8F2DE';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#ECDCBF';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Record Session
            </button>
          </div>
        </div>
      </div>

      {/* Alert for follow-ups needed */}
      {followUpNeeded > 0 && (
        <div style={styles.alertWarning}>
          <strong>
            ⚠️ {followUpNeeded} patient(s) require follow-up counseling
          </strong>
        </div>
      )}

      {/* Statistics Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#007bff' }}>💬</div>
          <div style={styles.statContent}>
            <p style={styles.statValue}>{totalSessions}</p>
            <p style={styles.statLabel}>Total Sessions</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#ffc107' }}>🔔</div>
          <div style={styles.statContent}>
            <p style={styles.statValue}>{followUpNeeded}</p>
            <p style={styles.statLabel}>Follow-ups Due</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, color: '#17a2b8' }}>⏱️</div>
          <div style={styles.statContent}>
            <p style={styles.statValue}>{avgDuration}</p>
            <p style={styles.statLabel}>Avg. Duration (min)</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search sessions..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          style={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="Adherence Counseling">Adherence Counseling</option>
          <option value="Mental Health Support">Mental Health Support</option>
          <option value="Pre-ART Counseling">Pre-ART Counseling</option>
          <option value="Disclosure Support">Disclosure Support</option>
        </select>
      </div>

      {/* Session List - Card Layout */}
      <div style={styles.listContainer}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            Loading sessions...
          </div>
        ) : filteredSessions.length > 0 ? (
          filteredSessions.map((session) => {
            const sessionId = session.session_id || session.id;
            const isFollowUpDue =
              session.follow_up_required &&
              session.follow_up_date &&
              new Date(session.follow_up_date) <= new Date();
            return (
              <div key={sessionId} style={styles.patientCard}>
                <div style={styles.patientInfo}>
                  <h3 style={styles.patientName}>{session.patient_name || 'N/A'}</h3>
                  <div style={styles.patientMeta}>
                    <span>
                      📅 {session.session_date ? new Date(session.session_date).toLocaleDateString() : 'N/A'}
                    </span>
                    <span>💬 {sessionTypeDisplayMap[session.session_type] || session.session_type || 'N/A'}</span>
                    <span>⏱ {getSessionDuration(session) > 0 ? `${getSessionDuration(session)} minutes` : 'N/A'}</span>
                    {session.follow_up_required && session.follow_up_date && (
                      <span>
                        🔄 Follow-up:{' '}
                        {new Date(session.follow_up_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {getSessionTopics(session).length > 0 && (
                    <p style={styles.patientTopics}>
                      <strong>Topics:</strong> {getSessionTopics(session).join(', ')}
                    </p>
                  )}
                </div>
                <div style={styles.patientActions}>
                  {isFollowUpDue && (
                    <span style={styles.badgeWarning}>FOLLOW-UP DUE</span>
                  )}
                  <button
                    style={{ ...styles.actionButton, ...styles.primaryButton }}
                    onClick={() => viewSessionDetails(sessionId)}
                  >
                    View Details
                  </button>
                  {isFollowUpDue && (
                    <button
                      style={{ ...styles.actionButton, ...styles.successButton }}
                      onClick={() => scheduleFollowUp(sessionId)}
                    >
                      Schedule
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            {sessions.length === 0 
              ? 'No counseling sessions found. Check console for API response details.'
              : `No sessions match your filters. Showing ${sessions.length} total session(s).`}
          </div>
        )}
      </div>

      {/* Add Session Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Record Counseling Session</h2>
            </div>
            <div style={styles.modalBody}>
              <form id="counseling-form" style={styles.form} onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="patient_id">
                  Patient <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  id="patient_id"
                  name="patient_id"
                  value={newSession.patient_id}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map((patient) => (
                    <option key={patient.patient_id || patient.id} value={patient.patient_id || patient.id}>
                      {patient.patient_name || `${patient.first_name || patient.firstName} ${patient.last_name || patient.lastName}`}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="counselor_id">
                  Counselor <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  id="counselor_id"
                  name="counselor_id"
                  value={newSession.counselor_id}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select Counselor</option>
                  {physicians.map((physician) => (
                    <option key={physician.user_id || physician.id} value={physician.user_id || physician.id}>
                      {physician.full_name || physician.fullName || `${physician.first_name || physician.firstName || ''} ${physician.last_name || physician.lastName || ''}`.trim() || physician.username}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="facility_id">
                  MyHubCares Branch <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  id="facility_id"
                  name="facility_id"
                  value={newSession.facility_id}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select MyHubCares Branch</option>
                  {facilities.map((facility) => (
                    <option key={facility.facility_id || facility.id} value={facility.facility_id || facility.id}>
                      {facility.facility_name || facility.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="session_date">
                    Session Date <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    id="session_date"
                    name="session_date"
                    value={newSession.session_date}
                    onChange={handleInputChange}
                    style={styles.input}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="duration">
                    Duration (minutes) <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={newSession.duration}
                    onChange={handleInputChange}
                    style={styles.input}
                    min="15"
                    required
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="session_type">
                  Session Type <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  id="session_type"
                  name="session_type"
                  value={newSession.session_type}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Adherence Counseling">Adherence Counseling</option>
                  <option value="Mental Health Support">Mental Health Support</option>
                  <option value="Pre-ART Counseling">Pre-ART Counseling</option>
                  <option value="Disclosure Support">Disclosure Support</option>
                  <option value="Family Counseling">Family Counseling</option>
                  <option value="Substance Abuse">Substance Abuse</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Topics Covered <span style={{ color: 'red' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    'Medication Adherence',
                    'Side Effect Management',
                    'Lifestyle Modifications',
                    'Mental Health',
                    'Stigma Management',
                    'Family Disclosure',
                    'Safer Sex Practices',
                    'Nutrition'
                  ].map((topic) => (
                    <label key={topic} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name={`topic_${topic}`}
                        value={topic}
                        checked={newSession.topics.includes(topic)}
                        onChange={handleInputChange}
                        style={styles.checkboxInput}
                      />
                      {topic}
                    </label>
                  ))}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label} htmlFor="session_notes">
                  Session Notes <span style={{ color: 'red' }}>*</span>
                </label>
                <textarea
                  id="session_notes"
                  name="session_notes"
                  value={newSession.session_notes}
                  onChange={handleInputChange}
                  placeholder="Document counseling session..."
                  style={styles.textarea}
                  rows="4"
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="follow_up_required"
                    checked={newSession.follow_up_required}
                    onChange={handleInputChange}
                    style={styles.checkboxInput}
                  />
                  Follow-up session required
                </label>
              </div>
              {newSession.follow_up_required && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="follow_up_date">
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      id="follow_up_date"
                      name="follow_up_date"
                      value={newSession.follow_up_date}
                      onChange={handleInputChange}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="follow_up_reason">
                      Follow-up Reason
                    </label>
                    <textarea
                      id="follow_up_reason"
                      name="follow_up_reason"
                      value={newSession.follow_up_reason}
                      onChange={handleInputChange}
                      style={styles.textarea}
                      rows="3"
                      placeholder="Enter reason for follow-up..."
                    />
                  </div>
                </>
              )}
              </form>
            </div>
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button type="submit" form="counseling-form" style={styles.submitButton}>
                Save Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {showDetailsModal && selectedSession && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Counseling Session Details</h2>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.form}>
              {/* Details content remains the same */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Patient Name</label>
                <input
                  type="text"
                  value={selectedSession.patient_name || 'N/A'}
                  readOnly
                  style={styles.input}
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Session Date</label>
                  <input
                    type="date"
                    value={selectedSession.session_date || ''}
                    readOnly
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Counselor</label>
                  <input
                    type="text"
                    value={selectedSession.counselor_name || selectedSession.counselorName || 'N/A'}
                    readOnly
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Session Type</label>
                  <input
                    type="text"
                    value={sessionTypeDisplayMap[selectedSession.session_type] || selectedSession.session_type || 'N/A'}
                    readOnly
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Duration</label>
                  <input
                    type="text"
                    value={`${getSessionDuration(selectedSession)} minutes`}
                    readOnly
                    style={styles.input}
                  />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Topics Covered</label>
                <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px', minHeight: '40px' }}>
                  {getSessionTopics(selectedSession).length > 0 ? (
                    getSessionTopics(selectedSession).map((topic) => (
                      <span
                        key={topic}
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          margin: '2px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          borderRadius: '3px',
                          fontSize: '12px',
                        }}
                      >
                        {topic}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#6c757d' }}>No topics recorded</span>
                  )}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Session Notes</label>
                <textarea
                  rows="4"
                  value={(() => {
                    try {
                      const notesData = selectedSession.session_notes ? JSON.parse(selectedSession.session_notes) : {};
                      return notesData.notes || selectedSession.session_notes || '';
                    } catch {
                      return selectedSession.session_notes || '';
                    }
                  })()}
                  readOnly
                  style={styles.textarea}
                />
              </div>
              {selectedSession.follow_up_required && (
                <div style={styles.alertInfo}>
                  <strong>Follow-up Required:</strong>{' '}
                  {selectedSession.follow_up_date ? new Date(selectedSession.follow_up_date).toLocaleDateString() : 'N/A'}
                  {selectedSession.follow_up_reason && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>Reason:</strong> {selectedSession.follow_up_reason}
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Counseling;