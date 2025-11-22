import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api';

const HTSSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [clientTypes, setClientTypes] = useState([]);
  const [physicians, setPhysicians] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newSession, setNewSession] = useState({
    patient_id: '',
    facility_id: '',
    tester_id: '',
    session_date: new Date().toISOString().split('T')[0],
    session_type: 'Facility-based',
    client_type: '',
    test_result: '',
    test_type: '',
    pre_test_counseling: true,
    consent_given: true,
    post_test_counseling: false,
    linkage_referred: false,
    referral_destination: '',
    remarks: '',
  });

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Load HTS sessions from API
  const loadSessions = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/hts-sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('HTS Sessions API Response:', data);
        if (data.success) {
          console.log('Loaded HTS sessions:', data.sessions?.length || 0);
          console.log('Sample session:', data.sessions?.[0]);
          setSessions(data.sessions || []);
        } else {
          console.error('API returned success=false:', data);
          setSessions([]);
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to load HTS sessions:', response.status, errorData);
        alert(`Failed to load HTS sessions: ${errorData.message || response.status}`);
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading HTS sessions:', error);
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
          setPatients(data.patients || []);
        }
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  // Load facilities
  const loadFacilities = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/facilities`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFacilities(data.facilities || []);
        }
      }
    } catch (error) {
      console.error('Error loading facilities:', error);
    }
  };

  // Load client types
  const loadClientTypes = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/client-types`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setClientTypes(data.client_types || []);
        }
      }
    } catch (error) {
      console.error('Error loading client types:', error);
      // If endpoint doesn't exist, set empty array
      setClientTypes([]);
    }
  };

  // Load physicians (testers/counselors)
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
          console.log('Loaded physicians for HTS:', data.providers?.length || 0);
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
    loadClientTypes();
    loadPhysicians();
  }, []);

  // Filter sessions based on search and result filter
  useEffect(() => {
    let filtered = [...sessions]; // Create a copy

    if (searchTerm) {
      filtered = filtered.filter((session) => {
        const patientName = (session.patient_name || '').toLowerCase();
        return patientName.includes(searchTerm.toLowerCase());
      });
    }

    if (resultFilter !== 'all') {
      filtered = filtered.filter((session) => {
        const result = (session.test_result || '').toLowerCase();
        if (resultFilter === 'Positive') return result === 'positive' || result === 'reactive';
        if (resultFilter === 'Reactive') return result === 'positive' || result === 'reactive';
        if (resultFilter === 'Non-reactive') return result === 'negative' || result === 'non-reactive';
        return true;
      });
    }

    console.log('Filtered HTS sessions:', filtered.length, 'out of', sessions.length);
    setFilteredSessions(filtered);
  }, [searchTerm, resultFilter, sessions]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // If test result is positive or reactive, automatically refer for linkage
    if (name === 'test_result' && (value === 'positive' || value === 'Positive' || value === 'Reactive')) {
      setNewSession((prev) => ({
        ...prev,
        [name]: value,
        linkage_referred: true,
      }));
    } else {
      setNewSession((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newSession.patient_id || !newSession.facility_id || !newSession.tester_id || !newSession.session_date || !newSession.test_result) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        alert('Please log in to record HTS sessions');
        return;
      }

      // Prepare notes with additional fields that might not be in the backend schema
      const notesData = {
        session_type: newSession.session_type,
        client_type: newSession.client_type || null,
        consent_given: newSession.consent_given,
        referral_destination: newSession.referral_destination || null,
        remarks: newSession.remarks || null,
      };

      const response = await fetch(`${API_URL}/hts-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patient_id: newSession.patient_id,
          facility_id: newSession.facility_id,
          tester_id: newSession.tester_id,
          test_date: newSession.session_date,
          test_result: newSession.test_result,
          test_type: newSession.test_type || newSession.session_type || null,
          pre_test_counseling: newSession.pre_test_counseling || false,
          post_test_counseling: newSession.post_test_counseling || false,
          linked_to_care: newSession.linkage_referred || false,
          care_link_date: newSession.linkage_referred ? new Date().toISOString().split('T')[0] : null,
          notes: JSON.stringify(notesData),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadSessions();
          setNewSession({
            patient_id: '',
            facility_id: '',
            tester_id: '',
            session_date: new Date().toISOString().split('T')[0],
            session_type: 'Facility-based',
            client_type: '',
            test_result: '',
            test_type: '',
            pre_test_counseling: true,
            consent_given: true,
            post_test_counseling: false,
            linkage_referred: false,
            referral_destination: '',
            remarks: '',
          });
          setShowModal(false);
        } else {
          alert(data.message || 'Failed to record HTS session');
        }
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to record HTS session');
      }
    } catch (error) {
      console.error('Error creating HTS session:', error);
      alert('Error creating HTS session');
    }
  };

  const handleCancel = () => {
    setNewSession({
      patient_id: '',
      facility_id: '',
      tester_id: '',
      session_date: new Date().toISOString().split('T')[0],
      session_type: 'Facility-based',
      client_type: '',
      test_result: '',
      test_type: '',
      pre_test_counseling: true,
      consent_given: true,
      post_test_counseling: false,
      linkage_referred: false,
      referral_destination: '',
      remarks: '',
    });
    setShowModal(false);
  };

  const viewSessionDetails = (sessionId) => {
    const session = sessions.find((s) => {
      const sId = s.hts_id || s.id;
      return sId === sessionId;
    });
    if (session) {
      setSelectedSession(session);
      setShowDetailsModal(true);
    }
  };

  // Styles
  const styles = {
    pageContainer: {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    },
    cardHeader: {
      padding: '15px 20px',
    },
    searchFilterContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    searchInput: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
    },
    filterSelect: {
      width: '100%',
      maxWidth: '200px',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: 'white',
    },
    cardBody: {
      padding: '0',
    },
    sessionCard: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px',
      borderBottom: '1px solid #eee',
    },
    sessionInfo: {
      flex: 1,
    },
    patientName: {
      margin: '0 0 10px 0',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#333',
    },
    patientMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '15px',
      fontSize: '14px',
      color: '#666',
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
    },
    sessionActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    badgePositive: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    },
    badgeNegative: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },
    viewButton: {
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      cursor: 'pointer',
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
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    modalHeader: {
      padding: '15px 20px',
      borderBottom: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      margin: 0,
      fontSize: '18px',
      fontWeight: 'bold',
    },
    modalClose: {
      background: 'none',
      border: 'none',
      fontSize: '20px',
      cursor: 'pointer',
    },
    modalBody: {
      padding: '20px',
    },
    formGroup: {
      marginBottom: '15px',
    },
    formRow: {
      display: 'flex',
      gap: '15px',
      marginBottom: '15px',
    },
    formGroupHalf: {
      flex: 1,
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontSize: '14px',
      fontWeight: 'bold',
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: 'white',
    },
    checkboxGroup: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '10px',
    },
    checkbox: {
      marginRight: '8px',
    },
    textarea: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      minHeight: '80px',
      resize: 'vertical',
    },
    modalFooter: {
      padding: '15px 20px',
      borderTop: '1px solid #eee',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
    },
    cancelButton: {
      padding: '8px 16px',
      border: '1px solid #ddd',
      backgroundColor: 'white',
      borderRadius: '4px',
      fontSize: '14px',
      cursor: 'pointer',
    },
    saveButton: {
      padding: '8px 16px',
      border: 'none',
      backgroundColor: '#007bff',
      color: 'white',
      borderRadius: '4px',
      fontSize: '14px',
      cursor: 'pointer',
    },
    detailsGroup: {
      marginBottom: '15px',
    },
    detailsLabel: {
      fontWeight: 'bold',
      fontSize: '14px',
      marginBottom: '5px',
    },
    detailsValue: {
      fontSize: '14px',
      marginBottom: '15px',
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
    },
  };

  return (
  <div style={{
    padding: '20px',
    backgroundColor: 'white',
    minHeight: '100vh',
    paddingTop: '100px',
  }}>
    {/* Header - Matching Dashboard Style */}
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
            HIV Testing Services (HTS)
          </h2>
          <p style={{ margin: 0, color: '#F8F2DE', fontSize: '16px' }}>
            HIV testing sessions and counseling
          </p>
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
            Record HTS Session
          </button>
        </div>
      </div>
    </div>

      {/* Sessions Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.searchFilterContainer}>
            <input
              type="text"
              placeholder="Search sessions..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              style={styles.filterSelect}
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
            >
              <option value="all">All Results</option>
              <option value="Positive">Positive</option>
              <option value="Reactive">Reactive</option>
              <option value="Non-reactive">Non-reactive</option>
            </select>
          </div>
        </div>
        <div style={styles.cardBody}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Loading sessions...
            </div>
          ) : filteredSessions.length > 0 ? (
            filteredSessions.map((session) => {
              const sessionId = session.hts_id || session.id;
              const testResult = (session.test_result || '').toLowerCase();
              const isPositive = testResult === 'positive' || testResult === 'reactive';
              
              return (
                <div key={sessionId} style={styles.sessionCard}>
                  <div style={styles.sessionInfo}>
                    <h3 style={styles.patientName}>{session.patient_name || 'N/A'}</h3>
                    <div style={styles.patientMeta}>
                      <div style={styles.metaItem}>
                        📅 {session.test_date ? new Date(session.test_date).toLocaleDateString() : 'N/A'}
                      </div>
                      <div style={styles.metaItem}>
                        🏥 {(() => {
                          try {
                            const notesData = session.notes ? JSON.parse(session.notes) : {};
                            return notesData.session_type || session.test_type || 'N/A';
                          } catch {
                            return session.test_type || 'N/A';
                          }
                        })()}
                      </div>
                      <div style={styles.metaItem}>
                        ✓ Pre-test: {session.pre_test_counseling ? 'Yes' : 'No'}
                      </div>
                      <div style={styles.metaItem}>
                        ✓ Post-test: {session.post_test_counseling ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                  <div style={styles.sessionActions}>
                    <span
                      style={{
                        ...styles.badge,
                        ...(isPositive ? styles.badgePositive : styles.badgeNegative),
                      }}
                    >
                      {session.test_result ? session.test_result.charAt(0).toUpperCase() + session.test_result.slice(1) : 'N/A'}
                    </span>
                    <button
                      style={styles.viewButton}
                      onClick={() => viewSessionDetails(sessionId)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{ padding: '20px', textAlign: 'center', color: '#666' }}
            >
              {sessions.length === 0 
                ? 'No HTS sessions found. Check console for API response details.'
                : `No sessions match your filters. Showing ${sessions.length} total session(s).`}
            </div>
          )}
        </div>
      </div>

      {/* Add Session Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Record HTS Session</h2>
              <button
                style={styles.modalClose}
                onClick={() => setShowModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
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
                    {patients.map((p) => (
                      <option key={p.patient_id || p.id} value={p.patient_id || p.id}>
                        {p.patient_name || `${p.first_name || p.firstName} ${p.last_name || p.lastName}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroupHalf}>
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
                  <div style={styles.formGroupHalf}>
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
                      <option value="Facility-based">Facility-based</option>
                      <option value="Community-based">Community-based</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Home">Home</option>
                    </select>
                  </div>
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
                    {facilities.map((f) => (
                      <option key={f.facility_id || f.id} value={f.facility_id || f.id}>
                        {f.facility_name || f.name}
                      </option>
                    ))}
                    <option value="">My Hub Cares Ortigas Main</option>
                    {facilities.map((f) => (
                      <option key={f.facility_id || f.id} value={f.facility_id || f.id}>
                        {f.facility_name || f.name}
                      </option>
                    ))}
                    <option value="">My Hub Cares Pasay</option>
                    {facilities.map((f) => (
                      <option key={f.facility_id || f.id} value={f.facility_id || f.id}>
                        {f.facility_name || f.name}
                      </option>
                    ))}
                    <option value="">My Hub Cares Alabang</option>
                    {facilities.map((f) => (
                      <option key={f.facility_id || f.id} value={f.facility_id || f.id}>
                        {f.facility_name || f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="client_type">
                    Client Type
                  </label>
                  <select
                    id="client_type"
                    name="client_type"
                    value={newSession.client_type}
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="">Select Type</option>
                    {clientTypes.map((ct) => (
                      <option key={ct.client_type_id || ct.id} value={ct.client_type_id || ct.id}>
                        {ct.type_name || ct.name}
                      </option>
                    ))}
                    <option value="msm">Males Having Sex With Males</option>
                    <option value="rfsw">Registered Female Sex Worker</option>
                    <option value="ffsw">Freelance Female Sex Worker</option>
                    <option value="transgender">Transgender</option>
                    <option value="drug_users">Drug Users</option>
                    <option value="pwid">Person Who Inject Drugs (PWID)</option>
                    <option value="pregnant">Pregnant</option>
                    <option value="tb_clients">TB Clients</option>
                    <option value="others">Others</option>
                  </select>
                </div>

                <h4>Pre-Test Counseling</h4>
                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="pre_test_counseling"
                    name="pre_test_counseling"
                    checked={newSession.pre_test_counseling}
                    onChange={handleInputChange}
                    style={styles.checkbox}
                  />
                  <label htmlFor="pre_test_counseling">
                    Pre-test counseling provided
                  </label>
                </div>
                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="consent_given"
                    name="consent_given"
                    checked={newSession.consent_given}
                    onChange={handleInputChange}
                    style={styles.checkbox}
                  />
                  <label htmlFor="consent_given">
                    Informed consent obtained
                  </label>
                </div>

                <h4>Test Results</h4>
                <div style={styles.formGroup}>
                  <select
                    id="test_result"
                    name="test_result"
                    value={newSession.test_result}
                    onChange={handleInputChange}
                    style={styles.select}
                    required
                  >
                    <option value="">Select Result</option>
                    <option value="Non-reactive">Non-reactive</option>
                    <option value="Reactive">Reactive</option>
                    <option value="Positive">Positive</option>
                    <option value="Indeterminate">Indeterminate</option>
                  </select>
                </div>

                <h4>Post-Test</h4>
                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="post_test_counseling"
                    name="post_test_counseling"
                    checked={newSession.post_test_counseling}
                    onChange={handleInputChange}
                    style={styles.checkbox}
                  />
                  <label htmlFor="post_test_counseling">
                    Post-test counseling provided
                  </label>
                </div>
                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="linkage_referred"
                    name="linkage_referred"
                    checked={newSession.linkage_referred}
                    onChange={handleInputChange}
                    style={styles.checkbox}
                  />
                  <label htmlFor="linkage_referred">
                    Referred for linkage to care
                  </label>
                </div>
                {newSession.linkage_referred && (
                  <div style={styles.formGroup}>
                    <label style={styles.label} htmlFor="referral_destination">
                      Referral Destination
                    </label>
                    <input
                      type="text"
                      id="referral_destination"
                      name="referral_destination"
                      value={newSession.referral_destination}
                      onChange={handleInputChange}
                      placeholder="e.g., ART Clinic"
                      style={styles.input}
                    />
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="referral_destination">
                    Referral Destination
                  </label>
                  <input
                    type="text"
                    id="referral_destination"
                    name="referral_destination"
                    value={newSession.referral_destination}
                    onChange={handleInputChange}
                    placeholder="e.g., ART Clinic"
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label} htmlFor="remarks">
                    Remarks
                  </label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    value={newSession.remarks}
                    onChange={handleInputChange}
                    style={styles.textarea}
                    rows="3"
                  />
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveButton}>
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {showDetailsModal && selectedSession && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>HTS Session Details</h2>
              <button
                style={styles.modalClose}
                onClick={() => setShowDetailsModal(false)}
              >
                &times;
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.detailsGroup}>
                <div style={styles.detailsLabel}>Patient Name</div>
                <div style={styles.detailsValue}>
                  {selectedSession.patient_name || 'N/A'}
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroupHalf}>
                  <div style={styles.detailsLabel}>Session Date</div>
                  <div style={styles.detailsValue}>
                    {selectedSession.test_date ? new Date(selectedSession.test_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div style={styles.formGroupHalf}>
                  <div style={styles.detailsLabel}>Session Type</div>
                  <div style={styles.detailsValue}>
                    {(() => {
                      try {
                        const notesData = selectedSession.notes ? JSON.parse(selectedSession.notes) : {};
                        return notesData.session_type || selectedSession.test_type || 'N/A';
                      } catch {
                        return selectedSession.test_type || 'N/A';
                      }
                    })()}
                  </div>
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroupHalf}>
                  <div style={styles.detailsLabel}>MyHubCares Branch</div>
                  <div style={styles.detailsValue}>
                    {selectedSession.facility_name || 'N/A'}
                  </div>
                </div>
                <div style={styles.formGroupHalf}>
                  <div style={styles.detailsLabel}>Tester</div>
                  <div style={styles.detailsValue}>
                    {selectedSession.tester_name || 'N/A'}
                  </div>
                </div>
              </div>

              <h4>Counseling & Consent</h4>
              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={selectedSession.pre_test_counseling || false}
                  disabled
                  style={styles.checkbox}
                />
                <label>Pre-test counseling provided</label>
              </div>
              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={(() => {
                    try {
                      const notesData = selectedSession.notes ? JSON.parse(selectedSession.notes) : {};
                      return notesData.consent_given || false;
                    } catch {
                      return false;
                    }
                  })()}
                  disabled
                  style={styles.checkbox}
                />
                <label>Informed consent obtained</label>
              </div>

              <h4>Test Results</h4>
              <div style={styles.detailsGroup}>
                <div style={styles.detailsLabel}>Result</div>
                <div style={styles.detailsValue}>
                  {selectedSession.test_result ? selectedSession.test_result.charAt(0).toUpperCase() + selectedSession.test_result.slice(1) : 'N/A'}
                </div>
              </div>

              <h4>Post-Test & Linkage</h4>
              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={selectedSession.post_test_counseling || false}
                  disabled
                  style={styles.checkbox}
                />
                <label>Post-test counseling provided</label>
              </div>
              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={selectedSession.linked_to_care || false}
                  disabled
                  style={styles.checkbox}
                />
                <label>Referred for linkage to care</label>
              </div>
              {(() => {
                try {
                  const notesData = selectedSession.notes ? JSON.parse(selectedSession.notes) : {};
                  if (notesData.referral_destination) {
                    return (
                      <div style={styles.detailsGroup}>
                        <div style={styles.detailsLabel}>Referral Destination</div>
                        <div style={styles.detailsValue}>
                          {notesData.referral_destination}
                        </div>
                      </div>
                    );
                  }
                } catch {}
                return null;
              })()}

              {(() => {
                try {
                  const notesData = selectedSession.notes ? JSON.parse(selectedSession.notes) : {};
                  if (notesData.remarks) {
                    return (
                      <div style={styles.detailsGroup}>
                        <div style={styles.detailsLabel}>Remarks</div>
                        <div style={styles.detailsValue}>
                          {notesData.remarks}
                        </div>
                      </div>
                    );
                  }
                } catch {
                  if (selectedSession.notes) {
                    return (
                      <div style={styles.detailsGroup}>
                        <div style={styles.detailsLabel}>Remarks</div>
                        <div style={styles.detailsValue}>
                          {selectedSession.notes}
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HTSSessions;