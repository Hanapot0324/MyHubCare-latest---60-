import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../widgets/appointment_reminder_card.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({Key? key}) : super(key: key);

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  List<dynamic> _appointments = [];
  bool _isLoading = true;
  List<dynamic> _patients = [];
  List<dynamic> _facilities = [];
  List<dynamic> _providers = [];

  @override
  void initState() {
    super.initState();
    _loadAppointments();
    _loadFormData();
  }

  Future<void> _loadFormData() async {
    try {
      final patientsResult = await ApiService.getPatients();
      final facilitiesResult = await ApiService.getFacilities();
      final providersResult = await ApiService.getProviders();
      
      if (patientsResult['success'] == true) {
        setState(() => _patients = patientsResult['data'] ?? []);
      }
      if (facilitiesResult['success'] == true) {
        setState(() => _facilities = facilitiesResult['data'] ?? []);
      }
      if (providersResult['success'] == true) {
        setState(() => _providers = providersResult['data'] ?? []);
      }
    } catch (e) {
      // Handle error
    }
  }

  Future<void> _loadAppointments() async {
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getAppointments();
      if (result['success'] == true) {
        setState(() {
          _appointments = result['data'] as List;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        // Show error message with more details
        final errorMessage = result['message'] ?? 'Failed to load appointments';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading appointments: ${e.toString()}'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 4),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('My Appointments'),
        backgroundColor: Color(0xFFB82132),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _appointments.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadAppointments,
                  child: ListView.builder(
                    padding: EdgeInsets.all(16),
                    itemCount: _appointments.length,
                    itemBuilder: (context, index) {
                      return _buildAppointmentCard(_appointments[index]);
                    },
                  ),
                ),
      floatingActionButton: FloatingActionButton(
        heroTag: "appointments_fab",
        onPressed: () => _showBookAppointmentModal(),
        backgroundColor: Color(0xFFB82132),
        child: Icon(Icons.add),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('📅', style: TextStyle(fontSize: 64)),
          SizedBox(height: 20),
          Text(
            'No appointments scheduled',
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
          SizedBox(height: 10),
          ElevatedButton(
            onPressed: () => _showBookAppointmentModal(),
            child: Text('Book Appointment'),
          ),
        ],
      ),
    );
  }

  Widget _buildAppointmentCard(Map<String, dynamic> apt) {
    final date = DateTime.parse(apt['scheduled_start']);
    final endDate = DateTime.parse(apt['scheduled_end']);

    return Container(
      margin: EdgeInsets.only(bottom: 16),
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _showAppointmentDetails(apt),
        child: Row(
          children: [
            Container(
              width: 60,
              padding: EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Color(0xFFB82132),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Text(
                    '${date.day}',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    DateFormat('MMM').format(date),
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(width: 15),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _formatAppointmentType(apt['appointment_type'] ?? ''),
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 6),
                  Text(
                    '🕐 ${DateFormat('HH:mm').format(date)} - ${DateFormat('HH:mm').format(endDate)}',
                    style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  SizedBox(height: 4),
                  Text(
                    '🏥 ${apt['facility_name'] ?? 'N/A'}',
                    style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (apt['provider_name'] != null) ...[
                    SizedBox(height: 4),
                    Text(
                      '👨‍⚕️ ${apt['provider_name']}',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  SizedBox(height: 8),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(apt['status'] ?? 'scheduled'),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      (apt['status'] ?? 'scheduled').toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'scheduled':
      case 'confirmed':
        return Color(0xFF2563EB);
      case 'completed':
        return Color(0xFF10B981);
      case 'cancelled':
        return Color(0xFFEF4444);
      default:
        return Colors.grey;
    }
  }

  String _formatAppointmentType(String type) {
    return type.split('_').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
  }

  void _showBookAppointmentModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _BookAppointmentModal(
        patients: _patients,
        facilities: _facilities,
        providers: _providers,
        onAppointmentBooked: () {
          _loadAppointments();
        },
      ),
    );
  }

  void _showAppointmentDetails(Map<String, dynamic> appointment) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: SingleChildScrollView(
          child: AppointmentReminderCard(appointment: appointment),
        ),
      ),
    );
  }
}

class _BookAppointmentModal extends StatefulWidget {
  final List<dynamic> patients;
  final List<dynamic> facilities;
  final List<dynamic> providers;
  final VoidCallback onAppointmentBooked;

  const _BookAppointmentModal({
    Key? key,
    required this.patients,
    required this.facilities,
    required this.providers,
    required this.onAppointmentBooked,
  }) : super(key: key);

  @override
  State<_BookAppointmentModal> createState() => __BookAppointmentModalState();
}

class __BookAppointmentModalState extends State<_BookAppointmentModal> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedPatientId;
  String? _selectedFacilityId;
  String? _selectedProviderId;
  String? _selectedType;
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  int _durationMinutes = 30;
  final _reasonController = TextEditingController();
  final _notesController = TextEditingController();
  bool _isSubmitting = false;
  bool _isLoadingUser = true;
  String? _currentUserRole;
  String? _patientName;

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();
    // Update patient name when patients list is available
    if (widget.patients.isNotEmpty && _selectedPatientId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _updatePatientName(_selectedPatientId);
      });
    }
  }

  @override
  void didUpdateWidget(_BookAppointmentModal oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Update patient name when patients list changes
    if (widget.patients.isNotEmpty && _selectedPatientId != null && _patientName == null) {
      _updatePatientName(_selectedPatientId);
    }
  }

  Future<void> _loadCurrentUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userStr = prefs.getString('user');
      String? patientId;
      String? userRole;
      
      if (userStr != null) {
        final user = jsonDecode(userStr);
        userRole = user['role']?.toLowerCase();
        setState(() => _currentUserRole = userRole);
        
        // If user is a patient, get their patient_id
        if (userRole == 'patient') {
          patientId = user['patient_id']?.toString() ?? 
                     user['patient']?['patient_id']?.toString();
        }
      }
      
      // If not found in local storage, try API
      if (patientId == null || userRole == null) {
        final result = await ApiService.getCurrentUser();
        if (result['success'] == true && result['user'] != null) {
          final user = result['user'];
          userRole = user['role']?.toLowerCase();
          setState(() => _currentUserRole = userRole);
          
          if (userRole == 'patient') {
            patientId = user['patient']?['patient_id']?.toString() ?? 
                        user['patient_id']?.toString();
          }
        }
      }
      
      // If still not found and user is a patient, try profile endpoint
      if (userRole == 'patient' && patientId == null) {
        final profileResult = await ApiService.getPatientProfile();
        if (profileResult['success'] == true && profileResult['patient'] != null) {
          patientId = profileResult['patient']['patient_id']?.toString();
        }
      }
      
      // Set patient_id and fetch patient name
      if (userRole == 'patient' && patientId != null) {
        setState(() {
          _selectedPatientId = patientId;
          _isLoadingUser = false;
        });
        // Fetch patient name directly from profile API
        await _fetchPatientNameFromAPI(patientId);
      } else {
        setState(() => _isLoadingUser = false);
      }
    } catch (e) {
      setState(() => _isLoadingUser = false);
    }
  }

  Future<void> _fetchPatientNameFromAPI(String? patientId) async {
    if (patientId == null) return;
    
    try {
      // First try to get from patients list if available
      if (widget.patients.isNotEmpty) {
        try {
          final patient = widget.patients.firstWhere(
            (p) => p['patient_id']?.toString() == patientId,
          );
          setState(() {
            _patientName = '${patient['first_name']} ${patient['last_name']}${patient['uic'] != null ? ' (${patient['uic']})' : ''}';
          });
          return;
        } catch (e) {
          // Patient not in list, continue to API call
        }
      }
      
      // Fetch directly from patient profile API
      final profileResult = await ApiService.getPatientProfile();
      if (profileResult['success'] == true && profileResult['patient'] != null) {
        final patient = profileResult['patient'];
        setState(() {
          _patientName = '${patient['first_name']} ${patient['last_name']}${patient['uic'] != null ? ' (${patient['uic']})' : ''}';
        });
      } else {
        setState(() {
          _patientName = 'Patient ID: $patientId';
        });
      }
    } catch (e) {
      setState(() {
        _patientName = 'Patient ID: $patientId';
      });
    }
  }

  void _updatePatientName(String? patientId) {
    // This method is kept for backward compatibility but now uses API
    _fetchPatientNameFromAPI(patientId);
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitAppointment() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDate == null || _selectedTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please select date and time')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final scheduledStart = DateTime(
        _selectedDate!.year,
        _selectedDate!.month,
        _selectedDate!.day,
        _selectedTime!.hour,
        _selectedTime!.minute,
      );
      final scheduledEnd = scheduledStart.add(Duration(minutes: _durationMinutes));

      final scheduledStartStr = scheduledStart.toIso8601String().replaceAll('T', ' ').substring(0, 19);
      final scheduledEndStr = scheduledEnd.toIso8601String().replaceAll('T', ' ').substring(0, 19);

      // Check availability before creating
      final availabilityResult = await ApiService.checkAvailability(
        facilityId: _selectedFacilityId!,
        providerId: _selectedProviderId,
        scheduledStart: scheduledStartStr,
        scheduledEnd: scheduledEndStr,
      );

      if (!mounted) return;

      if (availabilityResult['success'] != true || 
          availabilityResult['data']?['available'] != true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('The selected time slot is not available. Please choose another time.'),
            backgroundColor: Colors.orange,
          ),
        );
        setState(() => _isSubmitting = false);
        return;
      }

      final appointmentData = {
        'patient_id': _selectedPatientId,
        'facility_id': _selectedFacilityId,
        'provider_id': _selectedProviderId,
        'appointment_type': _selectedType,
        'scheduled_start': scheduledStartStr,
        'scheduled_end': scheduledEndStr,
        'duration_minutes': _durationMinutes,
        'reason': _reasonController.text.isEmpty ? null : _reasonController.text,
        'notes': _notesController.text.isEmpty ? null : _notesController.text,
      };

      final result = await ApiService.createAppointment(appointmentData);

      if (!mounted) return;

      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Appointment booked successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
        widget.onAppointmentBooked();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Failed to book appointment'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: EdgeInsets.symmetric(vertical: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '📅 Book Appointment',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          Divider(),
          // Form
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView(
                padding: EdgeInsets.all(20),
                children: [
                  // Patient - Hide dropdown if current user is a patient
                  _isLoadingUser
                      ? Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Row(
                            children: [
                              SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                              SizedBox(width: 8),
                              Text('Loading patient information...'),
                            ],
                          ),
                        )
                      : _currentUserRole?.toLowerCase() == 'patient'
                          ? Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Patient *',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[700],
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                SizedBox(height: 8),
                                Container(
                                  padding: EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.grey[200],
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: Colors.grey[300]!),
                                  ),
                                  child: Text(
                                    _patientName ?? (_selectedPatientId != null ? 'Patient ID: $_selectedPatientId' : 'Loading...'),
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: Colors.grey[700],
                                    ),
                                  ),
                                ),
                              ],
                            )
                          : DropdownButtonFormField<String>(
                              decoration: InputDecoration(labelText: 'Patient *'),
                              value: _selectedPatientId,
                              items: widget.patients.map<DropdownMenuItem<String>>((p) {
                                return DropdownMenuItem<String>(
                                  value: p['patient_id']?.toString(),
                                  child: Text('${p['first_name']} ${p['last_name']}${p['uic'] != null ? ' (${p['uic']})' : ''}'),
                                );
                              }).toList(),
                              onChanged: (value) => setState(() => _selectedPatientId = value),
                              validator: (value) => value == null ? 'Please select patient' : null,
                            ),
                  SizedBox(height: 16),
                  // Facility
                  DropdownButtonFormField<String>(
                    decoration: InputDecoration(labelText: 'Facility *'),
                    value: _selectedFacilityId,
                    items: widget.facilities.map<DropdownMenuItem<String>>((f) {
                      return DropdownMenuItem<String>(
                        value: f['facility_id']?.toString(),
                        child: Text(f['facility_name'] ?? 'N/A'),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _selectedFacilityId = value),
                    validator: (value) => value == null ? 'Please select facility' : null,
                  ),
                  SizedBox(height: 16),
                  // Provider (Optional)
                  DropdownButtonFormField<String>(
                    decoration: InputDecoration(labelText: 'Provider (Optional)'),
                    value: _selectedProviderId,
                    items: [
                      DropdownMenuItem<String>(value: null, child: Text('Select Provider (Optional)')),
                      ...widget.providers.map<DropdownMenuItem<String>>((p) {
                        return DropdownMenuItem<String>(
                          value: p['user_id']?.toString(),
                          child: Text('${p['full_name'] ?? p['username']} (${p['role'] ?? ''})'),
                        );
                      }),
                    ],
                    onChanged: (value) => setState(() => _selectedProviderId = value),
                  ),
                  SizedBox(height: 16),
                  // Appointment Type
                  DropdownButtonFormField<String>(
                    decoration: InputDecoration(labelText: 'Appointment Type *'),
                    value: _selectedType,
                    items: [
                      'initial',
                      'follow_up',
                      'art_pickup',
                      'lab_test',
                      'counseling',
                      'general',
                    ].map((type) {
                      return DropdownMenuItem(
                        value: type,
                        child: Text(_formatAppointmentType(type)),
                      );
                    }).toList(),
                    onChanged: (value) => setState(() => _selectedType = value),
                    validator: (value) => value == null ? 'Please select type' : null,
                  ),
                  SizedBox(height: 16),
                  // Date
                  ListTile(
                    title: Text('Date *'),
                    subtitle: Text(
                      _selectedDate == null
                          ? 'Select date'
                          : DateFormat('MMMM dd, yyyy').format(_selectedDate!),
                    ),
                    trailing: Icon(Icons.calendar_today),
                    onTap: () async {
                      final date = await showDatePicker(
                        context: context,
                        initialDate: DateTime.now().add(Duration(days: 1)),
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(Duration(days: 365)),
                      );
                      if (date != null) {
                        setState(() => _selectedDate = date);
                      }
                    },
                  ),
                  SizedBox(height: 16),
                  // Time
                  ListTile(
                    title: Text('Time *'),
                    subtitle: Text(
                      _selectedTime == null
                          ? 'Select time'
                          : _selectedTime!.format(context),
                    ),
                    trailing: Icon(Icons.access_time),
                    onTap: () async {
                      final time = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.now(),
                      );
                      if (time != null) {
                        setState(() => _selectedTime = time);
                      }
                    },
                  ),
                  SizedBox(height: 16),
                  // Duration
                  TextFormField(
                    decoration: InputDecoration(labelText: 'Duration (minutes)'),
                    keyboardType: TextInputType.number,
                    initialValue: '30',
                    onChanged: (value) {
                      _durationMinutes = int.tryParse(value) ?? 30;
                    },
                  ),
                  SizedBox(height: 16),
                  // Reason
                  TextFormField(
                    controller: _reasonController,
                    decoration: InputDecoration(labelText: 'Reason'),
                    maxLines: 2,
                  ),
                  SizedBox(height: 16),
                  // Notes
                  TextFormField(
                    controller: _notesController,
                    decoration: InputDecoration(labelText: 'Notes'),
                    maxLines: 3,
                  ),
                  SizedBox(height: 30),
                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitAppointment,
                      style: ElevatedButton.styleFrom(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: Color(0xFF2563EB),
                      ),
                      child: _isSubmitting
                          ? SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Text('Book Appointment'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatAppointmentType(String type) {
    return type.split('_').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
  }
}
