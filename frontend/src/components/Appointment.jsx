import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Trash2, Calendar, Clock, User, MapPin, Filter } from 'lucide-react';
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
    const [viewMode, setViewMode] = useState('calendar'); // calendar or list
    
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
                color: '#A31D1D',
                fontSize: '14px',
                borderBottom: '2px solid #ECDCBF'
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
            const hasAppointments = dayAppointments.length > 0;
            
            // Get scheduled times for display (only show active appointments)
            const activeAppointments = dayAppointments.filter(a => 
                a.status === 'scheduled' || 
                a.status === 'confirmed' || 
                a.status === 'pending_provider_confirmation' || 
                a.status === 'pending_patient_confirmation'
            );
            
            days.push(
                <div 
                    key={day} 
                    onClick={() => handleDayClick(day)}
                    style={{
                        padding: '10px',
                        height: '80px',
                        border: isToday ? '2px solid #D84040' : '1px solid #ECDCBF',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#F8F2DE' : 'white',
                        cursor: hasAppointments ? 'pointer' : 'default', // Only show pointer if there are appointments
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 8px rgba(216, 64, 64, 0.15)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                        // Only show hover effect if there are appointments
                        if (hasAppointments && !isSelected) {
                            e.target.style.backgroundColor = '#F8F2DE';
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (hasAppointments && !isSelected) {
                            e.target.style.backgroundColor = 'white';
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                        }
                    }}
                >
                    <div style={{
                        fontWeight: isToday ? 'bold' : 'normal',
                        color: isToday ? '#D84040' : '#A31D1D',
                        marginBottom: '5px',
                        fontSize: '16px'
                    }}>
                        {day}
                    </div>
                    {hasAppointments && (
                        <div style={{
                            fontSize: '11px',
                            color: '#A31D1D',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: '500',
                            marginBottom: '3px'
                        }}>
                            {dayAppointments.length > 1 ? 
                                `${dayAppointments.length} appointments` : 
                                formatAppointmentType(dayAppointments[0].appointment_type)
                            }
                        </div>
                    )}
                    {/* Show green time indicators for scheduled appointments */}
                    {activeAppointments.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '2px',
                            marginTop: '2px'
                        }}>
                            {activeAppointments.slice(0, 3).map((apt, idx) => {
                                const startDate = new Date(apt.scheduled_start);
                                const timeStr = startDate.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false 
                                });
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            backgroundColor: '#28a745',
                                            color: 'white',
                                            fontSize: '9px',
                                            padding: '2px 4px',
                                            borderRadius: '3px',
                                            fontWeight: '600',
                                            lineHeight: '1.2'
                                        }}
                                        title={`${timeStr} - ${apt.patient_name || 'Appointment'}`}
                                    >
                                        {timeStr}
                                    </div>
                                );
                            })}
                            {activeAppointments.length > 3 && (
                                <div style={{
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    fontSize: '9px',
                                    padding: '2px 4px',
                                    borderRadius: '3px',
                                    fontWeight: '600'
                                }}>
                                    +{activeAppointments.length - 3}
                                </div>
                            )}
                        </div>
                    )}
                    {/* Status indicator dot */}
                    {hasAppointments && (
                        <div style={{
                            position: 'absolute',
                            bottom: '5px',
                            right: '5px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: activeAppointments.length > 0 ? '#28a745' : (
                                dayAppointments.some(a => 
                                    a.status === 'cancelled' || 
                                    a.status === 'rejected'
                                ) ? '#dc3545' : '#ECDCBF'
                            )
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
                    color: '#A31D1D',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Calendar size={48} style={{ marginBottom: '16px', color: '#ECDCBF' }} />
                    <p style={{ color: '#A31D1D' }}>No appointments scheduled for this day</p>
                </div>
            );
        }

        return appointmentsList.map(apt => {
            const startDate = new Date(apt.scheduled_start);
            const endDate = new Date(apt.scheduled_end);
            
            // Check if current user can edit this appointment (for full editing)
            // Admin cannot delete appointments, so exclude admin from canEdit for delete button
            const canEdit = (currentUserRole === 'physician' || currentUserRole === 'case_manager') &&
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
                        borderRadius: '12px',
                        marginBottom: '15px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                        transition: 'all 0.2s ease',
                        cursor: isClickable ? 'pointer' : 'default',
                        border: '1px solid #F8F2DE',
                        position: 'relative',
                        overflow: 'hidden'
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
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
                            if (canEdit) {
                                e.currentTarget.style.borderLeft = '4px solid #D84040';
                            } else {
                                e.currentTarget.style.borderLeft = '4px solid #ECDCBF';
                            }
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderLeft = '1px solid #F8F2DE';
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        backgroundColor: (apt.status === 'scheduled' || 
                                         apt.status === 'confirmed' || 
                                         apt.status === 'pending_provider_confirmation' || 
                                         apt.status === 'pending_patient_confirmation') ? '#28a745' : 
                                        (apt.status === 'cancelled' || apt.status === 'rejected') ? '#dc3545' : 
                                        apt.status === 'completed' ? '#A31D1D' : '#ECDCBF'
                    }}></div>
                    <div style={{ marginLeft: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#A31D1D', fontSize: '18px', fontWeight: 'bold' }}>
                                {apt.patient_name || 'N/A'}
                            </h3>
                            <span style={{
                                padding: '4px 8px',
                                borderRadius: '20px',
                                background: (apt.status === 'scheduled' || 
                                            apt.status === 'confirmed' || 
                                            apt.status === 'pending_provider_confirmation' || 
                                            apt.status === 'pending_patient_confirmation') ? '#28a745' : 
                                           (apt.status === 'cancelled' || apt.status === 'rejected') ? '#dc3545' : 
                                           apt.status === 'completed' ? '#A31D1D' : '#ECDCBF',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}>
                                {apt.status.toUpperCase()}
                            </span>
                        </div>
                        <div style={{ marginBottom: '10px', color: '#A31D1D', fontWeight: '500', fontSize: '15px' }}>
                            {startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#A31D1D' }}>
                                <Clock size={16} />
                                <span>{startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#A31D1D' }}>
                                <MapPin size={16} />
                                <span>{apt.facility_name || 'N/A'}</span>
                            </div>
                            {apt.provider_name && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#A31D1D' }}>
                                    <User size={16} />
                                    <span>{apt.provider_name}</span>
                                </div>
                            )}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: '#F8F2DE',
                                color: '#A31D1D',
                                fontSize: '12px',
                                fontWeight: '500'
                            }}>
                                {formatAppointmentType(apt.appointment_type)}
                            </span>
                        </div>
                        {apt.notes && (
                            <div style={{ color: '#A31D1D', fontSize: '14px', marginTop: '10px' }}>
                                <strong>Notes:</strong> {apt.notes}
                            </div>
                        )}
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: '10px', 
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: '1px solid #F8F2DE'
                    }}>
                        {/* Show Edit button for authorized users, Cancel button only if canEdit */}
                        {canEditProvider && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the parent's onClick
                                    handleEditAppointment(apt);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    background: '#D84040',
                                    color: 'white',
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
                                    e.target.style.background = '#A31D1D';
                                    e.target.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = '#D84040';
                                    e.target.style.transform = 'translateY(0)';
                                }}
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
                                    background: '#A31D1D',
                                    color: 'white',
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
                                    e.target.style.background = '#D84040';
                                    e.target.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = '#A31D1D';
                                    e.target.style.transform = 'translateY(0)';
                                }}
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
        <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '100vh', paddingTop: '100px' }}>
            {/* Header with Title */}
            <div style={{ 
                marginBottom: '30px', 
                background: 'linear-gradient(to right, #D84040, #A31D1D)', 
                padding: '30px', 
                borderRadius: '12px', 
                boxShadow: '0 4px 15px rgba(216, 64, 64, 0.2)' 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>Appointment Calendar</h2>
                        <p style={{ margin: 0, color: '#F8F2DE', fontSize: '16px' }}>Manage and view your appointments</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
                            style={{
                                padding: '10px 16px',
                                background: viewMode === 'calendar' ? '#ECDCBF' : 'white',
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
                                e.target.style.background = viewMode === 'calendar' ? '#F8F2DE' : '#F8F2DE';
                                e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = viewMode === 'calendar' ? '#ECDCBF' : 'white';
                                e.target.style.transform = 'translateY(0)';
                            }}
                        >
                            {viewMode === 'calendar' ? <Filter size={16} /> : <Calendar size={16} />}
                            {viewMode === 'calendar' ? 'List View' : 'Calendar View'}
                        </button>
                        {/* Only show Book Appointment button for physicians, case managers, and admins */}
                        {(currentUserRole === 'physician' || currentUserRole === 'case_manager' || currentUserRole === 'admin') && (
                            <button 
                                onClick={() => setShowAddModal(true)}
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
                                <Calendar size={16} />
                                Book Appointment
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2-Column Layout */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: viewMode === 'calendar' ? '1fr 1fr' : '1fr', 
                gap: '20px',
                alignItems: 'start'
            }}>
                {/* Left Column - Calendar */}
                {viewMode === 'calendar' && (
                    <div style={{ 
                        background: 'white', 
                        padding: '20px', 
                        borderRadius: '12px', 
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                        border: '1px solid #F8F2DE'
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
                                        borderRadius: '50%',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = '#F8F2DE';
                                        e.target.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'none';
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                >
                                    <ChevronLeft size={20} color="#D84040" />
                                </button>
                            <h3 style={{ margin: 0, color: '#A31D1D', fontSize: '18px', fontWeight: 'bold' }}>
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
                                        borderRadius: '50%',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = '#F8F2DE';
                                        e.target.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'none';
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                >
                                    <ChevronRight size={20} color="#D84040" />
                                </button>
                            </div>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '5px'
                        }}>
                            {renderCalendar()}
                        </div>
                    </div>
                )}

                {/* Right Column - Appointments List */}
                <div style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    maxHeight: viewMode === 'calendar' ? 'calc(100vh - 300px)' : 'calc(100vh - 200px)',
                    overflowY: 'auto',
                    border: '1px solid #F8F2DE'
                }}>
                    <div style={{ marginBottom: '20px', borderBottom: '2px solid #ECDCBF', paddingBottom: '15px' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#A31D1D', fontSize: '18px', fontWeight: 'bold' }}>
                            {selectedDay ? (
                                `Appointments for ${currentMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                            ) : viewMode === 'calendar' ? (
                                'Select a date to view appointments'
                            ) : (
                                'All Appointments'
                            )}
                        </h3>
                        {selectedDay && (
                            <p style={{ margin: 0, color: '#A31D1D', fontSize: '14px' }}>
                                {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} scheduled
                            </p>
                        )}
                    </div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#A31D1D' }}>
                            <div className="spinner" style={{
                                border: '4px solid #F8F2DE',
                                borderTop: '4px solid #D84040',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 15px'
                            }}></div>
                            Loading appointments...
                        </div>
                    ) : (
                        renderAppointmentList(viewMode === 'calendar' ? filteredAppointments : appointments)
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
                    backgroundColor: toast.type === 'success' ? '#28a745' : '#A31D1D',
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
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
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
                borderRadius: '12px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: 'calc(100vh - 104px)',
                overflow: 'auto',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                border: '1px solid #F8F2DE'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '20px', 
                    borderBottom: '1px solid #F8F2DE', 
                    paddingBottom: '15px' 
                }}>
                    <h2 style={{ margin: 0, color: '#A31D1D' }}>
                        {mode === 'add' ? 'Book Appointment' : (isEditable ? 'Edit Appointment' : 'View Appointment')}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '5px',
                            borderRadius: '50%',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = '#F8F2DE';
                            e.target.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'none';
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        <X size={24} color="#A31D1D" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#A31D1D' }}>
                            Patient <span style={{ color: 'red' }}>*</span>
                        </label>
                        {currentUserRole?.toLowerCase() === 'patient' ? (
                            // If user is a patient, show read-only patient name (no dropdown)
                            <div style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #F8F2DE',
                                borderRadius: '6px',
                                backgroundColor: '#F8F2DE',
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
                                    padding: '12px',
                                    border: '1px solid #F8F2DE',
                                    borderRadius: '6px',
                                    backgroundColor: !isEditable ? '#F8F2DE' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer',
                                    fontSize: '16px'
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#A31D1D' }}>
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
                                    padding: '12px',
                                    border: '1px solid #F8F2DE',
                                    borderRadius: '6px',
                                    backgroundColor: !isEditable ? '#F8F2DE' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer',
                                    fontSize: '16px'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#A31D1D' }}>
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
                                    padding: '12px',
                                    border: '1px solid #F8F2DE',
                                    borderRadius: '6px',
                                    backgroundColor: !isEditable ? '#F8F2DE' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer',
                                    fontSize: '16px'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#A31D1D' }}>
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
                                padding: '12px',
                                border: '1px solid #F8F2DE',
                                borderRadius: '6px',
                                backgroundColor: !isEditable ? '#F8F2DE' : 'white',
                                cursor: !isEditable ? 'not-allowed' : 'pointer',
                                fontSize: '16px'
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
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#A31D1D' }}>
                                Provider
                            </label>
                            <select 
                                name="provider_id"
                                value={formData.provider_id}
                                onChange={handleChange}
                                disabled={!canEditProviderField}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    border: '1px solid #F8F2DE',
                                    borderRadius: '6px',
                                    backgroundColor: !canEditProviderField ? '#F8F2DE' : 'white',
                                    cursor: !canEditProviderField ? 'not-allowed' : 'pointer',
                                    fontSize: '16px'
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

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#A31D1D' }}>
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
                                    padding: '12px',
                                    border: '1px solid #F8F2DE',
                                    borderRadius: '6px',
                                    backgroundColor: !isEditable ? '#F8F2DE' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer',
                                    fontSize: '16px'
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
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#A31D1D' }}>
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
                                    padding: '12px',
                                    border: '1px solid #F8F2DE',
                                    borderRadius: '6px',
                                    backgroundColor: !isEditable ? '#F8F2DE' : 'white',
                                    cursor: !isEditable ? 'not-allowed' : 'pointer',
                                    fontSize: '16px'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#A31D1D' }}>
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
                                padding: '12px',
                                border: '1px solid #F8F2DE',
                                borderRadius: '6px',
                                backgroundColor: !isEditable ? '#F8F2DE' : 'white',
                                cursor: !isEditable ? 'not-allowed' : 'text',
                                fontSize: '16px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#A31D1D' }}>
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
                                padding: '12px',
                                border: '1px solid #F8F2DE',
                                borderRadius: '6px',
                                fontFamily: 'inherit',
                                backgroundColor: !isEditable ? '#F8F2DE' : 'white',
                                cursor: !isEditable ? 'not-allowed' : 'text',
                                fontSize: '16px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: '10px', 
                        paddingTop: '20px', 
                        borderTop: '1px solid #F8F2DE' 
                    }}>
                        <button 
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: '#ECDCBF',
                                color: '#A31D1D',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontWeight: '500'
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
                            {isEditable ? 'Cancel' : 'Close'}
                        </button>
                        {(isEditable || canEditProviderField) && (
                            <button 
                                type="submit"
                                style={{
                                    padding: '10px 20px',
                                    background: '#D84040',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    fontWeight: '500'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.background = '#A31D1D';
                                    e.target.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.background = '#D84040';
                                    e.target.style.transform = 'translateY(0)';
                                }}
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