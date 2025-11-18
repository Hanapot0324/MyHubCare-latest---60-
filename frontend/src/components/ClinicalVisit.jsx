import React, { useState, useEffect } from 'react';
import { X, Check, Download, Plus, Search, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const API_URL = 'http://localhost:5000/api';

// Constants for valid options
const validVisitTypes = [
  'initial',
  'follow_up',
  'emergency',
  'routine',
  'art_pickup',
];
const validWhoStages = [
  'Stage 1',
  'Stage 2',
  'Stage 3',
  'Stage 4',
  'Not Applicable',
];
const validDiagnosisTypes = [
  'primary',
  'secondary',
  'differential',
  'rule_out',
];

const ClinicalVisits = () => {
  const [clinicalVisits, setClinicalVisits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const [toast, setToast] = useState(null);
  const [patients, setPatients] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all required data on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPatients(), fetchFacilities()]);
      await fetchClinicalVisits();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast({
          message: 'Please login to view patient data',
          type: 'error',
        });
        return;
      }

      console.log('Fetching patients from:', `${API_URL}/patients`);

      const response = await fetch(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Patients response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Patients raw data:', data);

      // Handle different response formats
      let patientsArray = [];
      if (Array.isArray(data)) {
        patientsArray = data;
      } else if (data && typeof data === 'object') {
        // Try common property names
        patientsArray = data.patients || data.data || data.results || [];
      }

      console.log('Patients array:', patientsArray);

      if (patientsArray.length > 0) {
        setPatients(patientsArray);
      } else {
        console.warn('No patients found in response');
        setToast({ message: 'No patients found', type: 'warning' });
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setToast({
        message: `Failed to load patients: ${error.message}`,
        type: 'error',
      });
    }
  };

  const fetchFacilities = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast({
          message: 'Please login to view facility data',
          type: 'error',
        });
        return;
      }

      const response = await fetch(`${API_URL}/facilities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Facilities raw data:', data);

      // Handle response format: { success: true, data: [...] }
      let facilitiesArray = [];
      if (data.success && data.data && Array.isArray(data.data)) {
        facilitiesArray = data.data;
      } else if (Array.isArray(data)) {
        facilitiesArray = data;
      } else if (data && typeof data === 'object') {
        facilitiesArray = data.facilities || data.data || data.results || [];
      }

      console.log('Facilities array:', facilitiesArray);

      if (facilitiesArray.length > 0) {
        setFacilities(facilitiesArray);
      } else {
        console.warn('No facilities found in response');
        setToast({ message: 'No facilities found', type: 'warning' });
      }
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setToast({
        message: `Failed to load facilities: ${error.message}`,
        type: 'error',
      });
    }
  };

  const fetchClinicalVisits = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast({
          message: 'Please login to view clinical visits',
          type: 'error',
        });
        return;
      }

      const response = await fetch(`${API_URL}/clinical-visits`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (Array.isArray(data)) {
        // Backend returns array directly, not wrapped in success object
        setClinicalVisits(data);
      } else {
        setToast({
          message: 'Failed to load clinical visits',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error fetching clinical visits:', error);
      setToast({ message: 'Failed to load clinical visits', type: 'error' });
    }
  };

  const getPatientName = (patientId) => {
    const patient = patients.find((p) => p.patient_id === patientId);
    if (!patient) return 'Unknown Patient';
    return `${patient.first_name} ${
      patient.middle_name ? patient.middle_name + ' ' : ''
    }${patient.last_name}${patient.suffix ? ' ' + patient.suffix : ''}`;
  };

  const getFacilityName = (facilityId) => {
    const facility = facilities.find((f) => f.facility_id === facilityId);
    return facility ? (facility.facility_name || facility.name) : 'Unknown Facility';
  };

  // Helper function to decode JWT token and get user_id
  const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      return decoded.user_id || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  const handleSaveVisit = async (visitData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast({
          message: 'Please login to save clinical visits',
          type: 'error',
        });
        return;
      }

      // Get provider_id from token
      const provider_id = getUserIdFromToken();
      if (!provider_id) {
        setToast({
          message: 'Unable to identify user. Please login again.',
          type: 'error',
        });
        return;
      }

      // Validate required fields
      if (!visitData.patient_id) {
        setToast({
          message: 'Please select a patient',
          type: 'error',
        });
        return;
      }

      if (!visitData.facility_id) {
        setToast({
          message: 'Please select a facility',
          type: 'error',
        });
        return;
      }

      const transformedData = {
        patient_id: visitData.patient_id,
        provider_id: provider_id,
        facility_id: visitData.facility_id,
        visit_date: visitData.visitDate,
        visit_type: visitData.visitType,
        who_stage: visitData.whoStage,
        chief_complaint: visitData.chiefComplaint,
        clinical_notes: visitData.notes,
        assessment: visitData.assessment || '',
        plan: visitData.plan || '',
        follow_up_date: visitData.followUpDate || null,
        follow_up_reason: visitData.followUpReason || '',
        vital_signs: visitData.vitalSigns ? {
          systolic_bp: visitData.vitalSigns.bloodPressure && visitData.vitalSigns.bloodPressure.includes('/') 
            ? parseInt(visitData.vitalSigns.bloodPressure.split('/')[0]) || 120
            : 120,
          diastolic_bp: visitData.vitalSigns.bloodPressure && visitData.vitalSigns.bloodPressure.includes('/')
            ? parseInt(visitData.vitalSigns.bloodPressure.split('/')[1]) || 80
            : 80,
          pulse_rate: visitData.vitalSigns.heartRate ? parseInt(visitData.vitalSigns.heartRate) || 72 : 72,
          respiratory_rate: visitData.vitalSigns.respiratoryRate ? parseInt(visitData.vitalSigns.respiratoryRate) || 16 : 16,
          temperature_c: visitData.vitalSigns.temperature ? parseFloat(visitData.vitalSigns.temperature) || 36.5 : 36.5,
          weight_kg: visitData.vitalSigns.weight ? parseFloat(visitData.vitalSigns.weight) || 65 : 65,
          height_cm: visitData.vitalSigns.height ? parseFloat(visitData.vitalSigns.height) || 165 : 165,
        } : {
          systolic_bp: 120,
          diastolic_bp: 80,
          pulse_rate: 72,
          respiratory_rate: 16,
          temperature_c: 36.5,
          weight_kg: 65,
          height_cm: 165,
        },
        diagnoses: visitData.diagnoses || [],
        procedures: visitData.procedures || [],
      };

      const response = await fetch(`${API_URL}/clinical-visits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transformedData),
      });

      const data = await response.json();
      if (response.ok) {
        // Backend returns the created visit directly, not wrapped in success object
        setToast({
          message: 'Clinical visit recorded successfully',
          type: 'success',
        });
        setShowModal(false);
        setSelectedVisit(null);
        fetchClinicalVisits();
      } else {
        setToast({
          message: data.error || 'Failed to save clinical visit',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving clinical visit:', error);
      setToast({ message: 'Failed to save clinical visit', type: 'error' });
    }
  };

  const handleViewDetails = async (visit) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast({
          message: 'Please login to view visit details',
          type: 'error',
        });
        return;
      }

      const response = await fetch(
        `${API_URL}/clinical-visits/${visit.visit_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSelectedVisit(data);
        setModalMode('view');
        setShowModal(true);
      } else {
        setToast({
          message: data.error || 'Failed to fetch visit details',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error fetching visit details:', error);
      setToast({ message: 'Failed to fetch visit details', type: 'error' });
    }
  };

  const handleUpdateVisit = async (visitData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast({
          message: 'Please login to update clinical visits',
          type: 'error',
        });
        return;
      }

      // Get provider_id from token
      const provider_id = getUserIdFromToken();
      if (!provider_id) {
        setToast({
          message: 'Unable to identify user. Please login again.',
          type: 'error',
        });
        return;
      }

      if (!visitData.visit_id) {
        setToast({
          message: 'Visit ID is missing. Cannot update visit.',
          type: 'error',
        });
        return;
      }

      const transformedData = {
        provider_id: provider_id,
        facility_id: visitData.facility_id,
        visit_date: visitData.visitDate,
        visit_type: visitData.visitType,
        who_stage: visitData.whoStage,
        chief_complaint: visitData.chiefComplaint,
        clinical_notes: visitData.notes,
        assessment: visitData.assessment || '',
        plan: visitData.plan || '',
        follow_up_date: visitData.followUpDate || null,
        follow_up_reason: visitData.followUpReason || '',
        vital_signs: visitData.vitalSigns ? {
          systolic_bp: visitData.vitalSigns.bloodPressure && visitData.vitalSigns.bloodPressure.includes('/') 
            ? parseInt(visitData.vitalSigns.bloodPressure.split('/')[0]) || 120
            : 120,
          diastolic_bp: visitData.vitalSigns.bloodPressure && visitData.vitalSigns.bloodPressure.includes('/')
            ? parseInt(visitData.vitalSigns.bloodPressure.split('/')[1]) || 80
            : 80,
          pulse_rate: visitData.vitalSigns.heartRate ? parseInt(visitData.vitalSigns.heartRate) || 72 : 72,
          respiratory_rate: visitData.vitalSigns.respiratoryRate ? parseInt(visitData.vitalSigns.respiratoryRate) || 16 : 16,
          temperature_c: visitData.vitalSigns.temperature ? parseFloat(visitData.vitalSigns.temperature) || 36.5 : 36.5,
          weight_kg: visitData.vitalSigns.weight ? parseFloat(visitData.vitalSigns.weight) || 65 : 65,
          height_cm: visitData.vitalSigns.height ? parseFloat(visitData.vitalSigns.height) || 165 : 165,
        } : {
          systolic_bp: 120,
          diastolic_bp: 80,
          pulse_rate: 72,
          respiratory_rate: 16,
          temperature_c: 36.5,
          weight_kg: 65,
          height_cm: 165,
        },
        diagnoses: visitData.diagnoses || [],
        procedures: visitData.procedures || [],
      };

      const response = await fetch(
        `${API_URL}/clinical-visits/${visitData.visit_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(transformedData),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setToast({
          message: 'Clinical visit updated successfully',
          type: 'success',
        });
        setShowModal(false);
        setSelectedVisit(null);
        fetchClinicalVisits();
      } else {
        setToast({
          message: data.error || 'Failed to update clinical visit',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error updating clinical visit:', error);
      setToast({ message: 'Failed to update clinical visit', type: 'error' });
    }
  };

  const handleDeleteVisit = async (visitId) => {
    if (!window.confirm('Are you sure you want to delete this visit?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast({
          message: 'Please login to delete clinical visits',
          type: 'error',
        });
        return;
      }

      const response = await fetch(`${API_URL}/clinical-visits/${visitId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setToast({
          message: 'Clinical visit deleted successfully',
          type: 'success',
        });
        fetchClinicalVisits();
      } else {
        const data = await response.json();
        setToast({
          message: data.error || 'Failed to delete clinical visit',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error deleting clinical visit:', error);
      setToast({ message: 'Failed to delete clinical visit', type: 'error' });
    }
  };

  const handleRecordNewVisit = () => {
    setSelectedVisit(null);
    setModalMode('add');
    setShowModal(true);
  };

  const handleSaveDiagnosis = async (visitId, diagnosisData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast({
          message: 'Please login to save diagnosis',
          type: 'error',
        });
        return;
      }

      // Fetch current visit to get existing diagnoses
      const visitResponse = await fetch(
        `${API_URL}/clinical-visits/${visitId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const visitData = await visitResponse.json();
      if (!visitResponse.ok) {
        setToast({
          message: visitData.error || 'Failed to fetch visit',
          type: 'error',
        });
        return;
      }

      // Add new diagnosis to existing diagnoses
      const updatedDiagnoses = [
        ...(visitData.diagnoses || []),
        {
          ...diagnosisData,
          diagnosis_id: '',
        },
      ];

      // Update visit with new diagnoses
      const response = await fetch(`${API_URL}/clinical-visits/${visitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...visitData,
          diagnoses: updatedDiagnoses,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setToast({
          message: 'Diagnosis added successfully',
          type: 'success',
        });
        // Refresh visit details
        const updatedResponse = await fetch(
          `${API_URL}/clinical-visits/${visitId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const updatedData = await updatedResponse.json();
        if (updatedResponse.ok) {
          setSelectedVisit(updatedData);
        }
      } else {
        setToast({
          message: data.error || 'Failed to save diagnosis',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving diagnosis:', error);
      setToast({ message: 'Failed to save diagnosis', type: 'error' });
    }
  };

  const handleSaveProcedure = async (visitId, procedureData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setToast({
          message: 'Please login to save procedure',
          type: 'error',
        });
        return;
      }

      // Fetch current visit to get existing procedures
      const visitResponse = await fetch(
        `${API_URL}/clinical-visits/${visitId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const visitData = await visitResponse.json();
      if (!visitResponse.ok) {
        setToast({
          message: visitData.error || 'Failed to fetch visit',
          type: 'error',
        });
        return;
      }

      // Add new procedure to existing procedures
      const updatedProcedures = [
        ...(visitData.procedures || []),
        {
          ...procedureData,
          procedure_id: '',
        },
      ];

      // Update visit with new procedures
      const response = await fetch(`${API_URL}/clinical-visits/${visitId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...visitData,
          procedures: updatedProcedures,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setToast({
          message: 'Procedure added successfully',
          type: 'success',
        });
        // Refresh visit details
        const updatedResponse = await fetch(
          `${API_URL}/clinical-visits/${visitId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const updatedData = await updatedResponse.json();
        if (updatedResponse.ok) {
          setSelectedVisit(updatedData);
        }
      } else {
        setToast({
          message: data.error || 'Failed to save procedure',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving procedure:', error);
      setToast({ message: 'Failed to save procedure', type: 'error' });
    }
  };

  const handleExportPDF = async () => {
    setToast({ message: 'Exporting...', type: 'info' });
    try {
      const filteredVisits = getFilteredVisits();
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let yPosition = 20;
      const pageHeight = 297;
      const margin = 20;
      const lineHeight = 7;

      filteredVisits.forEach((visit, index) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(16);
        pdf.text('CLINICAL VISITS REPORT', margin, yPosition);
        yPosition += lineHeight * 2;

        pdf.setFontSize(12);
        pdf.text(`Visit ${index + 1}`, margin, yPosition);
        yPosition += lineHeight;

        pdf.setFontSize(10);
        pdf.text(`Patient: ${getPatientName(visit.patient_id)}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Facility: ${getFacilityName(visit.facility_id)}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Date: ${formatDate(visit.visit_date)}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`Visit Type: ${visit.visit_type}`, margin, yPosition);
        yPosition += lineHeight;
        pdf.text(`WHO Stage: ${visit.who_stage}`, margin, yPosition);
        yPosition += lineHeight;
        
        const complaintLines = pdf.splitTextToSize(
          `Chief Complaint: ${visit.chief_complaint || 'N/A'}`,
          170
        );
        complaintLines.forEach((line) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });

        const notesLines = pdf.splitTextToSize(
          `Notes: ${visit.clinical_notes || 'No notes'}`,
          170
        );
        notesLines.forEach((line) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, margin, yPosition);
          yPosition += lineHeight;
        });

        yPosition += lineHeight;
      });

      pdf.text(
        `Generated on: ${formatDate(new Date().toISOString().split('T')[0])}`,
        margin,
        yPosition
      );

      pdf.save('clinical_visits.pdf');
      setToast({ message: 'Exported successfully', type: 'success' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setToast({ message: 'Failed to export PDF', type: 'error' });
    }
  };

  const handleExportSinglePDF = async (visit) => {
    setToast({ message: 'Exporting...', type: 'info' });
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.fontSize = '14px';

      const patientName = getPatientName(visit.patient_id);
      const facilityName = getFacilityName(visit.facility_id);
      const providerName = visit.providerName || 'Unknown Provider';

      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px;">
          <h1 style="margin: 0 0 10px 0; font-size: 24px;">Clinical Visit Report</h1>
          <p style="margin: 5px 0;">MyHubCares</p>
        </div>
        <div style="margin-bottom: 20px;">
          <div style="margin-bottom: 10px;"><strong>Patient Name:</strong> ${patientName}</div>
          <div style="margin-bottom: 10px;"><strong>Visit Date:</strong> ${formatDate(visit.visit_date)}</div>
          <div style="margin-bottom: 10px;"><strong>Visit Type:</strong> ${visit.visit_type}</div>
          <div style="margin-bottom: 10px;"><strong>MyHubCares Branch:</strong> ${facilityName}</div>
          <div style="margin-bottom: 10px;"><strong>Physician:</strong> ${providerName}</div>
          <div style="margin-bottom: 10px;"><strong>WHO Stage:</strong> ${visit.who_stage}</div>
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Chief Complaint/Symptoms:</strong><br>
          <div style="margin-top: 5px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            ${visit.chief_complaint || 'None recorded'}
          </div>
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Clinical Notes:</strong><br>
          <div style="margin-top: 5px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            ${visit.clinical_notes || 'No notes'}
          </div>
        </div>
        ${visit.assessment ? `
        <div style="margin-bottom: 20px;">
          <strong>Assessment & Plan:</strong><br>
          <div style="margin-top: 5px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            ${visit.assessment}
            ${visit.plan ? '<br><br><strong>Plan:</strong><br>' + visit.plan : ''}
          </div>
        </div>
        ` : ''}
        ${visit.vital_signs && visit.vital_signs.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <strong>Vital Signs:</strong><br>
          <div style="margin-top: 5px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            Blood Pressure: ${visit.vital_signs[0].systolic_bp}/${visit.vital_signs[0].diastolic_bp}<br>
            Heart Rate: ${visit.vital_signs[0].pulse_rate} bpm<br>
            Respiratory Rate: ${visit.vital_signs[0].respiratory_rate}<br>
            Temperature: ${visit.vital_signs[0].temperature_c}°C<br>
            Weight: ${visit.vital_signs[0].weight_kg} kg<br>
            Height: ${visit.vital_signs[0].height_cm} cm
          </div>
        </div>
        ` : ''}
        ${visit.diagnoses && visit.diagnoses.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <strong>Diagnoses:</strong><br>
          <div style="margin-top: 5px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            ${visit.diagnoses.map((d, i) => `${i + 1}. ${d.diagnosis_description}${d.icd10_code ? ' (ICD-10: ' + d.icd10_code + ')' : ''}`).join('<br>')}
          </div>
        </div>
        ` : ''}
        ${visit.procedures && visit.procedures.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <strong>Procedures:</strong><br>
          <div style="margin-top: 5px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
            ${visit.procedures.map((p, i) => `${i + 1}. ${p.procedure_name}${p.cpt_code ? ' (CPT: ' + p.cpt_code + ')' : ''}`).join('<br>')}
          </div>
        </div>
        ` : ''}
        <div style="margin-top: 40px; text-align: right; border-top: 1px solid #eee; padding-top: 20px;">
          <div style="display: inline-block; text-align: center;">
            <div style="border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 5px;">
              ${providerName}
            </div>
            <small>Attending Physician</small>
          </div>
        </div>
      `;

      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `clinical_visit_${patientName.replace(/\s+/g, '_')}_${formatDate(visit.visit_date).replace(/\//g, '_')}.pdf`;
      pdf.save(fileName);
      setToast({ message: 'Exported successfully', type: 'success' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setToast({ message: 'Failed to export PDF', type: 'error' });
    }
  };


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getFilteredVisits = () => {
    let filtered = clinicalVisits;

    if (searchTerm) {
      filtered = filtered.filter(
        (visit) =>
          getPatientName(visit.patient_id)
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          getFacilityName(visit.facility_id)
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          visit.chief_complaint
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(
        (visit) => visit.visit_type === typeFilter.toLowerCase()
      );
    }

    return filtered;
  };

  const renderRecentActivity = () => {
    const filteredVisits = getFilteredVisits();

    if (loading) {
      return (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          Loading clinical visits...
        </p>
      );
    }

    if (filteredVisits.length === 0) {
      return (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          No clinical visits found
        </p>
      );
    }

    return filteredVisits.map((visit) => (
      <div
        key={visit.visit_id}
        style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '18px' }}>
            {getPatientName(visit.patient_id)}
          </h3>
          <div
            style={{ marginBottom: '5px', color: '#007bff', fontSize: '14px' }}
          >
            📅 {formatDate(visit.visit_date)} • {visit.visit_type} •{' '}
            {getFacilityName(visit.facility_id)}
          </div>
          <div
            style={{ marginBottom: '5px', color: '#6c757d', fontSize: '14px' }}
          >
            WHO Stage: {visit.who_stage}
          </div>
          <div style={{ color: '#333', fontStyle: 'italic', fontSize: '14px' }}>
            "
            {visit.clinical_notes && visit.clinical_notes.length > 50
              ? visit.clinical_notes.substring(0, 50) + '...'
              : visit.clinical_notes || 'No notes'}
            "
          </div>
          {visit.diagnoses && visit.diagnoses.length > 0 && (
            <div
              style={{ marginTop: '5px', fontSize: '13px', color: '#6c757d' }}
            >
              🏥 Diagnoses:{' '}
              {visit.diagnoses.map((d) => d.diagnosis_description).join(', ')}
            </div>
          )}
          {visit.procedures && visit.procedures.length > 0 && (
            <div
              style={{ marginTop: '5px', fontSize: '13px', color: '#6c757d' }}
            >
              🔧 Procedures:{' '}
              {visit.procedures.map((p) => p.procedure_name).join(', ')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleViewDetails(visit)}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            View Details
          </button>
          <button
            onClick={() => handleExportSinglePDF(visit)}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Export PDF
          </button>
        </div>
      </div>
    ));
  };

  return (
    <div style={{ padding: '20px', paddingTop: '80px' }}>
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
            Clinical Visits
          </h2>
          <p
            style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}
          >
            Record and manage patient consultations
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportPDF}
            style={{
              padding: '10px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Export All
          </button>
          <button
            onClick={handleRecordNewVisit}
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
            Record New Visit
          </button>
        </div>
      </div>

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
            placeholder="Search clinical visits..."
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '8px 12px 8px 36px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              appearance: 'none',
            }}
          >
            <option value="all">All Types</option>
            {validVisitTypes.map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ').charAt(0).toUpperCase() +
                  type.replace('_', ' ').slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div>{renderRecentActivity()}</div>

      {/* Clinical Visit Modal */}
      {showModal && (
        <ClinicalVisitModal
          mode={modalMode}
          visit={selectedVisit}
          onClose={() => {
            setShowModal(false);
            setSelectedVisit(null);
          }}
          onSave={modalMode === 'add' ? handleSaveVisit : handleUpdateVisit}
          patients={patients}
          facilities={facilities}
          getPatientName={getPatientName}
          getFacilityName={getFacilityName}
          onSaveDiagnosis={handleSaveDiagnosis}
          onSaveProcedure={handleSaveProcedure}
        />
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
            <Download size={20} />
          )}
          <span style={{ fontSize: '14px' }}>{toast.message}</span>
        </div>
      )}

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

// Clinical Visit Modal Component
const ClinicalVisitModal = ({
  mode,
  visit,
  onClose,
  onSave,
  patients,
  facilities,
  getPatientName,
  getFacilityName,
  onSaveDiagnosis,
  onSaveProcedure,
}) => {
  // Helper function for date formatting
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  // Default form data structure
  const getDefaultFormData = () => ({
    patient_id: '',
    provider_id: 'default-provider',
    facility_id: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'initial',
    whoStage: 'Stage 1',
    chiefComplaint: '',
    assessment: '',
    plan: '',
    followUpDate: '',
    followUpReason: '',
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      respiratoryRate: '',
      temperature: '',
      weight: '',
      height: '',
    },
    diagnoses: [],
    procedures: [],
    notes: '',
  });

  const [formData, setFormData] = useState(() => {
    if (!visit) {
      return getDefaultFormData();
    }
    // If visit is provided, ensure vitalSigns is always initialized
    return {
      ...getDefaultFormData(),
      ...visit,
      vitalSigns: visit.vitalSigns || getDefaultFormData().vitalSigns,
    };
  });

  useEffect(() => {
    if (visit && mode !== 'view') {
      // Only transform data for edit/add mode, not view mode
      setFormData({
        ...visit,
        visit_id: visit.visit_id || visit.visitId || null,
        patient_id: visit.patient_id || '',
        provider_id: visit.provider_id || 'default-provider',
        facility_id: visit.facility_id || '',
        visitDate: visit.visit_date
          ? new Date(visit.visit_date).toISOString().split('T')[0]
          : '',
        visitType: visit.visit_type || 'initial',
        whoStage: visit.who_stage || 'Stage 1',
        chiefComplaint: visit.chief_complaint || '',
        assessment: visit.assessment || '',
        plan: visit.plan || '',
        followUpDate: visit.follow_up_date
          ? new Date(visit.follow_up_date).toISOString().split('T')[0]
          : '',
        followUpReason: visit.follow_up_reason || '',
        notes: visit.clinical_notes || '',
        vitalSigns:
          visit.vital_signs && visit.vital_signs.length > 0
            ? {
                bloodPressure: `${visit.vital_signs[0].systolic_bp}/${visit.vital_signs[0].diastolic_bp}`,
                heartRate: visit.vital_signs[0].pulse_rate?.toString() || '72',
                respiratoryRate:
                  visit.vital_signs[0].respiratory_rate?.toString() || '16',
                temperature:
                  visit.vital_signs[0].temperature_c?.toString() || '36.5',
                weight: visit.vital_signs[0].weight_kg?.toString() || '65',
                height: visit.vital_signs[0].height_cm?.toString() || '165',
              }
            : {
                bloodPressure: '120/80',
                heartRate: '72',
                respiratoryRate: '16',
                temperature: '36.5',
                weight: '65',
                height: '165',
              },
        diagnoses: visit.diagnoses || [],
        procedures: visit.procedures || [],
      });
    } else if (!visit && mode === 'add') {
      // Reset form for new visit
      setFormData({
        patient_id: '',
        provider_id: 'default-provider',
        facility_id: '',
        visitDate: new Date().toISOString().split('T')[0],
        visitType: 'initial',
        whoStage: 'Stage 1',
        chiefComplaint: '',
        assessment: '',
        plan: '',
        followUpDate: '',
        followUpReason: '',
        vitalSigns: {
          bloodPressure: '',
          heartRate: '',
          respiratoryRate: '',
          temperature: '',
          weight: '',
          height: '',
        },
        diagnoses: [],
        procedures: [],
        notes: '',
      });
    }
  }, [visit, mode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('vitalSigns.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        vitalSigns: {
          ...(formData.vitalSigns || getDefaultFormData().vitalSigns),
          [field]: value,
        },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddDiagnosis = () => {
    setFormData({
      ...formData,
      diagnoses: [
        ...formData.diagnoses,
        {
          diagnosis_id: '',
          icd10_code: '',
          diagnosis_description: '',
          diagnosis_type: 'primary',
          is_chronic: false,
          onset_date: '',
          resolved_date: '',
        },
      ],
    });
  };

  const handleDiagnosisChange = (index, field, value) => {
    const updatedDiagnoses = [...formData.diagnoses];
    updatedDiagnoses[index][field] = value;
    setFormData({ ...formData, diagnoses: updatedDiagnoses });
  };

  const handleRemoveDiagnosis = (index) => {
    const updatedDiagnoses = [...formData.diagnoses];
    updatedDiagnoses.splice(index, 1);
    setFormData({ ...formData, diagnoses: updatedDiagnoses });
  };

  const handleAddProcedure = () => {
    setFormData({
      ...formData,
      procedures: [
        ...formData.procedures,
        {
          procedure_id: '',
          cpt_code: '',
          procedure_name: '',
          procedure_description: '',
          outcome: '',
          performed_at: new Date().toISOString().slice(0, 16),
        },
      ],
    });
  };

  const handleProcedureChange = (index, field, value) => {
    const updatedProcedures = [...formData.procedures];
    updatedProcedures[index][field] = value;
    setFormData({ ...formData, procedures: updatedProcedures });
  };

  const handleRemoveProcedure = (index) => {
    const updatedProcedures = [...formData.procedures];
    updatedProcedures.splice(index, 1);
    setFormData({ ...formData, procedures: updatedProcedures });
  };

  return (
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
        paddingTop: '64px',
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '800px',
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
            {mode === 'add'
              ? 'Record Clinical Visit'
              : mode === 'edit'
              ? 'Edit Clinical Visit'
              : 'Visit Details'}
          </h2>
          <button
            onClick={onClose}
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

        {mode === 'view' ? (
         <VisitDetailsView
            visit={visit}
            getPatientName={getPatientName}
            getFacilityName={getFacilityName}
            formatDate={formatDate}
            onClose={onClose}
            onSaveDiagnosis={onSaveDiagnosis}    // ✅ Use the prop name
            onSaveProcedure={onSaveProcedure}    // ✅ Use the prop name
            validDiagnosisTypes={validDiagnosisTypes}
          />
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                }}
              >
                Patient <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                name="patient_id"
                value={formData.patient_id}
                onChange={handleChange}
                required
                disabled={mode === 'edit'}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
              >
                <option value="">Select a patient</option>
                {patients.map((patient) => (
                  <option key={patient.patient_id} value={patient.patient_id}>
                    {patient.first_name}{' '}
                    {patient.middle_name ? patient.middle_name + ' ' : ''}
                    {patient.last_name}
                    {patient.suffix ? ' ' + patient.suffix : ''} ({patient.uic})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                }}
              >
                Facility <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                name="facility_id"
                value={formData.facility_id}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
              >
                <option value="">Select a facility</option>
                {facilities.map((facility) => (
                  <option
                    key={facility.facility_id}
                    value={facility.facility_id}
                  >
                    {facility.facility_name || facility.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Visit Date <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  name="visitDate"
                  value={formData.visitDate}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Visit Type <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  name="visitType"
                  value={formData.visitType}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                >
                  {validVisitTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').charAt(0).toUpperCase() +
                        type.replace('_', ' ').slice(1)}
                    </option>
                  ))}
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
                WHO Stage <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                name="whoStage"
                value={formData.whoStage}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
              >
                {validWhoStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                }}
              >
                Chief Complaint <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                name="chiefComplaint"
                value={formData.chiefComplaint}
                onChange={handleChange}
                rows="3"
                required
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
                Assessment
              </label>
              <textarea
                name="assessment"
                value={formData.assessment}
                onChange={handleChange}
                rows="3"
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
                Plan
              </label>
              <textarea
                name="plan"
                value={formData.plan}
                onChange={handleChange}
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Follow-up Date
                </label>
                <input
                  type="date"
                  name="followUpDate"
                  value={formData.followUpDate}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Follow-up Reason
                </label>
                <input
                  type="text"
                  name="followUpReason"
                  value={formData.followUpReason}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </div>

            {/* Vital Signs */}
            <div style={{ marginBottom: '15px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                }}
              >
                Vital Signs
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d' }}>
                    Blood Pressure {/* e.g., 120/80 */}
                  </label>
                  <input
                    type="text"
                    name="vitalSigns.bloodPressure"
                    value={formData.vitalSigns?.bloodPressure || ''}
                    onChange={handleChange}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d' }}>
                    Heart Rate {/* e.g., 72 */}
                  </label>
                  <input
                    type="text"
                    name="vitalSigns.heartRate"
                    value={formData.vitalSigns?.heartRate || ''}
                    onChange={handleChange}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d' }}>
                    Respiratory Rate {/* e.g., 16 */}
                  </label>
                  <input
                    type="text"
                    name="vitalSigns.respiratoryRate"
                    value={formData.vitalSigns?.respiratoryRate || ''}
                    onChange={handleChange}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d' }}>
                    Temperature (°C) {/* e.g., 36.5 */}
                  </label>
                  <input
                    type="text"
                    name="vitalSigns.temperature"
                    value={formData.vitalSigns?.temperature || ''}
                    onChange={handleChange}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d' }}>
                    Weight (kg) {/* e.g., 65 */}
                  </label>
                  <input
                    type="text"
                    name="vitalSigns.weight"
                    value={formData.vitalSigns?.weight || ''}
                    onChange={handleChange}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6c757d' }}>
                    Height (cm) {/* e.g., 165 */}
                  </label>
                  <input
                    type="text"
                    name="vitalSigns.height"
                    value={formData.vitalSigns?.height || ''}
                    onChange={handleChange}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  />
                </div>
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
                Clinical Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
              />
            </div>

            {mode === 'add' && (
              <div style={{ marginBottom: '15px' }}>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: '#e7f3ff',
                    borderLeft: '4px solid #007bff',
                    borderRadius: '4px',
                  }}
                >
                  <p style={{ margin: 0, color: '#004085', fontSize: '14px' }}>
                    You can add diagnoses and procedures after saving the visit.
                  </p>
                </div>
              </div>
            )}

            {mode === 'edit' && (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontWeight: 'bold',
                      }}
                    >
                      Diagnoses
                    </label>
                    <button
                      type="button"
                      onClick={handleAddDiagnosis}
                      style={{
                        padding: '5px 10px',
                        background: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Add Diagnosis
                    </button>
                  </div>
                  {formData.diagnoses.length === 0 ? (
                    <div
                      style={{
                        padding: '10px',
                        border: '1px solid #e9ecef',
                        borderRadius: '4px',
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        textAlign: 'center',
                      }}
                    >
                      No diagnoses recorded
                    </div>
                  ) : (
                    formData.diagnoses.map((diagnosis, index) => (
                      <div
                        key={index}
                        style={{
                          border: '1px solid #e9ecef',
                          borderRadius: '4px',
                          padding: '10px',
                          marginBottom: '10px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                          }}
                        >
                          <h4 style={{ margin: 0 }}>Diagnosis {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveDiagnosis(index)}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              padding: '2px 8px',
                              fontSize: '12px',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              ICD-10 Code
                            </label>
                            <input
                              type="text"
                              value={diagnosis.icd10_code}
                              onChange={(e) =>
                                handleDiagnosisChange(
                                  index,
                                  'icd10_code',
                                  e.target.value
                                )
                              }
                              placeholder="e.g., B20"
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              Type
                            </label>
                            <select
                              value={diagnosis.diagnosis_type}
                              onChange={(e) =>
                                handleDiagnosisChange(
                                  index,
                                  'diagnosis_type',
                                  e.target.value
                                )
                              }
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            >
                              {validDiagnosisTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type.charAt(0).toUpperCase() +
                                    type.slice(1).replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              Description
                            </label>
                            <textarea
                              value={diagnosis.diagnosis_description}
                              onChange={(e) =>
                                handleDiagnosisChange(
                                  index,
                                  'diagnosis_description',
                                  e.target.value
                                )
                              }
                              rows="2"
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              Onset Date
                            </label>
                            <input
                              type="date"
                              value={diagnosis.onset_date}
                              onChange={(e) =>
                                handleDiagnosisChange(
                                  index,
                                  'onset_date',
                                  e.target.value
                                )
                              }
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              Resolved Date
                            </label>
                            <input
                              type="date"
                              value={diagnosis.resolved_date}
                              onChange={(e) =>
                                handleDiagnosisChange(
                                  index,
                                  'resolved_date',
                                  e.target.value
                                )
                              }
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={diagnosis.is_chronic}
                                onChange={(e) =>
                                  handleDiagnosisChange(
                                    index,
                                    'is_chronic',
                                    e.target.checked
                                  )
                                }
                                style={{ width: '16px', height: '16px' }}
                              />
                              Chronic Condition
                            </label>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontWeight: 'bold',
                      }}
                    >
                      Procedures
                    </label>
                    <button
                      type="button"
                      onClick={handleAddProcedure}
                      style={{
                        padding: '5px 10px',
                        background: '#6f42c1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Add Procedure
                    </button>
                  </div>
                  {formData.procedures.length === 0 ? (
                    <div
                      style={{
                        padding: '10px',
                        border: '1px solid #e9ecef',
                        borderRadius: '4px',
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        textAlign: 'center',
                      }}
                    >
                      No procedures recorded
                    </div>
                  ) : (
                    formData.procedures.map((procedure, index) => (
                      <div
                        key={index}
                        style={{
                          border: '1px solid #e9ecef',
                          borderRadius: '4px',
                          padding: '10px',
                          marginBottom: '10px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                          }}
                        >
                          <h4 style={{ margin: 0 }}>Procedure {index + 1}</h4>
                          <button
                            type="button"
                            onClick={() => handleRemoveProcedure(index)}
                            style={{
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              padding: '2px 8px',
                              fontSize: '12px',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              CPT Code
                            </label>
                            <input
                              type="text"
                              value={procedure.cpt_code}
                              onChange={(e) =>
                                handleProcedureChange(
                                  index,
                                  'cpt_code',
                                  e.target.value
                                )
                              }
                              placeholder="e.g., 99213"
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              Performed At
                            </label>
                            <input
                              type="datetime-local"
                              value={procedure.performed_at}
                              onChange={(e) =>
                                handleProcedureChange(
                                  index,
                                  'performed_at',
                                  e.target.value
                                )
                              }
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              Procedure Name
                            </label>
                            <input
                              type="text"
                              value={procedure.procedure_name}
                              onChange={(e) =>
                                handleProcedureChange(
                                  index,
                                  'procedure_name',
                                  e.target.value
                                )
                              }
                              placeholder="e.g., Physical Examination"
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              Description
                            </label>
                            <textarea
                              value={procedure.procedure_description}
                              onChange={(e) =>
                                handleProcedureChange(
                                  index,
                                  'procedure_description',
                                  e.target.value
                                )
                              }
                              rows="2"
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '12px', color: '#6c757d' }}>
                              Outcome
                            </label>
                            <textarea
                              value={procedure.outcome}
                              onChange={(e) =>
                                handleProcedureChange(
                                  index,
                                  'outcome',
                                  e.target.value
                                )
                              }
                              rows="2"
                              style={{
                                width: '100%',
                                padding: '6px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                type="button"
                onClick={onClose}
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
                {mode === 'add' ? 'Save Visit' : 'Update Visit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Visit Details View Component
const VisitDetailsView = ({
  visit,
  getPatientName,
  getFacilityName,
  formatDate,
  onClose,
  onSaveDiagnosis,
  onSaveProcedure,
  validDiagnosisTypes,
}) => {
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
  const [showProcedureForm, setShowProcedureForm] = useState(false);
  const [diagnosisForm, setDiagnosisForm] = useState({
    icd10_code: '',
    diagnosis_description: '',
    diagnosis_type: 'primary',
    is_chronic: false,
    onset_date: '',
    resolved_date: '',
  });
  const [procedureForm, setProcedureForm] = useState({
    cpt_code: '',
    procedure_name: '',
    procedure_description: '',
    outcome: '',
    performed_at: new Date().toISOString().slice(0, 16),
  });

  const handleDiagnosisChange = (field, value) => {
    setDiagnosisForm({ ...diagnosisForm, [field]: value });
  };

  const handleProcedureChange = (field, value) => {
    setProcedureForm({ ...procedureForm, [field]: value });
  };

  const handleSaveDiagnosisClick = () => {
    if (!diagnosisForm.diagnosis_description) {
      return;
    }
    onSaveDiagnosis(visit.visit_id, diagnosisForm);
    setDiagnosisForm({
      icd10_code: '',
      diagnosis_description: '',
      diagnosis_type: 'primary',
      is_chronic: false,
      onset_date: '',
      resolved_date: '',
    });
    setShowDiagnosisForm(false);
  };

  const handleSaveProcedureClick = () => {
    if (!procedureForm.procedure_name) {
      return;
    }
    onSaveProcedure(visit.visit_id, procedureForm);
    setProcedureForm({
      cpt_code: '',
      procedure_name: '',
      procedure_description: '',
      outcome: '',
      performed_at: new Date().toISOString().slice(0, 16),
    });
    setShowProcedureForm(false);
  };

  if (!visit) {
    return (
      <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
        Loading visit details...
      </p>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '15px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold',
            color: '#6c757d',
          }}
        >
          Patient Name
        </label>
        <input
          type="text"
          value={visit.patientName || getPatientName(visit.patient_id)}
          readOnly
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            backgroundColor: '#fff',
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginBottom: '15px',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
              color: '#6c757d',
            }}
          >
            Visit Date
          </label>
          <input
            type="text"
            value={formatDate(visit.visit_date)}
            readOnly
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              backgroundColor: '#fff',
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
              color: '#6c757d',
            }}
          >
            Visit Type
          </label>
          <input
            type="text"
            value={visit.visit_type}
            readOnly
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              backgroundColor: '#fff',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginBottom: '15px',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
              color: '#6c757d',
            }}
          >
            MyHubCares Branch
          </label>
          <input
            type="text"
            value={visit.facilityName || getFacilityName(visit.facility_id)}
            readOnly
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              backgroundColor: '#fff',
            }}
          />
        </div>
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '5px',
              fontWeight: 'bold',
              color: '#6c757d',
            }}
          >
            Physician <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="text"
            value={visit.providerName || 'Unknown Provider'}
            readOnly
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              backgroundColor: '#fff',
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
            color: '#6c757d',
          }}
        >
          WHO Stage
        </label>
        <input
          type="text"
          value={visit.who_stage}
          readOnly
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            backgroundColor: '#fff',
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '5px',
            fontWeight: 'bold',
            color: '#6c757d',
          }}
        >
          Clinical Notes
        </label>
        <textarea
          value={visit.clinical_notes || 'No notes'}
          readOnly
          rows="4"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            backgroundColor: '#fff',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Diagnoses Section */}
      <div style={{ marginBottom: '15px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontWeight: 'bold',
              color: '#333',
              fontSize: '16px',
            }}
          >
            Diagnoses
          </h3>
          <button
            type="button"
            onClick={() => setShowDiagnosisForm(!showDiagnosisForm)}
            style={{
              padding: '5px 10px',
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {showDiagnosisForm ? 'Cancel' : 'Add Diagnosis'}
          </button>
        </div>

        {showDiagnosisForm && (
          <div
            style={{
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              padding: '15px',
              marginBottom: '10px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                ICD-10 Code
              </label>
              <input
                type="text"
                value={diagnosisForm.icd10_code}
                onChange={(e) => handleDiagnosisChange('icd10_code', e.target.value)}
                placeholder="e.g., B20"
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                Type
              </label>
              <select
                value={diagnosisForm.diagnosis_type}
                onChange={(e) => handleDiagnosisChange('diagnosis_type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                {validDiagnosisTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                Description <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                value={diagnosisForm.diagnosis_description}
                onChange={(e) => handleDiagnosisChange('diagnosis_description', e.target.value)}
                rows="2"
                required
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                Onset Date
              </label>
              <input
                type="date"
                value={diagnosisForm.onset_date}
                onChange={(e) => handleDiagnosisChange('onset_date', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                Resolved Date
              </label>
              <input
                type="date"
                value={diagnosisForm.resolved_date}
                onChange={(e) => handleDiagnosisChange('resolved_date', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={diagnosisForm.is_chronic}
                  onChange={(e) => handleDiagnosisChange('is_chronic', e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                Chronic Condition
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDiagnosisForm(false);
                  setDiagnosisForm({
                    icd10_code: '',
                    diagnosis_description: '',
                    diagnosis_type: 'primary',
                    is_chronic: false,
                    onset_date: '',
                    resolved_date: '',
                  });
                }}
                style={{
                  padding: '6px 12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDiagnosisClick}
                style={{
                  padding: '6px 12px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Save Diagnosis
              </button>
            </div>
          </div>
        )}

        {visit.diagnoses && visit.diagnoses.length > 0 ? (
          <div
            style={{
              padding: '10px',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
            }}
          >
            {visit.diagnoses.map((d, i) => (
              <div key={i} style={{ marginBottom: '5px' }}>
                {d.diagnosis_description}
                {d.icd10_code && <span> (ICD-10: {d.icd10_code})</span>}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '10px',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
              color: '#6c757d',
            }}
          >
            No diagnoses recorded
          </div>
        )}
      </div>

      {/* Procedures Section */}
      <div style={{ marginBottom: '15px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontWeight: 'bold',
              color: '#333',
              fontSize: '16px',
            }}
          >
            Procedures
          </h3>
          <button
            type="button"
            onClick={() => setShowProcedureForm(!showProcedureForm)}
            style={{
              padding: '5px 10px',
              background: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {showProcedureForm ? 'Cancel' : 'Add Procedure'}
          </button>
        </div>

        {showProcedureForm && (
          <div
            style={{
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              padding: '15px',
              marginBottom: '10px',
              backgroundColor: '#f8f9fa',
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                CPT Code
              </label>
              <input
                type="text"
                value={procedureForm.cpt_code}
                onChange={(e) => handleProcedureChange('cpt_code', e.target.value)}
                placeholder="e.g., 99213"
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                Procedure Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={procedureForm.procedure_name}
                onChange={(e) => handleProcedureChange('procedure_name', e.target.value)}
                placeholder="e.g., Physical Examination"
                required
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                Description
              </label>
              <textarea
                value={procedureForm.procedure_description}
                onChange={(e) => handleProcedureChange('procedure_description', e.target.value)}
                rows="2"
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                Performed At
              </label>
              <input
                type="datetime-local"
                value={procedureForm.performed_at}
                onChange={(e) => handleProcedureChange('performed_at', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', color: '#6c757d', display: 'block', marginBottom: '5px' }}>
                Outcome
              </label>
              <textarea
                value={procedureForm.outcome}
                onChange={(e) => handleProcedureChange('outcome', e.target.value)}
                rows="2"
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowProcedureForm(false);
                  setProcedureForm({
                    cpt_code: '',
                    procedure_name: '',
                    procedure_description: '',
                    outcome: '',
                    performed_at: new Date().toISOString().slice(0, 16),
                  });
                }}
                style={{
                  padding: '6px 12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProcedureClick}
                style={{
                  padding: '6px 12px',
                  background: '#6f42c1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Save Procedure
              </button>
            </div>
          </div>
        )}

        {visit.procedures && visit.procedures.length > 0 ? (
          <div
            style={{
              padding: '10px',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
            }}
          >
            {visit.procedures.map((p, i) => (
              <div key={i} style={{ marginBottom: '5px' }}>
                {p.procedure_name}
                {p.cpt_code && <span> (CPT: {p.cpt_code})</span>}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '10px',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              backgroundColor: '#f8f9fa',
              color: '#6c757d',
            }}
          >
            No procedures recorded
          </div>
        )}
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
          onClick={onClose}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Helper function for date formatting
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
};

export default ClinicalVisits;
