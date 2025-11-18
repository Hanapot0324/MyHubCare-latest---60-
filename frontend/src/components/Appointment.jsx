import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Trash2 } from 'lucide-react';
import { AccessTime, LocationOn, LocalHospital } from '@mui/icons-material';

const API_BASE_URL = 'http://localhost:5000/api';

const Appointments = ({ socket }) => {
    const [appointments, setAppointments] = useState([]);
    const [filteredAppointments, setFilteredAppointments] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    
    // For form dropdowns
    const [patients, setPatients] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [providers, setProviders] = useState([]);
    
    // Current user info
    const [currentUser, setCurrentUser] = useState(null);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [currentPatientId, setCurrentPatientId] = useState(null);

    // Notifications
    const [notifications, setNotifications] = useState([]);

    // Get auth token
    const getAuthToken = () => {
        return localStorage.getItem('token');
    };

    useEffect(() => {
        getCurrentUser();
        fetchAppointments();
        fetchPatients();
        fetchFacilities();
        fetchProviders();
    }, []);

    // Set up interval to refresh appointments and notifications in real-time
    useEffect(() => {
        // Initial fetch
        const refreshData = () => {
            fetchAppointments();
            // Optionally fetch notifications if needed
        };

        // Set interval to refresh every 30 seconds (30000ms)
        const intervalId = setInterval(refreshData, 30000);

        // Cleanup interval on component unmount
        return () => {
            clearInterval(intervalId);
        };
    }, []);

    // Join patient room for real-time notifications
    useEffect(() => {
        if (socket && currentPatientId) {
            socket.emit('joinPatientRoom', currentPatientId);
            console.log('Joined patient room:', currentPatientId);
        }
    }, [socket, currentPatientId]);

    // Listen for real-time appointment notifications
    useEffect(() => {
        if (!socket) return;

        // Listen for new appointments
        socket.on('newAppointment', (data) => {
            console.log('📅 New appointment notification:', data);
            
            // Add notification
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'appointment',
                message: data.message,
                appointment: data.appointment,
                timestamp: data.timestamp
            }]);

            // Show toast notification
            setToast({
                message: data.message,
                type: 'success'
            });

            // Refresh appointments list
            fetchAppointments();
        });

        // Listen for patient-specific appointment notifications
        socket.on('appointmentNotification', (data) => {
            console.log('📅 Patient appointment notification:', data);
            
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: 'appointment',
                message: data.message,
                appointment: data.appointment,
                timestamp: data.timestamp
            }]);

            setToast({
                message: data.message,
                type: 'success'
            });

            fetchAppointments();
        });

        return () => {
            socket.off('newAppointment');
            socket.off('appointmentNotification');
        };
    }, [socket]);

    // Get current user info
    const getCurrentUser = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    const user = data.user;
                    setCurrentUser(user);
                    setCurrentUserRole(user.role);
                    
                    // If user is a patient, get their patient_id
                    if (user.role === 'patient') {
                        // Try to get patient_id from nested patient object or direct property
                        const patientId = user.patient?.patient_id || user.patient_id || null;
                        
                        // If not found, try to fetch from profile endpoint
                        if (!patientId) {
                            try {
                                const profileResponse = await fetch(`${API_BASE_URL}/profile/me`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                if (profileResponse.ok) {
                                    const profileData = await profileResponse.json();
                                    if (profileData.success && profileData.patient) {
                                        setCurrentPatientId(profileData.patient.patient_id);
                                    }
                                }
                            } catch (err) {
                                console.error('Error fetching patient profile:', err);
                            }
                        } else {
                            setCurrentPatientId(patientId);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
    };

    useEffect(() => {
        if (selectedDay) {
            filterAppointmentsByDay(selectedDay);
        } else {
            setFilteredAppointments([]);
        }
    }, [selectedDay, appointments]);

    // Auto-hide toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();
            if (!token) {
                setToast({
                    message: 'Please login to view appointments',
                    type: 'error'
                });
                return;
            }

            const response = await fetch(`${API_BASE_URL}/appointments`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setAppointments(data.data || []);
            } else {
                throw new Error(data.message || 'Failed to fetch appointments');
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
            setToast({
                message: 'Failed to fetch appointments: ' + error.message,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchPatients = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/patients?status=active`, {
                headers: { Authorization: `Bearer ${token}` }
            });

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

    const fetchFacilities = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/facilities`, {
                headers: { Authorization: `Bearer ${token}` }
            });

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

    const fetchProviders = async () => {
        try {
            const token = getAuthToken();
            if (!token) return;

            // Try new providers endpoint first
            let response = await fetch(`${API_BASE_URL}/users/providers`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // If new endpoint doesn't exist (404) or access denied (403), fallback to old endpoint
            if (!response.ok && (response.status === 404 || response.status === 403)) {
                response = await fetch(`${API_BASE_URL}/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            if (!response.ok) {
                console.error('Failed to fetch providers:', response.status);
                setProviders([]);
                return;
            }

            const data = await response.json();
            let providersArray = [];
            
            // New endpoint returns { success: true, providers: [...] }
            if (data.success && data.providers) {
                providersArray = data.providers;
            } 
            // Old endpoint returns { success: true, users: [...] }
            else if (data.success && data.users) {
                // Only fetch physicians/doctors
                providersArray = data.users.filter(u => 
                    u.role?.toLowerCase() === 'physician'
                );
            } else if (Array.isArray(data)) {
                // Only fetch physicians/doctors
                providersArray = data.filter(u => 
                    u.role?.toLowerCase() === 'physician'
                );
            } else if (data.users && Array.isArray(data.users)) {
                // Handle case where response has users but no success flag
                providersArray = data.users.filter(u => 
                    u.role?.toLowerCase() === 'physician'
                );
            }

            console.log('Fetched providers (physicians only):', providersArray.length);
            setProviders(providersArray);
        } catch (error) {
            console.error('Error fetching providers:', error);
            setProviders([]);
        }
    };

    const filterAppointmentsByDay = (day) => {
        if (!day) {
            setFilteredAppointments([]);
            return;
        }
        
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const filtered = appointments.filter(apt => {
            const aptDate = new Date(apt.scheduled_start);
            const aptDateStr = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}-${String(aptDate.getDate()).padStart(2, '0')}`;
            return aptDateStr === dateStr;
        });
        
        setFilteredAppointments(filtered);
    };

    // Calendar functions
    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const navigateMonth = (direction) => {
        setCurrentMonth(prev => {
            const newMonth = new Date(prev);
            if (direction === 'prev') {
                newMonth.setMonth(prev.getMonth() - 1);
            } else {
                newMonth.setMonth(prev.getMonth() + 1);
            }
            return newMonth;
        });
        setSelectedDay(null);
    };

    const handleDayClick = (day) => {
        setSelectedDay(day);
    };

    const getAppointmentsForDay = (day) => {
        if (!day) return [];
        
        const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return appointments.filter(apt => {
            const aptDate = new Date(apt.scheduled_start);
            const aptDateStr = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}-${String(aptDate.getDate()).padStart(2, '0')}`;
            return aptDateStr === dateStr;
        });
    };

    const handleEditAppointment = (appointment) => {
        setSelectedAppointment(appointment);
        setShowEditModal(true);
    };

    const handleDeleteAppointment = async (appointmentId) => {
        if (window.confirm('Are you sure you want to cancel this appointment?')) {
            try {
                const token = getAuthToken();
                const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cancellation_reason: 'Cancelled by user'
                    })
                });

                const data = await response.json();

                if (data.success) {
                    await fetchAppointments();
                    setToast({
                        message: 'Appointment cancelled successfully',
                        type: 'success'
                    });
                } else {
                    throw new Error(data.message || 'Failed to cancel appointment');
                }
            } catch (error) {
                console.error('Error cancelling appointment:', error);
                setToast({
                    message: 'Failed to cancel appointment: ' + error.message,
                    type: 'error'
                });
            }
        }
    };

    const checkAvailability = async (facility_id, provider_id, scheduled_start, scheduled_end) => {
        try {
            const token = getAuthToken();
            const params = new URLSearchParams({
                facility_id,
                scheduled_start,
                scheduled_end
            });
            if (provider_id) {
                params.append('provider_id', provider_id);
            }

            const response = await fetch(`${API_BASE_URL}/appointments/availability/check?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await response.json();
            return data.success && data.data?.available === true;
        } catch (error) {
            console.error('Error checking availability:', error);
            return false;
        }
    };

    const handleAddAppointment = async (newAppointment) => {
        try {
            const token = getAuthToken();
            
            // Convert form data to API format (MySQL DATETIME format: YYYY-MM-DD HH:MM:SS)
            const scheduledStart = `${newAppointment.appointmentDate} ${newAppointment.appointmentTime}:00`;
            const scheduledEnd = calculateEndTime(newAppointment.appointmentDate, newAppointment.appointmentTime, newAppointment.duration_minutes || 30);

            // Check availability before creating
            const isAvailable = await checkAvailability(
                newAppointment.facility_id,
                newAppointment.provider_id || null,
                scheduledStart,
                scheduledEnd
            );

            if (!isAvailable) {
                setToast({
                    message: 'The selected time slot is not available. Please choose another time.',
                    type: 'error'
                });
                return;
            }

            const appointmentData = {
                patient_id: newAppointment.patient_id,
                provider_id: newAppointment.provider_id || null,
                facility_id: newAppointment.facility_id,
                appointment_type: newAppointment.appointment_type,
                scheduled_start: scheduledStart,
                scheduled_end: scheduledEnd,
                duration_minutes: newAppointment.duration_minutes || 30,
                reason: newAppointment.reason || null,
                notes: newAppointment.notes || null
            };

            const response = await fetch(`${API_BASE_URL}/appointments`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appointmentData)
            });

            const data = await response.json();

            if (data.success) {
                await fetchAppointments();
                setShowAddModal(false);
                setToast({
                    message: 'Appointment booked successfully',
                    type: 'success'
                });
            } else {
                throw new Error(data.message || 'Failed to create appointment');
            }
        } catch (error) {
            console.error('Error creating appointment:', error);
            setToast({
                message: 'Failed to book appointment: ' + error.message,
                type: 'error'
            });
        }
    };

    const handleUpdateAppointment = async (updatedAppointment) => {
        try {
            const token = getAuthToken();
            
            // Convert form data to API format (MySQL DATETIME format: YYYY-MM-DD HH:MM:SS)
            const scheduledStart = `${updatedAppointment.appointmentDate} ${updatedAppointment.appointmentTime}:00`;
            const appointmentData = {
                provider_id: updatedAppointment.provider_id || null,
                facility_id: updatedAppointment.facility_id,
                appointment_type: updatedAppointment.appointment_type,
                scheduled_start: scheduledStart,
                scheduled_end: calculateEndTime(updatedAppointment.appointmentDate, updatedAppointment.appointmentTime, updatedAppointment.duration_minutes || 30),
                duration_minutes: updatedAppointment.duration_minutes || 30,
                reason: updatedAppointment.reason || null,
                notes: updatedAppointment.notes || null
            };

            const response = await fetch(`${API_BASE_URL}/appointments/${selectedAppointment.appointment_id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appointmentData)
            });

            const data = await response.json();

            if (data.success) {
                await fetchAppointments();
                setShowEditModal(false);
                setSelectedAppointment(null);
                setToast({
                    message: 'Appointment updated successfully',
                    type: 'success'
                });
            } else {
                throw new Error(data.message || 'Failed to update appointment');
            }
        } catch (error) {
            console.error('Error updating appointment:', error);
            setToast({
                message: 'Failed to update appointment: ' + error.message,
                type: 'error'
            });
        }
    };

    const calculateEndTime = (date, startTime, durationMinutes) => {
        // Parse date and time components
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = startTime.split(':').map(Number);
        
        // Create date in local timezone
        const start = new Date(year, month - 1, day, hours, minutes, 0);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        
        // Format as MySQL DATETIME: YYYY-MM-DD HH:MM:SS
        const endYear = end.getFullYear();
        const endMonth = String(end.getMonth() + 1).padStart(2, '0');
        const endDay = String(end.getDate()).padStart(2, '0');
        const endHours = String(end.getHours()).padStart(2, '0');
        const endMins = String(end.getMinutes()).padStart(2, '0');
        const endSecs = String(end.getSeconds()).padStart(2, '0');
        
        return `${endYear}-${endMonth}-${endDay} ${endHours}:${endMins}:${endSecs}`;
    };

    const formatAppointmentType = (type) => {
        return type
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
        const today = new Date();
        const isCurrentMonth = today.getMonth() === currentMonth.getMonth() && 
                             today.getFullYear() === currentMonth.getFullYear();
        const todayDate = today.getDate();
        
        const days = [];
        const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        
        // Add weekday headers
        const weekDayElements = weekDays.map(day => (
            <div key={day} style={{
                textAlign: 'center',
                fontWeight: 'bold',
                padding: '10px 0',
                color: '#6c757d',
                fontSize: '14px',
                borderBottom: '1px solid #e9ecef'
            }}>
                {day}
            </div>
        ));
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} style={{ padding: '15px 0' }}></div>);
        }
        
        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayAppointments = getAppointmentsForDay(day);
            const isToday = isCurrentMonth && day === todayDate;
            const isSelected = selectedDay === day;
            
            days.push(
                <div 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    style={{
                        padding: '10px',
                        height: '80px',
                        border: isToday ? '2px solid #007bff' : '1px solid #e9ecef',
                        borderRadius: '4px',
                        backgroundColor: isSelected ? '#e7f3ff' : 'white',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        if (!isSelected) {
                            e.target.style.backgroundColor = '#f8f9fa';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isSelected) {
                            e.target.style.backgroundColor = 'white';
                        }
                    }}
                >
                    <div style={{
                        fontWeight: isToday ? 'bold' : 'normal',
                        color: isToday ? '#007bff' : '#333',
                        marginBottom: '5px'
                    }}>
                        {day}
                    </div>
                    {dayAppointments.length > 0 && (
                        <div style={{
                            fontSize: '11px',
                            color: '#6c757d',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {dayAppointments.length > 1 ? 
                                `${dayAppointments.length} appointments` : 
                                formatAppointmentType(dayAppointments[0].appointment_type)
                            }
                        </div>
                    )}
                    {dayAppointments.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            bottom: '5px',
                            right: '5px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: dayAppointments.some(a => a.status === 'scheduled' || a.status === 'confirmed') ? '#28a745' : '#dc3545'
                        }}></div>
                    )}
                </div>
            );
        }
        
        return [...weekDayElements, ...days];
    };

    const renderAppointmentList = (appointmentsList) => {
        if (appointmentsList.length === 0) {
            return (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#6c757d'
                }}>
                    <p>No appointments scheduled for this day</p>
                </div>
            );
        }

        return appointmentsList.map(apt => {
            const startDate = new Date(apt.scheduled_start);
            const endDate = new Date(apt.scheduled_end);
            
            // Check if current user can edit this appointment (for full editing)
            const canEdit = (currentUserRole === 'physician' || currentUserRole === 'case_manager' || currentUserRole === 'admin') &&
                           (apt.status === 'scheduled' || apt.status === 'confirmed' || 
                            apt.status === 'pending_provider_confirmation' || apt.status === 'pending_patient_confirmation');
            
            // Check if user can edit provider (always true for authorized users)
            const canEditProvider = currentUserRole === 'physician' || currentUserRole === 'case_manager' || currentUserRole === 'admin';
            
            // All appointments are clickable (for viewing/editing)
            const isClickable = true;

            return (
                <div 
                    key={apt.appointment_id} 
                    style={{
                        background: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        marginBottom: '15px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s ease',
                        cursor: isClickable ? 'pointer' : 'default'
                    }}
                    onClick={() => {
                        if (canEdit) {
                            handleEditAppointment(apt);
                        } else if (isClickable) {
                            // Even if can't edit, allow viewing by opening edit modal in view mode
                            // or we can create a view-only modal, but for now let's allow edit modal
                            handleEditAppointment(apt);
                        }
                    }}
                    onMouseEnter={(e) => {
                        if (isClickable) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                            if (canEdit) {
                                e.currentTarget.style.border = '1px solid #007bff';
                            } else {
                                e.currentTarget.style.border = '1px solid #6c757d';
                            }
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        e.currentTarget.style.border = 'none';
                    }}
                >
                    <div>
                        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                            {apt.patient_name || 'N/A'}
                        </h3>
                        <strong style={{ color: '#007bff' }}>
                            {startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </strong>
                        <div style={{ marginTop: '8px', color: '#6c757d' }}>
                            <span style={{ marginRight: '15px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AccessTime fontSize="small" /> {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span style={{ marginRight: '15px', display: 'flex', alignItems: 'center', gap: '4px' }}><LocationOn fontSize="small" /> {apt.facility_name || 'N/A'}</span>
                            {apt.provider_name && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><LocalHospital fontSize="small" /> {apt.provider_name}</span>
                            )}
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: '#17a2b8',
                                color: 'white',
                                fontSize: '12px',
                                marginRight: '8px'
                            }}>
                                {formatAppointmentType(apt.appointment_type)}
                            </span>
                            <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: apt.status === 'scheduled' || apt.status === 'confirmed' ? '#007bff' : 
                                          apt.status === 'completed' ? '#28a745' : 
                                          apt.status === 'cancelled' ? '#dc3545' : '#6c757d',
                                color: 'white',
                                fontSize: '12px'
                            }}>
                                {apt.status.toUpperCase()}
                            </span>
                        </div>
                        {apt.notes && (
                            <div style={{ marginTop: '10px', color: '#6c757d', fontSize: '14px' }}>
                                <strong>Notes:</strong> {apt.notes}
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: '15px' }}>
                        {/* Show Edit button for authorized users, Cancel button only if canEdit */}
                        {canEditProvider && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the parent's onClick
                                    handleEditAppointment(apt);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    marginRight: '8px',
                                    background: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#0056b3'}
                                onMouseLeave={(e) => e.target.style.background = '#007bff'}
                            >
                                Edit
                            </button>
                        )}
                        {canEdit && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the parent's onClick
                                    handleDeleteAppointment(apt.appointment_id);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    background: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#c82333'}
                                onMouseLeave={(e) => e.target.style.background = '#dc3545'}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            );
        });
    };

    return (
        <div style={{ padding: '20px' }}>
            {/* Header with Title */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#333' }}>Appointment Calendar</h2>
                <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>Manage and view your appointments</p>
            </div>

            {/* 2-Column Layout */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px',
                alignItems: 'start'
            }}>
                {/* Left Column - Calendar */}
                <div style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '20px' 
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button 
                                onClick={() => navigateMonth('prev')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    marginRight: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '5px',
                                    borderRadius: '4px',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                                onMouseLeave={(e) => e.target.style.background = 'none'}
                            >
                                <ChevronLeft size={20} color="#007bff" />
                            </button>
                            <h3 style={{ margin: 0, color: '#333' }}>
                                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button 
                                onClick={() => navigateMonth('next')}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    marginLeft: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '5px',
                                    borderRadius: '4px',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                                onMouseLeave={(e) => e.target.style.background = 'none'}
                            >
                                <ChevronRight size={20} color="#007bff" />
                            </button>
                        </div>
                        {/* Only show Book Appointment button for physicians, case managers, and admins */}
                        {(currentUserRole === 'physician' || currentUserRole === 'case_manager' || currentUserRole === 'admin') && (
                            <button 
                                onClick={() => setShowAddModal(true)}
                                style={{
                                    padding: '8px 16px',
                                    background: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#0056b3'}
                                onMouseLeave={(e) => e.target.style.background = '#007bff'}
                            >
                                Book Appointment
                            </button>
                        )}
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '5px'
                    }}>
                        {renderCalendar()}
                    </div>
                </div>

                {/* Right Column - Appointments List */}
                <div style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    maxHeight: 'calc(100vh - 200px)',
                    overflowY: 'auto'
                }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                            {selectedDay ? (
                                `Appointments for ${currentMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                            ) : (
                                'Select a date to view appointments'
                            )}
                        </h3>
                        {selectedDay && (
                            <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                                {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} scheduled
                            </p>
                        )}
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                            Loading appointments...
                        </div>
                    ) : (
                        renderAppointmentList(filteredAppointments)
                    )}
                </div>
            </div>

            {/* Add Appointment Modal */}
            {showAddModal && (
                <AppointmentModal
                    mode="add"
                    patients={patients}
                    facilities={facilities}
                    providers={providers}
                    currentUserRole={currentUserRole}
                    currentPatientId={currentPatientId}
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddAppointment}
                />
            )}

            {/* Edit Appointment Modal */}
            {showEditModal && selectedAppointment && (
                <AppointmentModal
                    mode="edit"
                    appointment={selectedAppointment}
                    patients={patients}
                    facilities={facilities}
                    providers={providers}
                    currentUserRole={currentUserRole}
                    currentPatientId={currentPatientId}
                    canEdit={currentUserRole === 'physician' || currentUserRole === 'case_manager' || currentUserRole === 'admin'}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedAppointment(null);
                    }}
                    onSave={handleUpdateAppointment}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <div style={{
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
                    animation: 'slideIn 0.3s ease',
                    zIndex: 9999
                }}>
                    {toast.type === 'success' ? (
                        <Check size={20} />
                    ) : (
                        <Trash2 size={20} />
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

const AppointmentModal = ({ mode, appointment, patients, facilities, providers, currentUserRole, currentPatientId, canEdit = true, onClose, onSave }) => {
    // Helper to parse MySQL DATETIME format
    const parseDateTime = (dateTimeString) => {
        if (!dateTimeString) return { date: '', time: '' };
        // Handle both ISO format and MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) {
            // Try parsing MySQL format directly
            const parts = dateTimeString.split(' ');
            if (parts.length === 2) {
                return {
                    date: parts[0],
                    time: parts[1].slice(0, 5)
                };
            }
            return { date: '', time: '' };
        }
        return {
            date: date.toISOString().split('T')[0],
            time: date.toTimeString().slice(0, 5)
        };
    };

    const parsedDateTime = appointment ? parseDateTime(appointment.scheduled_start) : { date: '', time: '' };

    // If user is a patient and it's add mode, auto-select their patient_id (dropdown will be hidden)
    const initialPatientId = mode === 'add' && currentUserRole?.toLowerCase() === 'patient' && currentPatientId 
        ? currentPatientId 
        : (appointment ? appointment.patient_id : '');

    // Only show provider field for physician and case_manager roles
    const canEditProvider = currentUserRole === 'physician' || currentUserRole === 'case_manager' || currentUserRole === 'admin';
    
    // Determine if form should be editable
    // In add mode: all fields are editable
    // In edit mode: only provider field is editable, all other fields are read-only
    const isEditable = mode === 'add' ? true : false;
    const canEditProviderField = mode === 'add' ? true : (canEdit && canEditProvider);

    const [formData, setFormData] = useState(
        appointment ? {
            patient_id: appointment.patient_id,
            provider_id: appointment.provider_id || '',
            facility_id: appointment.facility_id,
            appointment_type: appointment.appointment_type,
            appointmentDate: parsedDateTime.date,
            appointmentTime: parsedDateTime.time,
            duration_minutes: appointment.duration_minutes || 30,
            reason: appointment.reason || '',
            notes: appointment.notes || ''
        } : {
            patient_id: initialPatientId,
            provider_id: '',
            facility_id: '',
            appointment_type: '',
            appointmentDate: '',
            appointmentTime: '',
            duration_minutes: 30,
            reason: '',
            notes: ''
        }
    );
    
    // Get patient name for display when patient dropdown is hidden
    const getPatientName = () => {
        if (currentUserRole?.toLowerCase() === 'patient' && currentPatientId) {
            const patient = patients.find(p => p.patient_id === currentPatientId);
            if (patient) {
                return `${patient.first_name} ${patient.last_name}${patient.uic ? ` (${patient.uic})` : ''}`;
            }
        }
        return null;
    };

    // Update patient_id when currentPatientId becomes available (for patient users)
    useEffect(() => {
        if (mode === 'add' && currentUserRole?.toLowerCase() === 'patient' && currentPatientId && !formData.patient_id) {
            setFormData(prev => ({
                ...prev,
                patient_id: currentPatientId
            }));
        }
    }, [currentPatientId, currentUserRole, mode, formData.patient_id]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Allow submission if form is editable OR if provider field can be edited
        if (!isEditable && !canEditProviderField) {
            return;
        }
        // Ensure patient_id is set for patient users (dropdown is hidden for them)
        if (currentUserRole?.toLowerCase() === 'patient' && currentPatientId) {
            onSave({ ...formData, patient_id: currentPatientId });
        } else {
            onSave(formData);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div style={{
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
            paddingTop: '64px'
        }}>
            <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: 'calc(100vh - 104px)',
                overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>
                        {mode === 'add' ? 'Book Appointment' : (isEditable ? 'Edit Appointment' : 'View Appointment')}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '5px',
                            borderRadius: '4px',
                            transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                        <X size={24} color="#6c757d" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Patient <span style={{ color: 'red' }}>*</span>
                        </label>
                        {currentUserRole?.toLowerCase() === 'patient' ? (
                            // If user is a patient, show read-only patient name (no dropdown)
                            <div style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                backgroundColor: '#f8f9fa',
                                color: '#495057',
                                cursor: 'not-allowed'
                            }}>
                                {getPatientName() || 'Loading...'}
                            </div>
                        ) : (
                            // If user is not a patient, show dropdown
                            <select 
                                name="patient_id"
                                value={formData.patient_id}
                                onChange={handleChange}
                                required
                                disabled={mode === 'edit' || !isEditable}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px',
                                    backgroundColor: !isEditable ? '#f8f9fa' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <option value="">Select Patient</option>
                                {patients.map(patient => (
                                    <option key={patient.patient_id} value={patient.patient_id}>
                                        {patient.first_name} {patient.last_name} {patient.uic ? `(${patient.uic})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Date <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input 
                                type="date"
                                name="appointmentDate"
                                value={formData.appointmentDate}
                                onChange={handleChange}
                                required
                                disabled={!isEditable}
                                min={new Date().toISOString().split('T')[0]}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px',
                                    backgroundColor: !isEditable ? '#f8f9fa' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Time <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input 
                                type="time"
                                name="appointmentTime"
                                value={formData.appointmentTime}
                                onChange={handleChange}
                                required
                                disabled={!isEditable}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px',
                                    backgroundColor: !isEditable ? '#f8f9fa' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Facility <span style={{ color: 'red' }}>*</span>
                        </label>
                        <select 
                            name="facility_id"
                            value={formData.facility_id}
                            onChange={handleChange}
                            required
                            disabled={!isEditable}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                backgroundColor: !isEditable ? '#f8f9fa' : 'white',
                                cursor: !isEditable ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <option value="">Select Facility</option>
                            {facilities.map(facility => (
                                <option key={facility.facility_id} value={facility.facility_id}>
                                    {facility.facility_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Only show provider field for physician and case_manager roles */}
                    {canEditProvider && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Provider
                            </label>
                            <select 
                                name="provider_id"
                                value={formData.provider_id}
                                onChange={handleChange}
                                disabled={!canEditProviderField}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px',
                                    backgroundColor: !canEditProviderField ? '#f8f9fa' : 'white',
                                    cursor: !canEditProviderField ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <option value="">Select Provider (Optional)</option>
                                {providers.map(provider => (
                                    <option key={provider.user_id} value={provider.user_id}>
                                        {provider.full_name || provider.username} ({provider.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Appointment Type <span style={{ color: 'red' }}>*</span>
                            </label>
                            <select 
                                name="appointment_type"
                                value={formData.appointment_type}
                                onChange={handleChange}
                                required
                                disabled={!isEditable}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px',
                                    backgroundColor: !isEditable ? '#f8f9fa' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <option value="">Select Type</option>
                                <option value="initial">Initial Consultation</option>
                                <option value="follow_up">Follow-up Consultation</option>
                                <option value="art_pickup">ART Pickup</option>
                                <option value="lab_test">Lab Test</option>
                                <option value="counseling">Counseling</option>
                                <option value="general">General</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Duration (minutes)
                            </label>
                            <input 
                                type="number"
                                name="duration_minutes"
                                value={formData.duration_minutes}
                                onChange={handleChange}
                                min="15"
                                max="240"
                                step="15"
                                disabled={!isEditable}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px',
                                    backgroundColor: !isEditable ? '#f8f9fa' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Reason
                        </label>
                        <input 
                            type="text"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            disabled={!isEditable}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                backgroundColor: !isEditable ? '#f8f9fa' : 'white',
                                cursor: !isEditable ? 'not-allowed' : 'text'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Notes
                        </label>
                        <textarea 
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="3"
                            disabled={!isEditable}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontFamily: 'inherit',
                                backgroundColor: !isEditable ? '#f8f9fa' : 'white',
                                cursor: !isEditable ? 'not-allowed' : 'text'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
                                transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#5a6268'}
                            onMouseLeave={(e) => e.target.style.background = '#6c757d'}
                        >
                            {isEditable ? 'Cancel' : 'Close'}
                        </button>
                        {(isEditable || canEditProviderField) && (
                            <button 
                                type="submit"
                                style={{
                                    padding: '8px 16px',
                                    background: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#0056b3'}
                                onMouseLeave={(e) => e.target.style.background = '#007bff'}
                            >
                                {mode === 'add' ? 'Book Appointment' : 'Update Provider'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Appointments;
