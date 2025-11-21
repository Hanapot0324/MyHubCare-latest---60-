import React, { useState, useEffect } from 'react';
import {
  User,
  Save,
  Edit,
  X,
  Plus,
  Trash2,
  FileText,
  CreditCard,
  Activity,
  AlertCircle,
  Upload,
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [patient, setPatient] = useState(null);
  const [identifiers, setIdentifiers] = useState([]);
  const [riskScores, setRiskScores] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showIdentifierModal, setShowIdentifierModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [editingIdentifier, setEditingIdentifier] = useState(null);
  const [newIdentifier, setNewIdentifier] = useState({
    id_type: '',
    id_value: '',
    issued_at: '',
    expires_at: '',
    verified: false,
  });

  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Fetch current user's patient profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      if (!token) {
        setToast({
          message: 'Please login to view your profile',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      // Try to get current user info
      let userData = null;
      let patientData = null;

      try {
        const userResponse = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error(`HTTP error! status: ${userResponse.status}`);
        }

        userData = await userResponse.json();
        console.log('User data response:', userData);

        if (userData.success && userData.user && userData.user.patient) {
          patientData = userData.user.patient;
        }
      } catch (err) {
        console.error('Error fetching from /auth/me:', err);
      }

      // If patient data not found via /auth/me, try /profile/me endpoint
      if (!patientData) {
        try {
          const profileResponse = await fetch(`${API_URL}/profile/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('Profile data response:', profileData);
            if (profileData.success && profileData.patient) {
              patientData = profileData.patient;
            }
          }
        } catch (err) {
          console.error('Error fetching from /profile/me:', err);
        }
      }

      // Check if we have patient data
      if (!patientData) {
        setToast({
          message: 'Patient profile not found. Please ensure your user account is linked to a patient record (matching email or created_by field).',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      const patientId = patientData.patient_id;
      console.log('Setting patient data:', patientData);
      setPatient(patientData);

      // Fetch identifiers
      try {
        const identifiersResponse = await fetch(
          `${API_URL}/profile/${patientId}/identifiers`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const identifiersData = await identifiersResponse.json();
        if (identifiersData.success) {
          setIdentifiers(identifiersData.data || []);
        }
      } catch (err) {
        console.error('Error fetching identifiers:', err);
        setIdentifiers([]);
      }

      // Fetch ARPA risk scores
      try {
        // Fetch current ARPA score
        const currentARPAResponse = await fetch(
          `${API_URL}/arpa/patient/${patientId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const currentARPAData = await currentARPAResponse.json();
        
        // Fetch ARPA history
        const historyResponse = await fetch(
          `${API_URL}/arpa/patient/${patientId}/history?limit=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const historyData = await historyResponse.json();
        
        // Combine current score with history
        const allScores = [];
        if (currentARPAData.success && currentARPAData.data) {
          allScores.push(currentARPAData.data);
        }
        if (historyData.success && historyData.data) {
          // Add history scores that aren't already included
          historyData.data.forEach(score => {
            if (!allScores.find(s => s.risk_score_id === score.risk_score_id)) {
              allScores.push(score);
            }
          });
        }
        
        // Sort by calculated_on date (most recent first)
        allScores.sort((a, b) => {
          const dateA = new Date(a.calculated_on || a.arpa_last_calculated || 0);
          const dateB = new Date(b.calculated_on || b.arpa_last_calculated || 0);
          return dateB - dateA;
        });
        
        setRiskScores(allScores);
      } catch (err) {
        console.error('Error fetching ARPA risk scores:', err);
        setRiskScores([]);
      }

      // Fetch documents
      try {
        const documentsResponse = await fetch(
          `${API_URL}/profile/${patientId}/documents`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const documentsData = await documentsResponse.json();
        if (documentsData.success) {
          setDocuments(documentsData.data || []);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setToast({
        message: `Failed to load profile: ${error.message}`,
        type: 'error',
      });
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPatient({
      ...patient,
      [name]: value,
    });
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    const currentAddress = patient.current_address
      ? typeof patient.current_address === 'string'
        ? JSON.parse(patient.current_address)
        : patient.current_address
      : {};
    setPatient({
      ...patient,
      current_address: JSON.stringify({
        ...currentAddress,
        [name]: value,
      }),
    });
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();

      const payload = {
        first_name: patient.first_name,
        middle_name: patient.middle_name || null,
        last_name: patient.last_name,
        suffix: patient.suffix || null,
        birth_date: patient.birth_date,
        sex: patient.sex,
        civil_status: patient.civil_status || null,
        nationality: patient.nationality || null,
        contact_phone: patient.contact_phone,
        email: patient.email,
        current_city: patient.current_city || null,
        current_province: patient.current_province || null,
        philhealth_no: patient.philhealth_no || null,
        mother_name: patient.mother_name || null,
        father_name: patient.father_name || null,
        birth_order: patient.birth_order || null,
        guardian_name: patient.guardian_name || null,
        guardian_relationship: patient.guardian_relationship || null,
      };

      const response = await fetch(`${API_URL}/patients/${patient.patient_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Profile updated successfully',
          type: 'success',
        });
        setIsEditing(false);
        fetchProfile();
      } else {
        setToast({
          message: data.message || 'Failed to update profile',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setToast({
        message: 'Failed to save profile',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddIdentifier = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_URL}/profile/${patient.patient_id}/identifiers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newIdentifier),
        }
      );

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Identifier added successfully',
          type: 'success',
        });
        setShowIdentifierModal(false);
        setNewIdentifier({
          id_type: '',
          id_value: '',
          issued_at: '',
          expires_at: '',
          verified: false,
        });
        fetchProfile();
      } else {
        setToast({
          message: data.message || 'Failed to add identifier',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error adding identifier:', error);
      setToast({
        message: 'Failed to add identifier',
        type: 'error',
      });
    }
  };

  const handleDeleteIdentifier = async (identifierId) => {
    if (!window.confirm('Are you sure you want to delete this identifier?')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_URL}/profile/identifiers/${identifierId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Identifier deleted successfully',
          type: 'success',
        });
        fetchProfile();
      } else {
        setToast({
          message: data.message || 'Failed to delete identifier',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error deleting identifier:', error);
      setToast({
        message: 'Failed to delete identifier',
        type: 'error',
      });
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_URL}/profile/documents/${documentId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setToast({
          message: 'Document deleted successfully',
          type: 'success',
        });
        fetchProfile();
      } else {
        setToast({
          message: data.message || 'Failed to delete document',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setToast({
        message: 'Failed to delete document',
        type: 'error',
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ padding: '20px', paddingTop: '80px', textAlign: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '24px' }}>My Profile</h2>
        <p style={{ color: '#6c757d', fontSize: '16px', marginBottom: '20px' }}>
          Profile not found
        </p>
        <p style={{ color: '#6c757d', fontSize: '14px' }}>
          If you are a patient, please contact support to set up your profile.
        </p>
        <button
          onClick={fetchProfile}
          style={{
            marginTop: '20px',
            padding: '10px 16px',
            background: '#D84040',
            color: '#F8F2DE',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const currentAddress = patient.current_address
    ? typeof patient.current_address === 'string'
      ? JSON.parse(patient.current_address)
      : patient.current_address
    : {};

  return (
    <div style={{ padding: '20px', paddingTop: '80px', maxWidth: '1200px', margin: '0 auto' }}>
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
            My Profile
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
            View and manage your personal information
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '10px 16px',
              background: '#D84040',
              color: '#F8F2DE',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
          >
            <Edit size={16} />
            Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                setIsEditing(false);
                fetchProfile();
              }}
              style={{
                padding: '10px 16px',
                background: '#6c757d',
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
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              style={{
                padding: '10px 16px',
                background: '#D84040',
                color: '#F8F2DE',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
                opacity: saving ? 0.6 : 1,
              }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Personal Information Section */}
      <div
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h3
          style={{
            margin: '0 0 20px 0',
            color: '#A31D1D',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <User size={20} />
          Personal Information
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Patient ID
            </label>
            <input
              type="text"
              value={patient.patient_id}
              disabled
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: '#f8f9fa',
                color: '#6c757d',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              UIC
            </label>
            <input
              type="text"
              value={patient.uic || ''}
              disabled
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: '#f8f9fa',
                color: '#6c757d',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              First Name *
            </label>
            <input
              type="text"
              name="first_name"
              value={patient.first_name || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Middle Name
            </label>
            <input
              type="text"
              name="middle_name"
              value={patient.middle_name || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Last Name *
            </label>
            <input
              type="text"
              name="last_name"
              value={patient.last_name || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Suffix
            </label>
            <input
              type="text"
              name="suffix"
              value={patient.suffix || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Date of Birth *
            </label>
            <input
              type="date"
              name="birth_date"
              value={formatDate(patient.birth_date)}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Sex *
            </label>
            <select
              name="sex"
              value={patient.sex || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Civil Status
            </label>
            <select
              name="civil_status"
              value={patient.civil_status || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            >
              <option value="">Select...</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Nationality
            </label>
            <input
              type="text"
              name="nationality"
              value={patient.nationality || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Phone Number *
            </label>
            <input
              type="tel"
              name="contact_phone"
              value={patient.contact_phone || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={patient.email || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Current City
            </label>
            <input
              type="text"
              name="current_city"
              value={patient.current_city || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Current Province
            </label>
            <input
              type="text"
              name="current_province"
              value={patient.current_province || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              PhilHealth Number
            </label>
            <input
              type="text"
              name="philhealth_no"
              value={patient.philhealth_no || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Mother's Name
            </label>
            <input
              type="text"
              name="mother_name"
              value={patient.mother_name || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Father's Name
            </label>
            <input
              type="text"
              name="father_name"
              value={patient.father_name || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Birth Order
            </label>
            <input
              type="number"
              name="birth_order"
              value={patient.birth_order || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Guardian Name
            </label>
            <input
              type="text"
              name="guardian_name"
              value={patient.guardian_name || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 500 }}>
              Guardian Relationship
            </label>
            <input
              type="text"
              name="guardian_relationship"
              value={patient.guardian_relationship || ''}
              onChange={handleInputChange}
              disabled={!isEditing}
              style={{
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                width: '100%',
                fontSize: '14px',
                background: isEditing ? 'white' : '#f8f9fa',
              }}
            />
          </div>
        </div>
      </div>

      {/* Identifiers Section */}
      <div
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
          <h3
            style={{
              margin: 0,
              color: '#A31D1D',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CreditCard size={20} />
            Identifiers
          </h3>
          <button
            onClick={() => setShowIdentifierModal(true)}
            style={{
              padding: '8px 12px',
              background: '#D84040',
              color: '#F8F2DE',
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
            Add Identifier
          </button>
        </div>

        {identifiers.length === 0 ? (
          <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
            No identifiers added yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {identifiers.map((identifier) => (
              <div
                key={identifier.identifier_id}
                style={{
                  padding: '15px',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '5px' }}>
                    {identifier.id_type.replace('_', ' ').toUpperCase()}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '14px' }}>
                    {identifier.id_value}
                  </div>
                  {identifier.issued_at && (
                    <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '5px' }}>
                      Issued: {formatDate(identifier.issued_at)}
                    </div>
                  )}
                  {identifier.expires_at && (
                    <div style={{ color: '#6c757d', fontSize: '12px' }}>
                      Expires: {formatDate(identifier.expires_at)}
                    </div>
                  )}
                  {identifier.verified && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '5px',
                        padding: '2px 8px',
                        background: '#28a745',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      Verified
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteIdentifier(identifier.identifier_id)}
                  style={{
                    padding: '6px 10px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ARPA Risk Scores Section */}
      <div
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
          <h3
            style={{
              margin: 0,
              color: '#A31D1D',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Activity size={20} />
            ARPA Risk Assessment
          </h3>
          {patient?.arpa_risk_score !== null && patient?.arpa_risk_score !== undefined && (
            <div
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                backgroundColor:
                  patient.arpa_risk_score >= 70
                    ? '#dc3545'
                    : patient.arpa_risk_score >= 50
                    ? '#fd7e14'
                    : patient.arpa_risk_score >= 40
                    ? '#ffc107'
                    : patient.arpa_risk_score >= 20
                    ? '#17a2b8'
                    : '#28a745',
                color: 'white',
              }}
            >
              Current Score: {patient.arpa_risk_score}
            </div>
          )}
        </div>

        {riskScores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#6c757d', marginBottom: '15px' }}>
              No ARPA risk scores calculated yet
            </p>
            <p style={{ color: '#6c757d', fontSize: '14px' }}>
              Risk scores are automatically calculated when clinical data is updated.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {riskScores.map((score, index) => {
              const riskLevel = score.risk_level || 
                (score.score >= 70 ? 'HIGH' :
                 score.score >= 50 ? 'MEDIUM-HIGH' :
                 score.score >= 40 ? 'MEDIUM' :
                 score.score >= 20 ? 'LOW-MEDIUM' : 'LOW');
              
              const riskColor =
                riskLevel === 'HIGH'
                  ? '#dc3545'
                  : riskLevel === 'MEDIUM-HIGH'
                  ? '#fd7e14'
                  : riskLevel === 'MEDIUM'
                  ? '#ffc107'
                  : riskLevel === 'LOW-MEDIUM'
                  ? '#17a2b8'
                  : '#28a745';

              const isCurrent = index === 0 && score.score === patient?.arpa_risk_score;

              return (
                <div
                  key={score.risk_score_id || `score-${index}`}
                  style={{
                    padding: '20px',
                    border: isCurrent ? '2px solid #D84040' : '1px solid #e9ecef',
                    borderRadius: '6px',
                    backgroundColor: isCurrent ? '#fff5f5' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '24px', color: riskColor }}>
                          {score.score || score.arpa_risk_score || 'N/A'}
                        </div>
                        <div
                          style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: riskColor,
                            color: 'white',
                            textTransform: 'uppercase',
                          }}
                        >
                          {riskLevel}
                        </div>
                        {isCurrent && (
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#D84040',
                              color: 'white',
                            }}
                          >
                            CURRENT
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#6c757d', fontSize: '13px' }}>
                        Calculated: {formatDate(score.calculated_on || score.arpa_last_calculated)}
                      </div>
                    </div>
                  </div>
                  
                  {score.recommendations && (
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        marginTop: '12px',
                        fontSize: '14px',
                        color: '#495057',
                        lineHeight: '1.5',
                      }}
                    >
                      <strong style={{ color: '#A31D1D' }}>Recommendations:</strong>
                      <div style={{ marginTop: '6px' }}>{score.recommendations}</div>
                    </div>
                  )}
                  
                  {score.risk_factors && typeof score.risk_factors === 'object' && (
                    <details style={{ marginTop: '12px' }}>
                      <summary
                        style={{
                          cursor: 'pointer',
                          color: '#6c757d',
                          fontSize: '13px',
                          fontWeight: 500,
                          userSelect: 'none',
                        }}
                      >
                        View Risk Factors
                      </summary>
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '12px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px',
                          fontSize: '13px',
                        }}
                      >
                        {Object.entries(score.risk_factors).map(([key, value]) => {
                          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                          let displayValue = value;
                          if (typeof value === 'object' && value !== null) {
                            if (Array.isArray(value)) {
                              displayValue = value.join(', ');
                            } else {
                              displayValue = JSON.stringify(value);
                            }
                          } else if (typeof value === 'number') {
                            displayValue = value.toFixed(2);
                          }
                          
                          return (
                            <div key={key} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6c757d' }}>
                                {formattedKey}:
                              </span>
                              <span style={{ fontWeight: 500, color: '#495057' }}>
                                {String(displayValue)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                  
                  {score.calculated_by_name && (
                    <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '10px', fontStyle: 'italic' }}>
                      Calculated by: {score.calculated_by_name || score.calculated_by_full_name || 'System'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h3
          style={{
            margin: '0 0 20px 0',
            color: '#A31D1D',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={20} />
          Documents
        </h3>

        {documents.length === 0 ? (
          <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
            No documents uploaded yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {documents.map((doc) => (
              <div
                key={doc.document_id}
                style={{
                  padding: '15px',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '5px' }}>
                    {doc.file_name}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '14px' }}>
                    {doc.document_type.replace('_', ' ').toUpperCase()}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '5px' }}>
                    Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.document_id)}
                  style={{
                    padding: '6px 10px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Identifier Modal */}
      {showIdentifierModal && (
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
              <h3 style={{ margin: 0 }}>Add Identifier</h3>
              <button
                onClick={() => setShowIdentifierModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  ID Type *
                </label>
                <select
                  value={newIdentifier.id_type}
                  onChange={(e) =>
                    setNewIdentifier({ ...newIdentifier, id_type: e.target.value })
                  }
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    width: '100%',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Select...</option>
                  <option value="passport">Passport</option>
                  <option value="driver_license">Driver's License</option>
                  <option value="sss">SSS</option>
                  <option value="tin">TIN</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  ID Value *
                </label>
                <input
                  type="text"
                  value={newIdentifier.id_value}
                  onChange={(e) =>
                    setNewIdentifier({ ...newIdentifier, id_value: e.target.value })
                  }
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    width: '100%',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  Issued At
                </label>
                <input
                  type="date"
                  value={newIdentifier.issued_at}
                  onChange={(e) =>
                    setNewIdentifier({ ...newIdentifier, issued_at: e.target.value })
                  }
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    width: '100%',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                  Expires At
                </label>
                <input
                  type="date"
                  value={newIdentifier.expires_at}
                  onChange={(e) =>
                    setNewIdentifier({ ...newIdentifier, expires_at: e.target.value })
                  }
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    width: '100%',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={newIdentifier.verified}
                    onChange={(e) =>
                      setNewIdentifier({ ...newIdentifier, verified: e.target.checked })
                    }
                  />
                  Verified
                </label>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button
                onClick={() => setShowIdentifierModal(false)}
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
                onClick={handleAddIdentifier}
                style={{
                  padding: '8px 16px',
                  background: '#D84040',
                  color: '#F8F2DE',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Add Identifier
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
          <AlertCircle size={20} />
          <span style={{ fontSize: '14px' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Profile;

