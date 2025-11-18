import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  X,
  Activity,
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const MedicationAdherence = () => {
  const [reminders, setReminders] = useState([]);
  const [adherenceRecords, setAdherenceRecords] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adherenceStats, setAdherenceStats] = useState({
    overallAdherence: 0,
    totalRecords: 0,
    takenRecords: 0,
    missedRecords: 0,
  });
  const [newReminder, setNewReminder] = useState({
    medication_name: '',
    dosage: '',
    frequency: 'daily',
    reminder_time: '09:00',
    active: true,
    browser_notifications: true,
    sound_preference: 'default',
    special_instructions: '',
    prescription_id: null,
  });
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  useEffect(() => {
    // Get current user from API
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const token = getAuthToken();
        if (!token) {
          setLoading(false);
          return;
        }

        // Try to fetch user from API
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            const user = data.user;
            setCurrentUser(user);
            
            // Get patient_id from nested patient object or direct property
            const patientId = user.patient?.patient_id || user.patient_id || user.patientId;
            
            if ((user.role === 'patient' || user.role === 'admin') && patientId) {
              loadReminders(patientId);
              loadPrescriptions();
              loadAdherenceRecords(patientId);
              if (user.role === 'patient') {
                startReminderCheck();
              }
            } else if (user.role === 'patient' && !patientId) {
              // Try to get patient profile
              const profileResponse = await fetch(`${API_BASE_URL}/profile/me`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                if (profileData.success && profileData.patient) {
                  const patientIdFromProfile = profileData.patient.patient_id;
                  if (patientIdFromProfile) {
                    loadReminders(patientIdFromProfile);
                    loadPrescriptions();
                    loadAdherenceRecords(patientIdFromProfile);
                    startReminderCheck();
                  }
                }
              }
            }
          }
        } else {
          // Fallback to localStorage
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
            
            const patientId = user.patient?.patient_id || user.patient_id || user.patientId;
            if ((user.role === 'patient' || user.role === 'admin') && patientId) {
              loadReminders(patientId);
              loadPrescriptions();
              loadAdherenceRecords(patientId);
              if (user.role === 'patient') {
                startReminderCheck();
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        // Fallback to localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          
          const patientId = user.patient?.patient_id || user.patient_id || user.patientId;
          if ((user.role === 'patient' || user.role === 'admin') && patientId) {
            loadReminders(patientId);
            loadPrescriptions();
            loadAdherenceRecords(patientId);
            if (user.role === 'patient') {
              startReminderCheck();
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
    
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    } else if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Reload prescriptions when currentUser changes
  useEffect(() => {
    if (currentUser) {
      loadPrescriptions();
    }
  }, [currentUser]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Step 1: Patient accesses → Load adherence records (reminders)
  const loadReminders = async (patientId) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      
      // Try to load reminders from prescriptions (reminders are created when medications are dispensed)
      // We'll derive reminders from active prescriptions
      const response = await fetch(`${API_BASE_URL}/prescriptions?patient_id=${patientId}&status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Build reminders from prescriptions
          const remindersFromPrescriptions = [];
          data.data.forEach(prescription => {
            if (prescription.items && prescription.items.length > 0) {
              prescription.items.forEach(item => {
                remindersFromPrescriptions.push({
                  reminder_id: `reminder-${prescription.prescription_id}-${item.prescription_item_id}`,
                  prescription_id: prescription.prescription_id,
                  patient_id: patientId,
                  medication_name: item.medication_name,
                  dosage: item.dosage,
                  frequency: item.frequency,
                  reminder_time: '09:00:00', // Default reminder time
                  active: prescription.status === 'active',
                  missed_doses: 0,
                  browser_notifications: true,
                });
              });
            }
          });
          
          // Merge with localStorage reminders
          const storedReminders = JSON.parse(localStorage.getItem('reminders')) || [];
          const userReminders = storedReminders.filter(r => 
            (r.patient_id || r.patientId) === patientId
          );
          
          // Combine both sources, prioritizing localStorage reminders
          const allReminders = [...remindersFromPrescriptions, ...userReminders];
          setReminders(allReminders);
        }
      } else {
        // Fallback to localStorage if API fails
        const storedReminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const userReminders = storedReminders.filter(r => 
          (r.patient_id || r.patientId) === patientId
        );
        setReminders(userReminders);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      // Fallback to localStorage
      try {
        const storedReminders = JSON.parse(localStorage.getItem('reminders')) || [];
        const userReminders = storedReminders.filter(r => r.patientId === patientId);
        setReminders(userReminders);
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPrescriptions = async () => {
    try {
      const token = getAuthToken();
      if (!currentUser) return;
      
      // Get patient_id from nested patient object or direct property
      const patientId = currentUser.patient?.patient_id || currentUser.patient_id || currentUser.patientId;
      if (!patientId) return;

      const response = await fetch(`${API_BASE_URL}/prescriptions?patient_id=${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPrescriptions(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    }
  };

  // Load adherence records for the patient
  const loadAdherenceRecords = async (patientId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/medication-adherence/patient/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAdherenceRecords(data.data || []);
          
          // Update adherence stats
          if (data.summary) {
            setAdherenceStats({
              overallAdherence: data.summary.overall_adherence_percentage || 0,
              totalRecords: data.summary.total_records || 0,
              takenRecords: data.summary.taken_records || 0,
              missedRecords: data.summary.missed_records || 0,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading adherence records:', error);
    }
  };

  const startReminderCheck = () => {
    // Check every minute
    const interval = setInterval(() => {
      checkReminders();
    }, 60000);

    // Also check immediately
    checkReminders();

    return () => clearInterval(interval);
  };

  const checkReminders = () => {
    if (!currentUser || (currentUser.role !== 'patient' && currentUser.role !== 'admin')) return;

    const activeReminders = reminders.filter(r => r.active);

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    activeReminders.forEach(reminder => {
      const reminderTime = reminder.reminder_time || reminder.time;
      const timeStr = reminderTime ? reminderTime.substring(0, 5) : null;
      const shouldNotify = reminder.browser_notifications !== false && reminder.enableNotifications !== false;
      
      if (timeStr === currentTime && shouldNotify) {
        // Check if we've already shown notification for this reminder today
        const notificationKey = `notification-${reminder.reminder_id || reminder.id}-${new Date().toDateString()}`;
        if (!localStorage.getItem(notificationKey)) {
          showNotification(reminder);
          localStorage.setItem(notificationKey, 'true');
        }
      }
    });
  };

  const showNotification = (reminder) => {
    const medicationName = reminder.medication_name || reminder.drugName;
    const reminderTime = reminder.reminder_time || reminder.time;
    
    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Medication Reminder', {
        body: `Time to take ${medicationName}${reminder.dosage ? ` (${reminder.dosage})` : ''}`,
        icon: '/favicon.ico',
        tag: `reminder-${reminder.reminder_id || reminder.id}`,
        requireInteraction: true,
        badge: '/favicon.ico',
      });

      // Auto-close notification after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }

      // Show in-app pop-up notification
      setToast({
        message: `⏰ Reminder: Time to take ${medicationName}${reminder.dosage ? ` (${reminder.dosage})` : ''}`,
        type: 'info',
      });

    // Play sound if enabled
    const shouldPlaySound = reminder.sound_preference !== 'none' || reminder.enableSound !== false;
    if (shouldPlaySound) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different frequencies based on sound preference
        if (reminder.sound_preference === 'urgent') {
          oscillator.frequency.value = 1000;
        } else if (reminder.sound_preference === 'gentle') {
          oscillator.frequency.value = 600;
        } else {
          oscillator.frequency.value = 800;
        }
        
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }
  };

  const getTimeRemaining = (reminderTime) => {
    if (!reminderTime) return 'N/A';
    
    const timeStr = reminderTime.substring(0, 5); // Get HH:MM format
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);

    const diff = reminderDate - now;
    const diffHours = Math.floor(Math.abs(diff) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((Math.abs(diff) % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) {
      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m ago`;
      } else {
        return `${diffMinutes}m ago`;
      }
    } else {
      if (diffHours > 0) {
        return `in ${diffHours}h ${diffMinutes}m`;
      } else {
        return `in ${diffMinutes}m`;
      }
    }
  };

  // Check if current time is near the reminder time (within 30 minutes before or after)
  const isTimeNearReminder = (reminderTime, timeWindowMinutes = 30) => {
    if (!reminderTime) return false;
    
    const timeStr = reminderTime.substring(0, 5); // Get HH:MM format
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);

    const diff = Math.abs(reminderDate - now);
    const diffMinutes = Math.floor(diff / (1000 * 60));
    
    // Allow clicking within the time window (before or after the scheduled time)
    return diffMinutes <= timeWindowMinutes;
  };

  // Step 2: Records adherence → Patient marks medication as taken/missed
  // Step 3: System calculates → Adherence percentage calculated automatically (backend)
  // Step 4: Adherence record created → Record saved with percentage
  const recordAdherence = async (reminder, taken, missedReason = null) => {
    try {
      // Prevent recording if time is not near the scheduled reminder time
      const reminderTime = reminder.reminder_time || reminder.time;
      if (!isTimeNearReminder(reminderTime)) {
        setToast({
          message: 'Cannot record adherence: Time is not near the scheduled medication time (must be within 30 minutes)',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      const token = getAuthToken();
      
      // For reminders without prescription_id, we'll save to localStorage only
      if (!reminder.prescription_id) {
        const patientId = currentUser.patient?.patient_id || currentUser.patient_id || currentUser.patientId;
        const today = new Date().toISOString().split('T')[0];
        
        // Save standalone reminder adherence to localStorage
        const standaloneAdherence = JSON.parse(localStorage.getItem('standaloneAdherence')) || [];
        const existingIndex = standaloneAdherence.findIndex(
          record => record.reminder_id === (reminder.reminder_id || reminder.id) &&
                    record.adherence_date === today
        );
        
        const adherenceRecord = {
          reminder_id: reminder.reminder_id || reminder.id,
          patient_id: patientId,
          medication_name: reminder.medication_name || reminder.drugName,
          adherence_date: today,
          taken: taken,
          missed_reason: missedReason,
        };
        
        if (existingIndex !== -1) {
          standaloneAdherence[existingIndex] = adherenceRecord;
        } else {
          standaloneAdherence.push(adherenceRecord);
        }
        
        localStorage.setItem('standaloneAdherence', JSON.stringify(standaloneAdherence));
        
        setToast({
          message: `Medication ${taken ? 'marked as taken' : 'marked as missed'} successfully`,
          type: 'success',
        });
        
        // Reload adherence records
        await loadAdherenceRecords(patientId);
        await loadReminders(patientId);
        setLoading(false);
        return;
      }
      
      // Find the prescription for this reminder
      const prescription = prescriptions.find(p => 
        p.prescription_id === reminder.prescription_id
      );

      if (!prescription) {
        setToast({
          message: 'Prescription not found for this reminder',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      const adherenceDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

      // Get patient_id from nested patient object or direct property
      const patientId = currentUser.patient?.patient_id || currentUser.patient_id || currentUser.patientId;
      if (!patientId) {
        setToast({
          message: 'Patient ID not found. Please log in again.',
          type: 'error',
        });
        return;
      }

      // Call API to record adherence
      const response = await fetch(`${API_BASE_URL}/medication-adherence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prescription_id: reminder.prescription_id,
          patient_id: patientId,
          adherence_date: adherenceDate,
          taken: taken,
          missed_reason: missedReason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: `Medication ${taken ? 'marked as taken' : 'marked as missed'} successfully. Adherence: ${data.data.adherence_percentage}%`,
          type: 'success',
        });

        // Step 5: Display updated → Progress rings and percentages updated
        // Get patient_id from nested patient object or direct property
        const patientId = currentUser.patient?.patient_id || currentUser.patient_id || currentUser.patientId;
        if (patientId) {
          // Reload adherence records to update display
          await loadAdherenceRecords(patientId);
          await loadReminders(patientId);

          // Step 6: ARPA impact → Risk score recalculated
          await recalculateARPARiskScore(patientId);
        }
      } else {
        setToast({
          message: data.message || 'Failed to record adherence',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error recording adherence:', error);
      setToast({
        message: 'Failed to record adherence: ' + error.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 6: ARPA impact → Risk score recalculated
  const recalculateARPARiskScore = async (patientId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/profile/${patientId}/calculate-arpa`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('ARPA risk score recalculated:', data.data);
          // Optionally show a subtle notification
        }
      }
    } catch (error) {
      console.error('Error recalculating ARPA risk score:', error);
      // Don't show error to user as this is a background operation
    }
  };

  const markAsTaken = (reminder) => {
    const reminderTime = reminder.reminder_time || reminder.time;
    if (!isTimeNearReminder(reminderTime)) {
      setToast({
        message: 'You can only mark as taken when the time is near the scheduled medication time (within 30 minutes)',
        type: 'error',
      });
      return;
    }
    recordAdherence(reminder, true);
  };

  const markAsMissed = (reminder) => {
    const reminderTime = reminder.reminder_time || reminder.time;
    if (!isTimeNearReminder(reminderTime)) {
      setToast({
        message: 'You can only mark as missed when the time is near the scheduled medication time (within 30 minutes)',
        type: 'error',
      });
      return;
    }
    const reason = window.prompt('Reason for missing dose (optional):');
    recordAdherence(reminder, false, reason || null);
  };

  // Save reminder (to localStorage for now, can be connected to API later)
  const saveReminder = async (reminderData, isEdit = false) => {
    try {
      const patientId = currentUser.patient?.patient_id || currentUser.patient_id || currentUser.patientId;
      if (!patientId) {
        setToast({
          message: 'Patient ID not found',
          type: 'error',
        });
        return;
      }

      // For now, save to localStorage (can be replaced with API call)
      const storedReminders = JSON.parse(localStorage.getItem('reminders')) || [];
      
      if (isEdit && editingReminder) {
        // Update existing reminder
        const index = storedReminders.findIndex(r => 
          (r.reminder_id || r.id) === (editingReminder.reminder_id || editingReminder.id)
        );
        if (index !== -1) {
          storedReminders[index] = {
            ...storedReminders[index],
            ...reminderData,
            reminder_id: editingReminder.reminder_id || editingReminder.id,
            patient_id: patientId,
            updated_at: new Date().toISOString(),
          };
        }
      } else {
        // Create new reminder
        const newReminderId = `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        storedReminders.push({
          ...reminderData,
          reminder_id: newReminderId,
          patient_id: patientId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          missed_doses: 0,
        });
      }

      localStorage.setItem('reminders', JSON.stringify(storedReminders));
      
      // Reload reminders
      await loadReminders(patientId);
      
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingReminder(null);
      setNewReminder({
        medication_name: '',
        dosage: '',
        frequency: 'daily',
        reminder_time: '09:00',
        active: true,
        browser_notifications: true,
        sound_preference: 'default',
        special_instructions: '',
        prescription_id: null,
      });
      
      setToast({
        message: `Reminder ${isEdit ? 'updated' : 'created'} successfully`,
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving reminder:', error);
      setToast({
        message: 'Failed to save reminder: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleAddReminder = () => {
    if (!newReminder.medication_name) {
      setToast({
        message: 'Please enter a medication name',
        type: 'error',
      });
      return;
    }
    saveReminder(newReminder, false);
  };

  const handleUpdateReminder = () => {
    if (!editingReminder.medication_name) {
      setToast({
        message: 'Please enter a medication name',
        type: 'error',
      });
      return;
    }
    saveReminder(editingReminder, true);
  };

  const handleDeleteReminder = (reminderId) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    try {
      const patientId = currentUser.patient?.patient_id || currentUser.patient_id || currentUser.patientId;
      const storedReminders = JSON.parse(localStorage.getItem('reminders')) || [];
      const filtered = storedReminders.filter(r => 
        (r.reminder_id || r.id) !== reminderId
      );
      localStorage.setItem('reminders', JSON.stringify(filtered));
      
      loadReminders(patientId);
      setShowEditModal(false);
      setEditingReminder(null);
      
      setToast({
        message: 'Reminder deleted successfully',
        type: 'success',
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      setToast({
        message: 'Failed to delete reminder',
        type: 'error',
      });
    }
  };

  // Get unique medications from prescriptions
  const getPrescribedMedications = () => {
    const medications = [];
    const seen = new Set();

    prescriptions.forEach(prescription => {
      if (prescription.items && prescription.items.length > 0) {
        prescription.items.forEach(item => {
          const key = `${item.medication_name}-${item.dosage || ''}-${item.frequency || ''}`;
          if (!seen.has(key) && item.medication_name) {
            seen.add(key);
            medications.push({
              medication_name: item.medication_name,
              dosage: item.dosage,
              frequency: item.frequency,
              prescription_id: prescription.prescription_id,
              prescription_item_id: item.prescription_item_id,
            });
          }
        });
      }
    });

    return medications;
  };

  // Handle medication selection - auto-fill dosage and frequency
  const handleMedicationSelect = (medicationName, isEdit = false) => {
    const medications = getPrescribedMedications();
    const selectedMedication = medications.find(m => m.medication_name === medicationName);

    if (selectedMedication) {
      if (isEdit) {
        setEditingReminder({
          ...editingReminder,
          medication_name: selectedMedication.medication_name,
          dosage: selectedMedication.dosage || editingReminder.dosage,
          frequency: selectedMedication.frequency || editingReminder.frequency,
          prescription_id: selectedMedication.prescription_id,
        });
      } else {
        setNewReminder({
          ...newReminder,
          medication_name: selectedMedication.medication_name,
          dosage: selectedMedication.dosage || '',
          frequency: selectedMedication.frequency || 'daily',
          prescription_id: selectedMedication.prescription_id,
        });
      }
    } else {
      // If not found in prescriptions, just update the name
      if (isEdit) {
        setEditingReminder({
          ...editingReminder,
          medication_name: medicationName,
        });
      } else {
        setNewReminder({
          ...newReminder,
          medication_name: medicationName,
        });
      }
    }
  };

  // Calculate adherence percentage for a specific reminder
  const getReminderAdherence = (reminder) => {
    if (!reminder.prescription_id) return null;
    
    const prescriptionAdherence = adherenceRecords.filter(
      record => record.prescription_id === reminder.prescription_id
    );

    if (prescriptionAdherence.length === 0) return null;

    const takenCount = prescriptionAdherence.filter(r => r.taken).length;
    const totalCount = prescriptionAdherence.length;
    const percentage = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

    return {
      percentage,
      takenCount,
      totalCount,
    };
  };

  // Step 5: Display updated → Progress rings and percentages updated
  const renderAdherenceCard = () => {
    const activeReminders = reminders.filter(r => r.active);
    const overallAdherence = adherenceStats.overallAdherence;

    let adherenceClass = 'success';
    if (overallAdherence < 95) adherenceClass = 'warning';
    if (overallAdherence < 80) adherenceClass = 'danger';

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
              {activeReminders.length}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Active Reminders
            </div>
          </div>
          <div style={{ fontSize: '24px', color: '#007bff' }}>
            <Bell />
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
              {overallAdherence.toFixed(1)}%
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Overall Adherence Rate
            </div>
          </div>
          <div style={{ fontSize: '24px', color: adherenceClass === 'success' ? '#28a745' : adherenceClass === 'warning' ? '#ffc107' : '#dc3545' }}>
            <Activity />
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
              {adherenceStats.takenRecords}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Taken Doses
            </div>
          </div>
          <div style={{ fontSize: '24px', color: '#28a745' }}>
            <Check />
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
              {adherenceStats.missedRecords}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Missed Doses
            </div>
          </div>
          <div style={{ fontSize: '24px', color: '#ffc107' }}>
            <AlertCircle />
          </div>
        </div>
      </div>
    );
  };

  const renderReminderList = () => {
    if (reminders.length === 0) {
      return (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          No medication reminders set. Create one to get started!
        </p>
      );
    }

    const activeReminders = reminders.filter(r => r.active);
    if (activeReminders.length === 0) {
      return (
        <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
          No active reminders
        </p>
      );
    }

    return activeReminders.map(reminder => {
      const reminderTime = reminder.reminder_time || reminder.time;
      const timeRemaining = getTimeRemaining(reminderTime);
      const isOverdue = timeRemaining.includes('ago');
      const adherence = getReminderAdherence(reminder);
      const medicationName = reminder.medication_name || reminder.drugName;

      // Check if today's dose was already recorded
      const today = new Date().toISOString().split('T')[0];
      let todayRecord = null;
      
      if (reminder.prescription_id) {
        // Check by prescription_id from API records
        todayRecord = adherenceRecords.find(
          record => record.prescription_id === reminder.prescription_id &&
                    record.adherence_date === today
        );
      } else {
        // For standalone reminders, check localStorage
        const standaloneAdherence = JSON.parse(localStorage.getItem('standaloneAdherence')) || [];
        const record = standaloneAdherence.find(
          record => (record.reminder_id === (reminder.reminder_id || reminder.id)) &&
                    record.adherence_date === today
        );
        if (record) {
          todayRecord = {
            taken: record.taken,
            adherence_date: record.adherence_date,
          };
        }
      }
      
      // Check if reminder is for daily frequency and if today's record exists
      const isDaily = (reminder.frequency || '').toLowerCase().includes('daily') || 
                     (reminder.frequency || '').toLowerCase().includes('once');
      const canRecordToday = !todayRecord && isDaily;
      
      // Check if current time is near the reminder time
      const isNearTime = isTimeNearReminder(reminderTime);
      const canClickButtons = canRecordToday && isNearTime;

      return (
        <div
          key={reminder.reminder_id || reminder.id}
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: isOverdue ? '4px solid #dc3545' : '4px solid #28a745',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{medicationName}</h4>
            <p style={{ margin: '0 0 8px 0', color: '#6c757d', fontSize: '14px' }}>
              {reminder.dosage && `Dosage: ${reminder.dosage} | `}
              Frequency: {reminder.frequency || 'daily'} at {reminderTime ? reminderTime.substring(0, 5) : 'N/A'}
            </p>
            {adherence && (
              <p style={{ margin: '0 0 8px 0', color: '#6c757d', fontSize: '12px' }}>
                Adherence: {adherence.percentage}% ({adherence.takenCount}/{adherence.totalCount} doses)
              </p>
            )}
            {reminder.missed_doses > 0 && (
              <p style={{ margin: '0 0 8px 0', color: '#dc3545', fontSize: '12px' }}>
                Total missed doses: {reminder.missed_doses}
              </p>
            )}
            {todayRecord && (
              <p style={{ margin: '0 0 8px 0', color: todayRecord.taken ? '#28a745' : '#dc3545', fontSize: '12px', fontWeight: 'bold' }}>
                Today: {todayRecord.taken ? '✓ Taken' : '✗ Missed'}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right', marginLeft: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
              {reminderTime ? reminderTime.substring(0, 5) : 'N/A'}
            </div>
            <div style={{ fontSize: '14px', color: isOverdue ? '#dc3545' : '#28a745', marginBottom: '12px' }}>
              {timeRemaining}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              {!todayRecord && canRecordToday && (
                <>
                  <button
                    onClick={() => markAsTaken(reminder)}
                    disabled={loading || !isNearTime}
                    style={{
                      padding: '6px 12px',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (loading || !isNearTime) ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: (loading || !isNearTime) ? 0.6 : 1,
                    }}
                    title={!isNearTime ? 'You can only mark as taken when the time is near the scheduled medication time (within 30 minutes)' : ''}
                  >
                    <Check size={12} />
                    Taken
                  </button>
                  <button
                    onClick={() => markAsMissed(reminder)}
                    disabled={loading || !isNearTime}
                    style={{
                      padding: '6px 12px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: (loading || !isNearTime) ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: (loading || !isNearTime) ? 0.6 : 1,
                    }}
                    title={!isNearTime ? 'You can only mark as missed when the time is near the scheduled medication time (within 30 minutes)' : ''}
                  >
                    <AlertCircle size={12} />
                    Missed
                  </button>
                </>
              )}
              {todayRecord && (
                <div style={{
                  padding: '6px 12px',
                  background: todayRecord.taken ? '#28a745' : '#dc3545',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}>
                  {todayRecord.taken ? '✓ Recorded Today' : '✗ Missed Today'}
                </div>
              )}
              {!canRecordToday && !todayRecord && (
                <div style={{
                  padding: '6px 12px',
                  background: '#6c757d',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}>
                  Not due today
                </div>
              )}
              {canRecordToday && !todayRecord && !isNearTime && (
                <div style={{
                  padding: '6px 12px',
                  background: '#ffc107',
                  color: '#856404',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                }}>
                  Wait until near scheduled time (within 30 min)
                </div>
              )}
              <button
                onClick={() => {
                  setEditingReminder(reminder);
                  setShowEditModal(true);
                }}
                style={{
                  padding: '6px 12px',
                  background: '#6c757d',
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
            </div>
          </div>
        </div>
      );
    });
  };

  // Show loading state while fetching user
  if (loading && !currentUser) {
    return (
      <div style={{ padding: '20px', paddingTop: '80px' }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          borderRadius: '4px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  // Check if user is a patient
  if (!currentUser) {
    return (
      <div style={{ padding: '20px', paddingTop: '80px' }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Please log in to view your medication adherence
        </div>
      </div>
    );
  }

  // Get patient_id to check if user has patient data
  const patientId = currentUser.patient?.patient_id || currentUser.patient_id || currentUser.patientId;
  
  if (currentUser.role !== 'patient' && currentUser.role !== 'admin') {
    return (
      <div style={{ padding: '20px', paddingTop: '80px' }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          This page is only available for patients and administrators
        </div>
      </div>
    );
  }

  if (!patientId && currentUser.role === 'patient') {
    return (
      <div style={{ padding: '20px', paddingTop: '80px' }}>
        <div style={{
          padding: '15px',
          backgroundColor: '#fff3cd',
          color: '#856404',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Patient profile not found. Please contact your administrator.
        </div>
      </div>
    );
  }

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
            Medication Adherence
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
            Track your medication adherence and view your progress
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
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
          Add Reminder
        </button>
      </div>

      {/* Adherence Card - Step 5: Display updated → Progress rings and percentages updated */}
      {renderAdherenceCard()}

      {/* Today's Medications */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '30px',
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #dee2e6',
          background: '#f8f9fa',
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
            Medication Reminders
          </h3>
        </div>
        <div style={{ padding: '20px' }}>
          {loading ? (
            <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
              Loading...
            </p>
          ) : (
            renderReminderList()
          )}
        </div>
      </div>

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
                : toast.type === 'info'
                ? '#17a2b8'
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

      {/* Add Reminder Modal */}
      {showAddModal && (
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
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: 'calc(100vh - 40px)',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Add Medication Reminder</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewReminder({
                    medication_name: '',
                    dosage: '',
                    frequency: 'daily',
                    reminder_time: '09:00',
                    active: true,
                    browser_notifications: true,
                    sound_preference: 'default',
                    special_instructions: '',
                    prescription_id: null,
                  });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                }}
              >
                <X size={24} color="#6c757d" />
              </button>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Medication Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                list="medicationSuggestions"
                value={newReminder.medication_name}
                onChange={(e) => handleMedicationSelect(e.target.value, false)}
                placeholder="Select or type medication name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
                required
              />
              <datalist id="medicationSuggestions">
                {getPrescribedMedications().map((med, index) => (
                  <option key={index} value={med.medication_name}>
                    {med.medication_name} {med.dosage ? `(${med.dosage})` : ''} - {med.frequency || 'daily'}
                  </option>
                ))}
              </datalist>
              {getPrescribedMedications().length === 0 && (
                <p style={{ marginTop: '5px', fontSize: '12px', color: '#6c757d' }}>
                  No prescriptions found. You can type a medication name manually.
                </p>
              )}
              {getPrescribedMedications().length > 0 && (
                <p style={{ marginTop: '5px', fontSize: '12px', color: '#6c757d' }}>
                  Select from your prescribed medications or type manually
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Dosage
                </label>
                <input
                  type="text"
                  value={newReminder.dosage}
                  onChange={(e) => setNewReminder({...newReminder, dosage: e.target.value})}
                  placeholder="e.g., 500mg"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Frequency <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={newReminder.frequency}
                  onChange={(e) => setNewReminder({...newReminder, frequency: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="twice daily">Twice Daily</option>
                  <option value="three times daily">Three Times Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Reminder Time <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="time"
                value={newReminder.reminder_time}
                onChange={(e) => setNewReminder({...newReminder, reminder_time: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Sound Preference
              </label>
              <select
                value={newReminder.sound_preference}
                onChange={(e) => setNewReminder({...newReminder, sound_preference: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
              >
                <option value="default">Default</option>
                <option value="gentle">Gentle</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newReminder.browser_notifications}
                  onChange={(e) => setNewReminder({...newReminder, browser_notifications: e.target.checked})}
                  style={{ cursor: 'pointer' }}
                />
                <span>Enable browser notifications</span>
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newReminder.active}
                  onChange={(e) => setNewReminder({...newReminder, active: e.target.checked})}
                  style={{ cursor: 'pointer' }}
                />
                <span>Active</span>
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Special Instructions (Optional)
              </label>
              <textarea
                value={newReminder.special_instructions}
                onChange={(e) => setNewReminder({...newReminder, special_instructions: e.target.value})}
                rows="3"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewReminder({
                    medication_name: '',
                    dosage: '',
                    frequency: 'daily',
                    reminder_time: '09:00',
                    active: true,
                    browser_notifications: true,
                    sound_preference: 'default',
                    special_instructions: '',
                    prescription_id: null,
                  });
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
                onClick={handleAddReminder}
                style={{
                  padding: '8px 16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Create Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reminder Modal */}
      {showEditModal && editingReminder && (
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
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: 'calc(100vh - 40px)',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Edit Reminder</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingReminder(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                }}
              >
                <X size={24} color="#6c757d" />
              </button>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Medication Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                list="medicationSuggestionsEdit"
                value={editingReminder.medication_name || editingReminder.drugName || ''}
                onChange={(e) => handleMedicationSelect(e.target.value, true)}
                placeholder="Select or type medication name"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
                required
              />
              <datalist id="medicationSuggestionsEdit">
                {getPrescribedMedications().map((med, index) => (
                  <option key={index} value={med.medication_name}>
                    {med.medication_name} {med.dosage ? `(${med.dosage})` : ''} - {med.frequency || 'daily'}
                  </option>
                ))}
              </datalist>
              {getPrescribedMedications().length === 0 && (
                <p style={{ marginTop: '5px', fontSize: '12px', color: '#6c757d' }}>
                  No prescriptions found. You can type a medication name manually.
                </p>
              )}
              {getPrescribedMedications().length > 0 && (
                <p style={{ marginTop: '5px', fontSize: '12px', color: '#6c757d' }}>
                  Select from your prescribed medications or type manually
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Dosage
                </label>
                <input
                  type="text"
                  value={editingReminder.dosage || ''}
                  onChange={(e) => setEditingReminder({...editingReminder, dosage: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Frequency <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={editingReminder.frequency || 'daily'}
                  onChange={(e) => setEditingReminder({...editingReminder, frequency: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                  }}
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="twice daily">Twice Daily</option>
                  <option value="three times daily">Three Times Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Reminder Time <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="time"
                value={editingReminder.reminder_time ? editingReminder.reminder_time.substring(0, 5) : editingReminder.time ? editingReminder.time.substring(0, 5) : '09:00'}
                onChange={(e) => setEditingReminder({...editingReminder, reminder_time: e.target.value + ':00', time: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editingReminder.active !== false}
                  onChange={(e) => setEditingReminder({...editingReminder, active: e.target.checked})}
                  style={{ cursor: 'pointer' }}
                />
                <span>Active</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => handleDeleteReminder(editingReminder.reminder_id || editingReminder.id)}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingReminder(null);
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
                onClick={handleUpdateReminder}
                style={{
                  padding: '8px 16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationAdherence;
