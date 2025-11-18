// web/src/pages/Prescriptions.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Plus,
  Search,
  Filter,
  AlertCircle,
  FileText,
  Printer,
  Download,
  Trash2,
  Package,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const API_BASE_URL = 'http://localhost:5000/api';

const Prescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [toast, setToast] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dispenseItems, setDispenseItems] = useState([]);
  const [inventoryAvailability, setInventoryAvailability] = useState({});
  
  // Data from API
  const [medications, setMedications] = useState([]);
  const [patients, setPatients] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // State for new prescription
  const [newPrescription, setNewPrescription] = useState({
    patient_id: '',
    facility_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
    items: [
      {
        medication_id: '',
        dosage: '',
        frequency: '',
        quantity: 1,
        instructions: '',
        duration_days: '',
      },
    ],
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchPrescriptions();
    fetchMedications();
    fetchPatients();
    fetchFacilities();
    getCurrentUser();
  }, []);

  // Fetch inventory availability when dispense modal opens
  useEffect(() => {
    if (showDispenseModal && selectedPrescription) {
      fetchInventoryAvailability();
    }
  }, [showDispenseModal, selectedPrescription]);

  // Fetch prescriptions from API
  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/prescriptions`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use the status text
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success) {
        // Transform backend data to frontend format
        const transformedPrescriptions = data.data.map((prescription) => {
          const prescriptionDate = new Date(prescription.prescription_date);
          const formattedDate = prescriptionDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });

          // Calculate next refill date
          const nextRefillDate = prescription.end_date
            ? new Date(prescription.end_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              })
            : '';

          return {
            id: prescription.prescription_id,
            prescription_id: prescription.prescription_id,
            prescription_number: prescription.prescription_number,
            patientName: `${prescription.first_name} ${prescription.last_name}`,
            patientAge: prescription.birth_date
              ? Math.floor(
                  (new Date() - new Date(prescription.birth_date)) /
                    (365.25 * 24 * 60 * 60 * 1000)
                )
              : '',
            patientGender: prescription.gender || '',
            physicianName: prescription.prescriber_full_name ? `Dr. ${prescription.prescriber_full_name}` : 'Unknown Physician',
            prescriptionDate: formattedDate,
            start_date: prescription.start_date,
            end_date: prescription.end_date,
            medications: prescription.items?.map((item) => ({
              prescription_item_id: item.prescription_item_id,
              medication_id: item.medication_id,
              drugName: item.medication_name,
              dosage: item.dosage,
              frequency: item.frequency,
              quantity: item.quantity,
              duration: item.duration_days
                ? `${item.duration_days} days`
                : '30 days',
              instructions: item.instructions || '',
            })) || [],
            prescriptionNotes: prescription.notes || '',
            nextRefill: nextRefillDate,
            status: prescription.status,
            facility_name: prescription.facility_name,
          };
        });
        setPrescriptions(transformedPrescriptions);
      } else {
        throw new Error(data.message || 'Failed to fetch prescriptions');
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setToast({
        message: 'Failed to fetch prescriptions: ' + error.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch medications from API
  const fetchMedications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/medications?active=true`);
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

  // Fetch patients from API
  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setPatients(data.patients || []);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      setToast({
        message: 'Failed to fetch patients: ' + error.message,
        type: 'error',
      });
    }
  };

  // Fetch facilities from API
  const fetchFacilities = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/facilities`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setFacilities(data.facilities || data.data || []);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setToast({
        message: 'Failed to fetch facilities: ' + error.message,
        type: 'error',
      });
    }
  };

  // Get current user info
  const getCurrentUser = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setUserRole(user.role);
      } else {
        // Try to fetch from API
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setCurrentUser(data.user);
              setUserRole(data.user.role);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
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

  // Auto-calculate end_date (Next Refill Date) based on start_date and medication durations
  useEffect(() => {
    if (newPrescription.start_date) {
      // Find the maximum duration from all medication items
      const durations = newPrescription.items
        .map(item => {
          const duration = item.duration_days === '' ? null : parseInt(item.duration_days);
          return duration && !isNaN(duration) ? duration : null;
        })
        .filter(d => d !== null);

      if (durations.length > 0) {
        const maxDuration = Math.max(...durations);
        const startDate = new Date(newPrescription.start_date);
        startDate.setDate(startDate.getDate() + maxDuration);
        const calculatedEndDate = startDate.toISOString().split('T')[0];
        
        // Only update if the calculated date is different from current end_date
        setNewPrescription(prev => {
          if (prev.end_date !== calculatedEndDate) {
            return {
              ...prev,
              end_date: calculatedEndDate,
            };
          }
          return prev;
        });
      } else {
        // If no durations, clear end_date only if it's not already empty
        setNewPrescription(prev => {
          if (prev.end_date !== '') {
            return {
              ...prev,
              end_date: '',
            };
          }
          return prev;
        });
      }
    }
  }, [newPrescription.start_date, newPrescription.items]);

  // Handle after print event
  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
      if (isPrinting) {
        setShowModal(false);
      }
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [isPrinting]);


  const handleViewPrescription = (prescription) => {
    setSelectedPrescription(prescription);
    setShowModal(true);
  };

  const handleDispensePrescription = (prescription) => {
    setSelectedPrescription(prescription);
    // Initialize dispense items with prescription medications
    const items = prescription.medications.map((med) => ({
      prescription_item_id: med.prescription_item_id || med.medication_id,
      medication_id: med.medication_id,
      medication_name: med.drugName,
      quantity_dispensed: med.quantity || 1,
      batch_number: '',
      notes: '',
      available_quantity: 0,
    }));
    setDispenseItems(items);
    setShowDispenseModal(true);
  };

  // Fetch inventory availability for medications in the prescription
  const fetchInventoryAvailability = async () => {
    if (!selectedPrescription || !currentUser) return;

    try {
      const token = localStorage.getItem('token');
      const facilityId = currentUser.facility_id || facilities[0]?.facility_id;
      
      if (!facilityId) {
        setToast({
          message: 'No facility assigned. Please contact administrator.',
          type: 'error',
        });
        return;
      }

      const availability = {};
      
      // Check inventory for each medication
      for (const med of selectedPrescription.medications) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/inventory?medication_id=${med.medication_id}&facility_id=${facilityId}`,
            {
              headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.length > 0) {
              const inventory = data.data[0];
              availability[med.medication_id] = {
                quantity_on_hand: inventory.quantity_on_hand,
                reorder_level: inventory.reorder_level,
                unit: inventory.unit,
                inventory_id: inventory.inventory_id,
              };
            } else {
              availability[med.medication_id] = {
                quantity_on_hand: 0,
                reorder_level: 0,
                unit: 'N/A',
                inventory_id: null,
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching inventory for ${med.medication_id}:`, error);
          availability[med.medication_id] = {
            quantity_on_hand: 0,
            reorder_level: 0,
            unit: 'N/A',
            inventory_id: null,
          };
        }
      }
      
      setInventoryAvailability(availability);
      
      // Update dispense items with available quantities
      setDispenseItems(prevItems => 
        prevItems.map(item => ({
          ...item,
          available_quantity: availability[item.medication_id]?.quantity_on_hand || 0,
        }))
      );
    } catch (error) {
      console.error('Error fetching inventory availability:', error);
    }
  };

  // Handle dispensing medication
  const handleDispense = async () => {
    try {
      if (!selectedPrescription || !currentUser) {
        setToast({
          message: 'User information not available',
          type: 'error',
        });
        return;
      }

      // Get nurse_id - try multiple possible fields
      const nurseId = currentUser.user_id || currentUser.id || currentUser.userId;
      if (!nurseId) {
        console.error('Current user object:', currentUser);
        setToast({
          message: 'User ID not found. Please log out and log back in.',
          type: 'error',
        });
        return;
      }

      const facilityId = currentUser.facility_id || facilities[0]?.facility_id;
      if (!facilityId) {
        setToast({
          message: 'No facility assigned. Please contact administrator.',
          type: 'error',
        });
        return;
      }

      console.log('Dispense validation:', {
        nurseId,
        facilityId,
        currentUser,
        prescription_id: selectedPrescription.prescription_id,
      });

      // Validate dispense items
      const validItems = dispenseItems.filter(item => 
        item.quantity_dispensed > 0 && 
        item.quantity_dispensed <= item.available_quantity
      );

      if (validItems.length === 0) {
        setToast({
          message: 'Please enter valid quantities to dispense',
          type: 'error',
        });
        return;
      }

      // Get prescription items to get the correct prescription_item_id
      const token = localStorage.getItem('token');
      const prescriptionResponse = await fetch(
        `${API_BASE_URL}/prescriptions/${selectedPrescription.prescription_id}`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!prescriptionResponse.ok) {
        throw new Error('Failed to fetch prescription details');
      }

      const prescriptionData = await prescriptionResponse.json();
      if (!prescriptionData.success) {
        throw new Error('Failed to fetch prescription details');
      }

      // Debug: Log prescription data
      console.log('Prescription data:', prescriptionData);
      console.log('Prescription items:', prescriptionData.data?.items);
      console.log('Valid items to dispense:', validItems);

      // Map medications to prescription items
      const itemsToDispense = validItems.map(item => {
        // Find the prescription item ID from the prescription data
        const prescriptionItem = prescriptionData.data.items?.find(
          pi => pi.medication_id === item.medication_id
        );
        
        if (!prescriptionItem) {
          console.error(`Prescription item not found for medication_id: ${item.medication_id}`);
          throw new Error(`Prescription item not found for medication ${item.medication_name}. Please refresh and try again.`);
        }
        
        if (!prescriptionItem.prescription_item_id) {
          console.error('Prescription item missing prescription_item_id:', prescriptionItem);
          throw new Error(`Prescription item data is incomplete for medication ${item.medication_name}. Please contact support.`);
        }
        
        return {
          prescription_item_id: prescriptionItem.prescription_item_id,
          quantity_dispensed: parseInt(item.quantity_dispensed),
          batch_number: item.batch_number || null,
          notes: item.notes || null,
        };
      });

      console.log('Items to dispense:', itemsToDispense);
      console.log('Request payload:', {
        nurse_id: currentUser.user_id || currentUser.id,
        facility_id: facilityId,
        items: itemsToDispense,
      });

      // Call dispense API
      const response = await fetch(
        `${API_BASE_URL}/prescriptions/${selectedPrescription.prescription_id}/dispense`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            nurse_id: currentUser.user_id || currentUser.id,
            facility_id: facilityId,
            items: itemsToDispense,
          }),
        }
      );

      // Get error message before parsing JSON if response is not ok
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        let errorDetails = null;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          errorDetails = errorData.details || errorData.item || null;
          console.error('Backend error response:', errorData);
        } catch (e) {
          console.error('Failed to parse error response:', e);
          // If JSON parsing fails, use the status text
        }
        const fullError = errorDetails 
          ? `${errorMessage}${errorDetails ? ` (Details: ${JSON.stringify(errorDetails)})` : ''}`
          : errorMessage;
        throw new Error(fullError);
      }

      const data = await response.json();

      if (!data.success) {
        console.error('Dispense response not successful:', data);
        throw new Error(data.message || data.error || 'Failed to dispense medication');
      }

      setToast({
        message: 'Medication dispensed successfully',
        type: 'success',
      });

      // Close modal and refresh prescriptions
      setShowDispenseModal(false);
      setDispenseItems([]);
      setInventoryAvailability({});
      fetchPrescriptions();
    } catch (error) {
      console.error('Error dispensing medication:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
      
      // Extract the actual error message (remove duplicate "Failed to dispense medication" prefix if present)
      let errorMessage = error.message || 'Failed to dispense medication';
      if (errorMessage.startsWith('Failed to dispense medication: ')) {
        errorMessage = errorMessage.replace('Failed to dispense medication: ', '');
      }
      
      setToast({
        message: errorMessage,
        type: 'error',
      });
    }
  };

  const handlePrintPrescription = (prescription) => {
    // Set the prescription and show modal for printing
    setSelectedPrescription(prescription);
    setIsPrinting(true);
    setShowModal(true);

    // Wait a moment for the modal to render, then trigger print
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handlePrintFromModal = () => {
    // Set printing state without changing the modal
    setIsPrinting(true);

    // Wait a moment for the state to update, then trigger print
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleExportPDF = async (prescription) => {
    try {
      // Create a temporary div element to render the prescription
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.backgroundColor = 'white';

      // Add the prescription HTML to the temporary div
      tempDiv.innerHTML = `
        <div class="prescription-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px;">
          <h1 style="margin: 0 0 10px 0;">Medical Prescription</h1>
          <p style="margin: 5px 0;">MyHubCares</p>
          <p style="margin: 5px 0;">123 Healthcare Street, Medical City</p>
        </div>

        <div class="prescription-info" style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <strong>Patient Information</strong><br>
            Name: ${prescription.patientName}<br>
            Age: ${prescription.patientAge} years<br>
            Sex: ${prescription.patientGender}
          </div>
          <div>
            <strong>Prescription Details</strong><br>
            Date: ${prescription.prescriptionDate}<br>
            Rx No: ${prescription.prescription_number || `RX-${String(prescription.id || prescription.prescription_id).padStart(6, '0')}`}<br>
            Next Refill: ${prescription.nextRefill}
          </div>
        </div>

        <div class="prescription-section" style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0;">℞ Medications</h3>
          <div class="prescription-drugs">
            ${prescription.medications
              .map(
                (med, index) => `
              <div class="prescription-drug-item" style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed #eee;">
                <strong>${index + 1}. ${med.drugName}</strong><br>
                Sig: ${med.dosage} ${med.frequency}<br>
                Duration: ${med.duration}<br>
                Instructions: ${med.instructions || 'None'}
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="prescription-section" style="margin-bottom: 20px;">
          <strong>Prescription Notes:</strong><br>
          ${prescription.prescriptionNotes || 'None'}
        </div>

        <div class="prescription-footer" style="margin-top: 40px; text-align: right;">
          <div class="prescription-signature" style="display: inline-block; text-align: center; width: 200px;">
            <div class="prescription-signature-line" style="border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 5px;">
              ${prescription.physicianName}
            </div>
            <small>Prescribing Physician</small>
          </div>
        </div>
      `;

      // Add the temporary div to the body
      document.body.appendChild(tempDiv);

      // Convert the HTML to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      // Remove the temporary div
      document.body.removeChild(tempDiv);

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add the image to the PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add new pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(
        `Prescription_${prescription.patientName}_${prescription.prescriptionDate}.pdf`
      );

      // Show success toast
      setToast({
        message: 'PDF downloaded successfully.',
        type: 'success',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Show error toast
      setToast({
        message: 'Failed to generate PDF. Please try again.',
        type: 'error',
      });
    }
  };

  // Handle creating a new prescription
  const handleCreatePrescription = async () => {
    try {
      // Validate the form
      if (!newPrescription.patient_id) {
        setToast({
          message: 'Please select a patient',
          type: 'error',
        });
        return;
      }

      if (!newPrescription.facility_id) {
        setToast({
          message: 'Please select a facility',
          type: 'error',
        });
        return;
      }

      // Check if all medications have required fields
      const invalidMedication = newPrescription.items.some(
        (med) => !med.medication_id || !med.dosage || !med.frequency || !med.quantity
      );

      if (invalidMedication) {
        setToast({
          message: 'Please fill in all medication fields',
          type: 'error',
        });
        return;
      }

      // Calculate end_date from medication durations if not already set
      let end_date = newPrescription.end_date;
      if (!end_date && newPrescription.start_date) {
        const durations = newPrescription.items
          .map(item => {
            const duration = item.duration_days === '' ? null : parseInt(item.duration_days);
            return duration && !isNaN(duration) ? duration : null;
          })
          .filter(d => d !== null);

        if (durations.length > 0) {
          const maxDuration = Math.max(...durations);
          const startDate = new Date(newPrescription.start_date);
          startDate.setDate(startDate.getDate() + maxDuration);
          end_date = startDate.toISOString().split('T')[0];
        }
      }

      // Prepare prescription data for API
      // Note: prescriber_id is optional - backend will use authenticated user if not provided
      const prescriptionData = {
        patient_id: newPrescription.patient_id,
        facility_id: newPrescription.facility_id,
        start_date: newPrescription.start_date,
        end_date: end_date || null,
        duration_days: null, // No longer using prescription-level duration
        notes: newPrescription.notes || null,
        items: newPrescription.items.map((item) => {
          const itemDurationDays = item.duration_days === '' ? null : item.duration_days;
          return {
            medication_id: item.medication_id,
            dosage: item.dosage,
            frequency: item.frequency,
            quantity: parseInt(item.quantity),
            instructions: item.instructions || null,
            duration_days: itemDurationDays ? parseInt(itemDurationDays) : null,
          };
        }),
      };

      // Send to API
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(prescriptionData),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If JSON parsing fails, use status text
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        // Handle error response - check for warnings/inventory issues
        let errorMessage = errorData.message || 'Failed to create prescription';
        
        // If there are warnings, include them in the error message
        if (errorData.warnings && errorData.warnings.length > 0) {
          const warningMessages = errorData.warnings.map(w => {
            if (w.medication) {
              return `${w.medication}: ${w.message}`;
            }
            return w.message;
          });
          errorMessage = `${errorMessage}. ${warningMessages.join('; ')}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Double-check success status (defensive programming)
      if (!data.success) {
        let errorMessage = data.message || 'Failed to create prescription';
        
        // If there are warnings, include them in the error message
        if (data.warnings && data.warnings.length > 0) {
          const warningMessages = data.warnings.map(w => {
            if (w.medication) {
              return `${w.medication}: ${w.message}`;
            }
            return w.message;
          });
          errorMessage = `${errorMessage}. ${warningMessages.join('; ')}`;
        }
        
        throw new Error(errorMessage);
      }

      // Show warnings if any (non-critical warnings that don't block creation)
      if (data.warnings && data.warnings.length > 0) {
        setToast({
          message: `Prescription created with warnings: ${data.warnings.map(w => w.message).join('; ')}`,
          type: 'warning',
        });
      } else {
        setToast({
          message: 'Prescription created successfully',
          type: 'success',
        });
      }

      // Reset form
      setNewPrescription({
        patient_id: '',
        facility_id: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: '',
        items: [
          {
            medication_id: '',
            dosage: '',
            frequency: '',
            quantity: 1,
            instructions: '',
            duration_days: '',
          },
        ],
      });

      // Close modal
      setShowCreateModal(false);

      // Refresh prescriptions list
      fetchPrescriptions();
    } catch (error) {
      console.error('Error creating prescription:', error);
      
      // Format error message for toast (replace newlines with spaces or format as list)
      let errorMessage = error.message;
      if (errorMessage.includes('\n\n')) {
        // Split into main message and details
        const parts = errorMessage.split('\n\n');
        const mainMessage = parts[0];
        const details = parts.slice(1).join('; ');
        errorMessage = `${mainMessage}. ${details}`;
      } else {
        errorMessage = errorMessage.replace(/\n/g, ' ');
      }
      
      setToast({
        message: errorMessage,
        type: 'error',
      });
    }
  };

  // Handle adding a new medication
  const handleAddMedication = () => {
    setNewPrescription({
      ...newPrescription,
      items: [
        ...newPrescription.items,
        {
          medication_id: '',
          dosage: '',
          frequency: '',
          quantity: 1,
          instructions: '',
          duration_days: '',
        },
      ],
    });
  };

  // Handle removing a medication
  const handleRemoveMedication = (index) => {
    const updatedItems = [...newPrescription.items];
    updatedItems.splice(index, 1);
    setNewPrescription({
      ...newPrescription,
      items: updatedItems,
    });
  };

  // Handle updating medication fields
  const handleMedicationChange = (index, field, value) => {
    const updatedItems = [...newPrescription.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setNewPrescription({
      ...newPrescription,
      items: updatedItems,
    });
  };

  const getFilteredPrescriptions = () => {
    let filtered = prescriptions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (prescription) =>
          prescription.patientName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          prescription.physicianName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          prescription.medications.some((med) =>
            med.drugName.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    return filtered;
  };

  const renderPrescriptionList = () => {
    const filteredPrescriptions = getFilteredPrescriptions();

    if (loading) {
      return (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          Loading prescriptions...
        </p>
      );
    }

    if (filteredPrescriptions.length === 0) {
      return (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          No prescriptions found
        </p>
      );
    }

    return filteredPrescriptions.map((prescription) => {
      return (
        <div
          key={prescription.id}
          style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
            <div>
              <h3 style={{ margin: 0, color: '#333', fontSize: '16px' }}>
                {prescription.patientName}
              </h3>
              <p
                style={{ margin: '5px 0', color: '#6c757d', fontSize: '14px' }}
              >
                Prescribed by: {prescription.physicianName}
              </p>
              <p
                style={{ margin: '5px 0', color: '#6c757d', fontSize: '14px' }}
              >
                Date: {prescription.prescriptionDate}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleViewPrescription(prescription)}
                style={{
                  padding: '6px 12px',
                  background: '#007bff',
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
                <FileText size={14} />
                View
              </button>
              {userRole === 'nurse' && prescription.status === 'active' && (
                <button
                  onClick={() => handleDispensePrescription(prescription)}
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
                  Dispense
                </button>
              )}
              <button
                onClick={() => handlePrintPrescription(prescription)}
                style={{
                  padding: '6px 12px',
                  background: 'white',
                  color: '#007bff',
                  border: '1px solid #007bff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Printer size={14} />
                Print
              </button>
              <button
                onClick={() => handleExportPDF(prescription)}
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
                <Download size={14} />
                Export PDF
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>Medications:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              {prescription.medications.map((med, index) => (
                <li
                  key={index}
                  style={{ marginBottom: '5px', fontSize: '14px' }}
                >
                  {med.drugName} - {med.dosage}, {med.frequency}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '10px', fontSize: '14px' }}>
            <strong>Notes:</strong> {prescription.prescriptionNotes}
          </div>

          <div style={{ fontSize: '14px' }}>
            <strong>Next Refill:</strong> {prescription.nextRefill}
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
            Prescriptions
          </h2>
          <p
            style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}
          >
            Manage digital prescriptions
          </p>
        </div>
        {userRole === 'physician' && (
          <button
            onClick={() => setShowCreateModal(true)}
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
            Create Prescription
          </button>
        )}
      </div>

      {/* Search */}
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
            placeholder="Search prescriptions..."
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
      </div>

      {/* Prescriptions List - Hidden when printing */}
      <div className="no-print">{renderPrescriptionList()}</div>

      {/* Create Prescription Modal */}
      {showCreateModal && (
        <div
          className="no-print"
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
            zIndex: 9999, // Increased z-index to ensure it covers the sidebar
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '20px', // Reduced padding
              borderRadius: '8px',
              width: '90%',
              maxWidth: '650px', // Reduced max-width
              maxHeight: 'calc(100vh - 40px)',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px', // Reduced margin
              }}
            >
              <h2 style={{ margin: 0 }}>Create Prescription</h2>
              <button
                onClick={() => setShowCreateModal(false)}
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
                value={newPrescription.patient_id}
                onChange={(e) =>
                  setNewPrescription({
                    ...newPrescription,
                    patient_id: e.target.value,
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
                required
              >
                <option value="">Select Patient</option>
                {patients.map((patient) => (
                  <option key={patient.patient_id} value={patient.patient_id}>
                    {patient.first_name} {patient.last_name}
                    {patient.uic ? ` (UIC: ${patient.uic})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Start Date <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  value={newPrescription.start_date}
                  onChange={(e) =>
                    setNewPrescription({
                      ...newPrescription,
                      start_date: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                  required
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
                  Medical Facility <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={newPrescription.facility_id}
                  onChange={(e) =>
                    setNewPrescription({
                      ...newPrescription,
                      facility_id: e.target.value,
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                  required
                >
                  <option value="">Select Facility</option>
                  {facilities.map((facility) => (
                    <option key={facility.facility_id} value={facility.facility_id}>
                      {facility.facility_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              {' '}
              {/* Reduced margin */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <label style={{ fontWeight: 'bold' }}>Medications</label>
                <button
                  onClick={handleAddMedication}
                  style={{
                    padding: '6px 12px',
                    background: '#007bff',
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
                  <Plus size={14} />
                  Add Another Drug
                </button>
              </div>
              {newPrescription.items.map((medication, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '4px',
                    padding: '12px', // Reduced padding
                    marginBottom: '10px', // Reduced margin
                    position: 'relative',
                  }}
                >
                  {newPrescription.items.length > 1 && (
                    <button
                      onClick={() => handleRemoveMedication(index)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#dc3545',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: '20px',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ flex: 2 }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '5px',
                          fontSize: '14px',
                        }}
                      >
                        Medication <span style={{ color: 'red' }}>*</span>
                      </label>
                      <select
                        value={medication.medication_id}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'medication_id',
                            e.target.value
                          )
                        }
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                        }}
                        required
                      >
                        <option value="">Select Medication</option>
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
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '5px',
                          fontSize: '14px',
                        }}
                      >
                        Dosage <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={medication.dosage}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'dosage',
                            e.target.value
                          )
                        }
                        placeholder="e.g., 1 tablet"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '5px',
                          fontSize: '14px',
                        }}
                      >
                        Frequency <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={medication.frequency}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'frequency',
                            e.target.value
                          )
                        }
                        placeholder="e.g., Once daily"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                        }}
                        required
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '5px',
                          fontSize: '14px',
                        }}
                      >
                        Quantity <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="number"
                        value={medication.quantity}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'quantity',
                            parseInt(e.target.value) || 1
                          )
                        }
                        min="1"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '5px',
                          fontSize: '14px',
                        }}
                      >
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        value={medication.duration_days || ''}
                        onChange={(e) =>
                          handleMedicationChange(
                            index,
                            'duration_days',
                            e.target.value === '' ? '' : parseInt(e.target.value) || ''
                          )
                        }
                        min="1"
                        placeholder="Optional"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '5px',
                        fontSize: '14px',
                      }}
                    >
                      Instructions
                    </label>
                    <textarea
                      value={medication.instructions}
                      onChange={(e) =>
                        handleMedicationChange(
                          index,
                          'instructions',
                          e.target.value
                        )
                      }
                      placeholder="Enter instructions for this medication"
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '5px',
                  fontWeight: 'bold',
                }}
              >
                Prescription Notes
              </label>
              <textarea
                value={newPrescription.notes}
                onChange={(e) =>
                  setNewPrescription({
                    ...newPrescription,
                    notes: e.target.value,
                  })
                }
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                  }}
                >
                  Next Refill Date
                </label>
                <input
                  type="date"
                  value={newPrescription.end_date || ''}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    backgroundColor: '#f8f9fa',
                    cursor: 'not-allowed',
                  }}
                  title="Automatically calculated based on start date and medication durations"
                />
                <small style={{ color: '#6c757d', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Automatically calculated from start date and medication durations
                </small>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                onClick={() => setShowCreateModal(false)}
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
                onClick={handleCreatePrescription}
                style={{
                  padding: '8px 16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing/printing prescription details */}
      {showModal && selectedPrescription && (
        <div
          className={isPrinting ? 'print-modal' : 'no-print'}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: isPrinting ? 'white' : 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: isPrinting ? 'flex-start' : 'center',
            zIndex: 9999, // Increased z-index to ensure it covers the sidebar
            padding: isPrinting ? '0' : '0',
          }}
        >
          <div
            className="prescription-content"
            style={{
              background: 'white',
              padding: isPrinting ? '20mm' : '30px',
              borderRadius: isPrinting ? '0' : '8px',
              width: isPrinting ? '100%' : '90%',
              maxWidth: isPrinting ? '100%' : '600px',
              maxHeight: isPrinting ? 'none' : 'calc(100vh - 104px)',
              overflow: isPrinting ? 'visible' : 'auto',
              boxShadow: isPrinting ? 'none' : '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            {/* Only show header and buttons when not printing */}
            {!isPrinting && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <h2 style={{ margin: 0 }}>Prescription Details</h2>
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
            )}

            <div className="prescription-template">
              <div
                className="prescription-header"
                style={{
                  textAlign: 'center',
                  marginBottom: '30px',
                  borderBottom: '2px solid #eee',
                  paddingBottom: '20px',
                }}
              >
                <h1 style={{ margin: '0 0 10px 0' }}>Medical Prescription</h1>
                <p style={{ margin: '5px 0' }}>MyHubCares</p>
                <p style={{ margin: '5px 0' }}>
                  123 Healthcare Street, Medical City
                </p>
              </div>

              <div
                className="prescription-info"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '30px',
                }}
              >
                <div>
                  <strong>Patient Information</strong>
                  <br />
                  Name: {selectedPrescription.patientName}
                  <br />
                  Age: {selectedPrescription.patientAge} years
                  <br />
                  Sex: {selectedPrescription.patientGender}
                </div>
                <div>
                  <strong>Prescription Details</strong>
                  <br />
                  Date: {selectedPrescription.prescriptionDate}
                  <br />
                  Rx No: {selectedPrescription.prescription_number || `RX-${String(selectedPrescription.id || selectedPrescription.prescription_id).padStart(6, '0')}`}
                  <br />
                  Next Refill: {selectedPrescription.nextRefill}
                </div>
              </div>

              <div
                className="prescription-section"
                style={{ marginBottom: '20px' }}
              >
                <h3 style={{ margin: '0 0 10px 0' }}>℞ Medications</h3>
                <div className="prescription-drugs">
                  {selectedPrescription.medications.map((med, index) => (
                    <div
                      key={index}
                      className="prescription-drug-item"
                      style={{
                        marginBottom: '15px',
                        paddingBottom: '10px',
                        borderBottom: '1px dashed #eee',
                      }}
                    >
                      <strong>
                        {index + 1}. {med.drugName}
                      </strong>
                      <br />
                      Sig: {med.dosage} {med.frequency}
                      <br />
                      Duration: {med.duration}
                      {med.instructions && (
                        <>
                          <br />
                          Instructions: {med.instructions}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="prescription-section"
                style={{ marginBottom: '20px' }}
              >
                <strong>Prescription Notes:</strong>
                <br />
                {selectedPrescription.prescriptionNotes || 'None'}
              </div>

              <div
                className="prescription-footer"
                style={{ marginTop: '40px', textAlign: 'right' }}
              >
                <div
                  className="prescription-signature"
                  style={{
                    display: 'inline-block',
                    textAlign: 'center',
                    width: '200px',
                  }}
                >
                  <div
                    className="prescription-signature-line"
                    style={{
                      borderBottom: '1px solid #333',
                      paddingBottom: '5px',
                      marginBottom: '5px',
                    }}
                  >
                    {selectedPrescription.physicianName}
                  </div>
                  <small>Prescribing Physician</small>
                </div>
              </div>
            </div>

            {/* Only show buttons when not printing */}
            {!isPrinting && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '20px',
                }}
              >
                <button
                  onClick={() => handleExportPDF(selectedPrescription)}
                  style={{
                    padding: '8px 16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Download size={16} />
                  Export PDF
                </button>
                <button
                  onClick={handlePrintFromModal}
                  style={{
                    padding: '8px 16px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Printer size={16} />
                  Print
                </button>
                <button
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
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dispense Medication Modal */}
      {showDispenseModal && selectedPrescription && (
        <div
          className="no-print"
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
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '700px',
              maxHeight: 'calc(100vh - 40px)',
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
              <h2 style={{ margin: 0 }}>Dispense Medication</h2>
              <button
                onClick={() => {
                  setShowDispenseModal(false);
                  setDispenseItems([]);
                  setInventoryAvailability({});
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

            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Patient:</strong> {selectedPrescription.patientName}
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Prescription #:</strong> {selectedPrescription.prescription_number || `RX-${String(selectedPrescription.id || selectedPrescription.prescription_id).padStart(6, '0')}`}
              </p>
              <p style={{ margin: '5px 0', fontSize: '14px' }}>
                <strong>Date:</strong> {selectedPrescription.prescriptionDate}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Medications to Dispense</h3>
              {dispenseItems.map((item, index) => {
                const availability = inventoryAvailability[item.medication_id];
                const isLowStock = availability && availability.quantity_on_hand <= availability.reorder_level;
                const isInsufficient = item.available_quantity < item.quantity_dispensed;
                
                return (
                  <div
                    key={index}
                    style={{
                      border: '1px solid #e9ecef',
                      borderRadius: '4px',
                      padding: '15px',
                      marginBottom: '15px',
                      background: isInsufficient ? '#fff3cd' : 'white',
                    }}
                  >
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ fontSize: '15px' }}>{item.medication_name}</strong>
                      {isLowStock && (
                        <span
                          style={{
                            marginLeft: '10px',
                            background: '#ffc107',
                            color: '#333',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Low Stock
                        </span>
                      )}
                      {item.available_quantity === 0 && (
                        <span
                          style={{
                            marginLeft: '10px',
                            background: '#dc3545',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Out of Stock
                        </span>
                      )}
                    </div>

                    <div style={{ marginBottom: '10px', fontSize: '14px', color: '#6c757d' }}>
                      <strong>Available:</strong> {item.available_quantity} {availability?.unit || 'units'}
                      {availability && availability.reorder_level > 0 && (
                        <span style={{ marginLeft: '15px' }}>
                          <strong>Reorder Level:</strong> {availability.reorder_level} {availability.unit}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                          }}
                        >
                          Quantity to Dispense <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={item.available_quantity}
                          value={item.quantity_dispensed}
                          onChange={(e) => {
                            const newItems = [...dispenseItems];
                            newItems[index].quantity_dispensed = parseInt(e.target.value) || 0;
                            setDispenseItems(newItems);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: isInsufficient ? '2px solid #dc3545' : '1px solid #ced4da',
                            borderRadius: '4px',
                          }}
                        />
                        {isInsufficient && (
                          <small style={{ color: '#dc3545', fontSize: '12px' }}>
                            Insufficient stock. Available: {item.available_quantity}
                          </small>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontSize: '14px',
                          }}
                        >
                          Batch Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={item.batch_number}
                          onChange={(e) => {
                            const newItems = [...dispenseItems];
                            newItems[index].batch_number = e.target.value;
                            setDispenseItems(newItems);
                          }}
                          placeholder="Enter batch number"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ced4da',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '5px',
                          fontSize: '14px',
                        }}
                      >
                        Notes (Optional)
                      </label>
                      <textarea
                        value={item.notes}
                        onChange={(e) => {
                          const newItems = [...dispenseItems];
                          newItems[index].notes = e.target.value;
                          setDispenseItems(newItems);
                        }}
                        placeholder="Enter dispensing notes"
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                onClick={() => {
                  setShowDispenseModal(false);
                  setDispenseItems([]);
                  setInventoryAvailability({});
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
                onClick={handleDispense}
                style={{
                  padding: '8px 16px',
                  background: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Dispense Medication
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor:
              toast.type === 'success'
                ? '#28a745'
                : toast.type === 'error'
                ? '#dc3545'
                : toast.type === 'warning'
                ? '#ff9800'
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
            zIndex: 9999, // Increased z-index to ensure it covers the sidebar
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

      {/* Print-specific styles */}
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
        
        @media print {
          /* Hide everything by default */
          * {
            visibility: hidden;
          }
          
          /* Show only the print modal and its content */
          .print-modal, .print-modal * {
            visibility: visible;
          }
          
          /* Ensure the modal covers the entire page */
          .print-modal {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            z-index: 999999 !important;
            background: white !important;
            display: block !important;
          }
          
          /* Make the prescription content fill the page */
          .prescription-content {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            padding: 20mm !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
            position: relative !important;
            overflow: visible !important;
          }
          
          /* Ensure the template has a white background */
          .prescription-template {
            background: white !important;
            color: black !important;
          }
          
          /* Make sure all text is black for better readability */
          .prescription-template * {
            color: black !important;
          }
          
          /* Set page margins and size */
          @page {
            margin: 20mm;
            size: A4;
          }
          
          /* Ensure the entire page has a white background */
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          
          /* Remove any borders or shadows that might show up */
          .prescription-header, .prescription-info, .prescription-section, .prescription-footer {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Prescriptions;