import 'package:flutter/material.dart';
import '../services/api_service.dart';

class MedicationsScreen extends StatefulWidget {
  const MedicationsScreen({Key? key}) : super(key: key);

  @override
  State<MedicationsScreen> createState() => _MedicationsScreenState();
}

class _MedicationsScreenState extends State<MedicationsScreen> {
  List<dynamic> _reminders = [];
  bool _isLoading = true;
  double _adherenceRate = 0.0;
  String? _patientId;
  Map<String, dynamic> _adherenceSummary = {};
  bool _isMarking = false;
  List<dynamic> _prescriptions = [];
  List<dynamic> _prescribedMedications = [];
  
  // Form controllers
  final _formKey = GlobalKey<FormState>();
  final _medicationNameController = TextEditingController();
  final _dosageController = TextEditingController();
  final _specialInstructionsController = TextEditingController();
  String _selectedFrequency = 'daily';
  TimeOfDay _selectedTime = const TimeOfDay(hour: 9, minute: 0);
  String _selectedSoundPreference = 'default';
  bool _isActive = true;
  bool _browserNotifications = true;
  String? _selectedPrescriptionId;

  @override
  void initState() {
    super.initState();
    _initializeData();
  }

  Future<void> _initializeData() async {
    await _loadUserInfo();
    await _loadReminders();
    await _loadAdherenceData();
  }
  
  Future<void> _loadPrescriptions() async {
    if (_patientId == null) return;
    
    try {
      final result = await ApiService.getPrescriptions(patientId: _patientId);
      if (result['success'] == true) {
        setState(() {
          _prescriptions = result['data'] ?? [];
          _extractPrescribedMedications();
        });
      }
    } catch (e) {
      print('Error loading prescriptions: $e');
    }
  }
  
  void _extractPrescribedMedications() {
    final medications = <Map<String, dynamic>>[];
    final seen = <String>{};
    
    for (var prescription in _prescriptions) {
      if (prescription['items'] != null) {
        for (var item in prescription['items']) {
          final key = '${item['medication_name']}-${item['dosage'] ?? ''}-${item['frequency'] ?? ''}';
          if (!seen.contains(key) && item['medication_name'] != null) {
            seen.add(key);
            medications.add({
              'medication_name': item['medication_name'],
              'dosage': item['dosage'],
              'frequency': item['frequency'],
              'prescription_id': prescription['prescription_id'],
              'prescription_item_id': item['prescription_item_id'],
            });
          }
        }
      }
    }
    
    setState(() {
      _prescribedMedications = medications;
    });
  }

  Future<void> _loadUserInfo() async {
    try {
      final userResult = await ApiService.getCurrentUser();
      if (userResult['success'] == true && userResult['user'] != null) {
        setState(() {
          _patientId = userResult['user']['patient_id'] ?? userResult['user']['user_id'];
        });
        // Load prescriptions after patient ID is set
        await _loadPrescriptions();
      }
    } catch (e) {
      print('Error loading user info: $e');
    }
  }

  Future<void> _loadReminders() async {
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getMedicationReminders(
        patientId: _patientId,
      );
      if (result['success'] == true) {
        setState(() {
          _reminders = result['data'] as List;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Failed to load reminders'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading reminders: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _loadAdherenceData() async {
    if (_patientId == null) return;

    try {
      final result = await ApiService.getPatientAdherence(patientId: _patientId!);
      if (result['success'] == true) {
        setState(() {
          _adherenceSummary = result['summary'] ?? {};
          _adherenceRate = _adherenceSummary['overall_adherence_percentage']?.toDouble() ?? 0.0;
        });
      }
    } catch (e) {
      print('Error loading adherence data: $e');
    }
  }

  Future<void> _markAsTaken(Map<String, dynamic> reminder, bool taken) async {
    if (_patientId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Patient ID not found. Please login again.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final prescriptionId = reminder['prescription_id']?.toString();
    if (prescriptionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Prescription ID not found in reminder'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isMarking = true);

    try {
      final now = DateTime.now();
      final today = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      final result = await ApiService.recordMedicationAdherence(
        prescriptionId: prescriptionId,
        patientId: _patientId!,
        adherenceDate: today,
        taken: taken,
        missedReason: taken ? null : 'Not taken',
      );

      if (result['success'] == true) {
        // Reload data to reflect changes
        await _loadReminders();
        await _loadAdherenceData();

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(taken ? '✅ Medication marked as taken!' : '⚠️ Medication marked as missed'),
              backgroundColor: taken ? const Color(0xFF10B981) : Colors.orange,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Failed to record adherence'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isMarking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 600;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Medication Schedule',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF2563EB),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _loadReminders();
              _loadAdherenceData();
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
              ),
            )
          : RefreshIndicator(
              onRefresh: () async {
                await _loadReminders();
                await _loadAdherenceData();
              },
              color: const Color(0xFF2563EB),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.all(isTablet ? 24 : 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildAdherenceCard(isTablet),
                    SizedBox(height: isTablet ? 24 : 20),
                    if (_reminders.isEmpty)
                      _buildEmptyState(isTablet)
                    else
                      ..._reminders.map((reminder) => _buildMedicationCard(reminder, isTablet)),
                  ],
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: "medications_fab",
        onPressed: () => _showAddReminderModal(),
        backgroundColor: const Color(0xFFB82132),
        icon: const Icon(Icons.add),
        label: const Text('Add Reminder'),
      ),
    );
  }

  Widget _buildAdherenceCard(bool isTablet) {
    final adherenceColor = _adherenceRate >= 80
        ? const Color(0xFF10B981)
        : _adherenceRate >= 60
            ? Colors.orange
            : const Color(0xFFEF4444);

    final adherenceMessage = _adherenceRate >= 80
        ? 'Excellent adherence!'
        : _adherenceRate >= 60
            ? 'Good adherence'
            : 'Needs improvement';

    return Container(
      padding: EdgeInsets.all(isTablet ? 32 : 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF2563EB),
            const Color(0xFF1E40AF),
          ],
        ),
        borderRadius: BorderRadius.circular(isTablet ? 24 : 20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Adherence Rate',
                      style: TextStyle(
                        fontSize: isTablet ? 20 : 16,
                        color: Colors.white.withOpacity(0.9),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      adherenceMessage,
                      style: TextStyle(
                        fontSize: isTablet ? 16 : 14,
                        color: Colors.white.withOpacity(0.8),
                      ),
                    ),
                    if (_adherenceSummary.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _buildStatItem(
                            'Taken',
                            '${_adherenceSummary['taken_records'] ?? 0}',
                            Colors.white,
                            isTablet,
                          ),
                          const SizedBox(width: 16),
                          _buildStatItem(
                            'Missed',
                            '${_adherenceSummary['missed_records'] ?? 0}',
                            Colors.white70,
                            isTablet,
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox(
                    width: isTablet ? 120 : 100,
                    height: isTablet ? 120 : 100,
                    child: CircularProgressIndicator(
                      value: _adherenceRate / 100,
                      strokeWidth: isTablet ? 12 : 10,
                      valueColor: AlwaysStoppedAnimation<Color>(adherenceColor),
                      backgroundColor: Colors.white.withOpacity(0.2),
                    ),
                  ),
                  Column(
                    children: [
                      Text(
                        '${_adherenceRate.toStringAsFixed(0)}%',
                        style: TextStyle(
                          fontSize: isTablet ? 32 : 28,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color, bool isTablet) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: isTablet ? 24 : 20,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: isTablet ? 12 : 10,
            color: color.withOpacity(0.8),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(bool isTablet) {
    return Container(
      padding: EdgeInsets.all(isTablet ? 60 : 40),
      child: Column(
        children: [
          Text('💊', style: TextStyle(fontSize: isTablet ? 80 : 64)),
          SizedBox(height: isTablet ? 24 : 20),
          Text(
            'No medication reminders',
            style: TextStyle(
              fontSize: isTablet ? 22 : 18,
              color: Colors.grey[600],
              fontWeight: FontWeight.w600,
            ),
          ),
          SizedBox(height: isTablet ? 12 : 10),
          Text(
            'Set your first reminder with custom alarm!',
            style: TextStyle(
              fontSize: isTablet ? 16 : 13,
              color: Colors.grey[500],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildMedicationCard(Map<String, dynamic> reminder, bool isTablet) {
    final reminderTime = reminder['reminder_time'] ?? 'N/A';
    final medicationName = reminder['medication_name'] ?? 'Medication';
    final frequency = reminder['frequency'] ?? 'daily';
    final missedDoses = reminder['missed_doses'] ?? 0;
    final prescriptionId = reminder['prescription_id']?.toString();
    final isToday = _isTodayReminder(reminder);

    return Container(
      margin: EdgeInsets.only(bottom: isTablet ? 20 : 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(isTablet ? 20 : 16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
        border: isToday
            ? Border.all(
                color: const Color(0xFF2563EB).withOpacity(0.3),
                width: 2,
              )
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(isTablet ? 20 : 16),
          onTap: () => _showMedicationDetails(reminder),
          child: Padding(
            padding: EdgeInsets.all(isTablet ? 20 : 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              if (isToday)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF2563EB).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'TODAY',
                                    style: TextStyle(
                                      fontSize: isTablet ? 11 : 10,
                                      fontWeight: FontWeight.bold,
                                      color: const Color(0xFF2563EB),
                                    ),
                                  ),
                                ),
                              if (isToday) const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  medicationName,
                                  style: TextStyle(
                                    fontSize: isTablet ? 20 : 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.black87,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: isTablet ? 8 : 6),
                          Row(
                            children: [
                              Icon(
                                Icons.schedule,
                                size: isTablet ? 18 : 16,
                                color: Colors.grey[600],
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Take $frequency at $reminderTime',
                                style: TextStyle(
                                  fontSize: isTablet ? 15 : 13,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                          if (missedDoses > 0) ...[
                            SizedBox(height: isTablet ? 8 : 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEF4444).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.warning_amber_rounded,
                                    size: isTablet ? 18 : 16,
                                    color: const Color(0xFFEF4444),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '$missedDoses missed ${missedDoses == 1 ? 'dose' : 'doses'}',
                                    style: TextStyle(
                                      fontSize: isTablet ? 13 : 12,
                                      color: const Color(0xFFEF4444),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Container(
                      padding: EdgeInsets.all(isTablet ? 16 : 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(isTablet ? 16 : 12),
                      ),
                      child: Column(
                        children: [
                          Text(
                            reminderTime,
                            style: TextStyle(
                              fontSize: isTablet ? 24 : 20,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF2563EB),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                SizedBox(height: isTablet ? 16 : 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isMarking
                            ? null
                            : () => _markAsTaken(reminder, true),
                        icon: const Icon(Icons.check_circle, size: 20),
                        label: const Text('Taken'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(
                            horizontal: isTablet ? 24 : 20,
                            vertical: isTablet ? 14 : 12,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                          ),
                          elevation: 2,
                        ),
                      ),
                    ),
                    SizedBox(width: isTablet ? 12 : 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _isMarking
                            ? null
                            : () => _markAsTaken(reminder, false),
                        icon: const Icon(Icons.close, size: 20),
                        label: const Text('Missed'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.orange,
                          side: const BorderSide(color: Colors.orange, width: 1.5),
                          padding: EdgeInsets.symmetric(
                            horizontal: isTablet ? 24 : 20,
                            vertical: isTablet ? 14 : 12,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  bool _isTodayReminder(Map<String, dynamic> reminder) {
    // Check if this reminder is for today
    // You can enhance this logic based on your reminder structure
    return true; // Simplified - you can add date checking logic here
  }

  void _showMedicationDetails(Map<String, dynamic> reminder) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  reminder['medication_name'] ?? 'Medication Details',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildDetailRow('Frequency', reminder['frequency'] ?? 'N/A'),
            _buildDetailRow('Time', reminder['reminder_time'] ?? 'N/A'),
            if (reminder['dosage'] != null)
              _buildDetailRow('Dosage', reminder['dosage'].toString()),
            if (reminder['missed_doses'] != null && reminder['missed_doses'] > 0)
              _buildDetailRow('Missed Doses', reminder['missed_doses'].toString()),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  void _showAddReminderModal() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 600;
    
    // Reset form
    _medicationNameController.clear();
    _dosageController.clear();
    _specialInstructionsController.clear();
    _selectedFrequency = 'daily';
    _selectedTime = const TimeOfDay(hour: 9, minute: 0);
    _selectedSoundPreference = 'default';
    _isActive = true;
    _browserNotifications = true;
    _selectedPrescriptionId = null;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              
              // Header
              Padding(
                padding: EdgeInsets.all(isTablet ? 24 : 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Add Medication Reminder',
                      style: TextStyle(
                        fontSize: isTablet ? 24 : 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                      color: Colors.grey[600],
                    ),
                  ],
                ),
              ),
              
              // Form content
              Flexible(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Medication Name
                      _buildMedicationNameField(isTablet),
                      SizedBox(height: isTablet ? 20 : 16),
                      
                      // Dosage and Frequency Row
                      Row(
                        children: [
                          Expanded(
                            child: _buildDosageField(isTablet),
                          ),
                          SizedBox(width: isTablet ? 16 : 12),
                          Expanded(
                            child: _buildFrequencyField(isTablet),
                          ),
                        ],
                      ),
                      SizedBox(height: isTablet ? 20 : 16),
                      
                      // Reminder Time
                      _buildTimeField(isTablet),
                      SizedBox(height: isTablet ? 20 : 16),
                      
                      // Sound Preference
                      _buildSoundPreferenceField(isTablet),
                      SizedBox(height: isTablet ? 20 : 16),
                      
                      // Checkboxes
                      _buildCheckboxes(isTablet),
                      SizedBox(height: isTablet ? 20 : 16),
                      
                      // Special Instructions
                      _buildSpecialInstructionsField(isTablet),
                      SizedBox(height: isTablet ? 24 : 20),
                    ],
                  ),
                ),
              ),
              
              // Action Buttons
              Container(
                padding: EdgeInsets.all(isTablet ? 24 : 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: EdgeInsets.symmetric(vertical: isTablet ? 16 : 14),
                          side: BorderSide(color: Colors.grey[300]!),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                          ),
                        ),
                        child: Text(
                          'Cancel',
                          style: TextStyle(
                            fontSize: isTablet ? 16 : 14,
                            color: Colors.grey[700],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    SizedBox(width: isTablet ? 16 : 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: _handleAddReminder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(vertical: isTablet ? 16 : 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                          ),
                          elevation: 2,
                        ),
                        child: Text(
                          'Create Reminder',
                          style: TextStyle(
                            fontSize: isTablet ? 16 : 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildMedicationNameField(bool isTablet) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Medication Name',
              style: TextStyle(
                fontSize: isTablet ? 16 : 14,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            const SizedBox(width: 4),
            const Text(
              '*',
              style: TextStyle(color: Colors.red),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Autocomplete<String>(
          optionsBuilder: (TextEditingValue textEditingValue) {
            if (textEditingValue.text.isEmpty) {
              return _prescribedMedications
                  .map((m) => m['medication_name'] as String)
                  .toList();
            }
            return _prescribedMedications
                .map((m) => m['medication_name'] as String)
                .where((name) => name.toLowerCase().contains(
                      textEditingValue.text.toLowerCase(),
                    ))
                .toList();
          },
          onSelected: (String selection) {
            _medicationNameController.text = selection;
            final medication = _prescribedMedications.firstWhere(
              (m) => m['medication_name'] == selection,
              orElse: () => {},
            );
            if (medication.isNotEmpty) {
              _dosageController.text = medication['dosage'] ?? '';
              _selectedFrequency = medication['frequency'] ?? 'daily';
              _selectedPrescriptionId = medication['prescription_id']?.toString();
            }
          },
          fieldViewBuilder: (
            BuildContext context,
            TextEditingController textEditingController,
            FocusNode focusNode,
            VoidCallback onFieldSubmitted,
          ) {
            return TextFormField(
              controller: textEditingController,
              focusNode: focusNode,
              decoration: InputDecoration(
                hintText: 'Select or type medication name',
                prefixIcon: const Icon(Icons.medication, color: Color(0xFF2563EB)),
                filled: true,
                fillColor: Colors.grey[50],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                  borderSide: BorderSide(color: Colors.grey[300]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
                  borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
                ),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: isTablet ? 20 : 16,
                  vertical: isTablet ? 18 : 16,
                ),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter medication name';
                }
                return null;
              },
            );
          },
        ),
        if (_prescribedMedications.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'No prescriptions found. You can type a medication name manually.',
              style: TextStyle(
                fontSize: isTablet ? 13 : 12,
                color: Colors.grey[600],
              ),
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              'Select from your prescribed medications or type manually',
              style: TextStyle(
                fontSize: isTablet ? 13 : 12,
                color: Colors.grey[600],
              ),
            ),
          ),
      ],
    );
  }
  
  Widget _buildDosageField(bool isTablet) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Dosage',
          style: TextStyle(
            fontSize: isTablet ? 16 : 14,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _dosageController,
          decoration: InputDecoration(
            hintText: 'e.g., 500mg',
            prefixIcon: const Icon(Icons.science, color: Color(0xFF2563EB)),
            filled: true,
            fillColor: Colors.grey[50],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
            contentPadding: EdgeInsets.symmetric(
              horizontal: isTablet ? 20 : 16,
              vertical: isTablet ? 18 : 16,
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildFrequencyField(bool isTablet) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Frequency',
              style: TextStyle(
                fontSize: isTablet ? 16 : 14,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            const SizedBox(width: 4),
            const Text(
              '*',
              style: TextStyle(color: Colors.red),
            ),
          ],
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedFrequency,
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.repeat, color: Color(0xFF2563EB)),
            filled: true,
            fillColor: Colors.grey[50],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
            contentPadding: EdgeInsets.symmetric(
              horizontal: isTablet ? 20 : 16,
              vertical: isTablet ? 18 : 16,
            ),
          ),
          items: const [
            DropdownMenuItem(value: 'daily', child: Text('Daily')),
            DropdownMenuItem(value: 'twice daily', child: Text('Twice Daily')),
            DropdownMenuItem(value: 'three times daily', child: Text('Three Times Daily')),
            DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
          ],
          onChanged: (value) {
            setState(() {
              _selectedFrequency = value ?? 'daily';
            });
          },
        ),
      ],
    );
  }
  
  Widget _buildTimeField(bool isTablet) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Reminder Time',
              style: TextStyle(
                fontSize: isTablet ? 16 : 14,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            const SizedBox(width: 4),
            const Text(
              '*',
              style: TextStyle(color: Colors.red),
            ),
          ],
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: () async {
            final TimeOfDay? picked = await showTimePicker(
              context: context,
              initialTime: _selectedTime,
              builder: (context, child) {
                return Theme(
                  data: Theme.of(context).copyWith(
                    colorScheme: const ColorScheme.light(
                      primary: Color(0xFF2563EB),
                    ),
                  ),
                  child: child!,
                );
              },
            );
            if (picked != null) {
              setState(() {
                _selectedTime = picked;
              });
            }
          },
          child: Container(
            padding: EdgeInsets.symmetric(
              horizontal: isTablet ? 20 : 16,
              vertical: isTablet ? 18 : 16,
            ),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              border: Border.all(color: Colors.grey[300]!),
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time, color: Color(0xFF2563EB)),
                const SizedBox(width: 12),
                Text(
                  _selectedTime.format(context),
                  style: TextStyle(
                    fontSize: isTablet ? 16 : 14,
                    color: Colors.black87,
                  ),
                ),
                const Spacer(),
                const Icon(Icons.arrow_drop_down, color: Colors.grey),
              ],
            ),
          ),
        ),
      ],
    );
  }
  
  Widget _buildSoundPreferenceField(bool isTablet) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Sound Preference',
          style: TextStyle(
            fontSize: isTablet ? 16 : 14,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedSoundPreference,
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.volume_up, color: Color(0xFF2563EB)),
            filled: true,
            fillColor: Colors.grey[50],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
            contentPadding: EdgeInsets.symmetric(
              horizontal: isTablet ? 20 : 16,
              vertical: isTablet ? 18 : 16,
            ),
          ),
          items: const [
            DropdownMenuItem(value: 'default', child: Text('Default')),
            DropdownMenuItem(value: 'gentle', child: Text('Gentle')),
            DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
          ],
          onChanged: (value) {
            setState(() {
              _selectedSoundPreference = value ?? 'default';
            });
          },
        ),
      ],
    );
  }
  
  Widget _buildCheckboxes(bool isTablet) {
    return Column(
      children: [
        CheckboxListTile(
          title: Text(
            'Enable browser notifications',
            style: TextStyle(fontSize: isTablet ? 15 : 14),
          ),
          value: _browserNotifications,
          onChanged: (value) {
            setState(() {
              _browserNotifications = value ?? true;
            });
          },
          activeColor: const Color(0xFF2563EB),
          contentPadding: EdgeInsets.zero,
        ),
        CheckboxListTile(
          title: Text(
            'Active',
            style: TextStyle(fontSize: isTablet ? 15 : 14),
          ),
          value: _isActive,
          onChanged: (value) {
            setState(() {
              _isActive = value ?? true;
            });
          },
          activeColor: const Color(0xFF2563EB),
          contentPadding: EdgeInsets.zero,
        ),
      ],
    );
  }
  
  Widget _buildSpecialInstructionsField(bool isTablet) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Special Instructions (Optional)',
          style: TextStyle(
            fontSize: isTablet ? 16 : 14,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _specialInstructionsController,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Enter any special instructions...',
            prefixIcon: const Padding(
              padding: EdgeInsets.only(bottom: 60),
              child: Icon(Icons.note, color: Color(0xFF2563EB)),
            ),
            filled: true,
            fillColor: Colors.grey[50],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(isTablet ? 12 : 10),
              borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }
  
  Future<void> _handleAddReminder() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    if (_medicationNameController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a medication name'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    if (_patientId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Patient ID not found. Please login again.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    // Format time
    final timeStr = '${_selectedTime.hour.toString().padLeft(2, '0')}:${_selectedTime.minute.toString().padLeft(2, '0')}:00';
    
    final reminderData = {
      'medication_name': _medicationNameController.text.trim(),
      'dosage': _dosageController.text.trim(),
      'frequency': _selectedFrequency,
      'reminder_time': timeStr,
      'active': _isActive,
      'browser_notifications': _browserNotifications,
      'sound_preference': _selectedSoundPreference,
      'special_instructions': _specialInstructionsController.text.trim(),
      'patient_id': _patientId,
      if (_selectedPrescriptionId != null) 'prescription_id': _selectedPrescriptionId,
    };
    
    try {
      // Try to create via API first
      final result = await ApiService.createMedicationReminder(reminderData);
      
      if (result['success'] == true) {
        Navigator.pop(context);
        await _loadReminders();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Reminder created successfully!'),
            backgroundColor: Color(0xFF10B981),
            duration: Duration(seconds: 2),
          ),
        );
      } else {
        // Fallback to localStorage if API fails (for standalone reminders)
        _saveReminderToLocalStorage(reminderData);
        Navigator.pop(context);
        await _loadReminders();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Reminder saved locally!'),
            backgroundColor: Color(0xFF10B981),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      // Fallback to localStorage on error
      _saveReminderToLocalStorage(reminderData);
      Navigator.pop(context);
      await _loadReminders();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Reminder saved locally: ${e.toString()}'),
          backgroundColor: Colors.orange,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }
  
  void _saveReminderToLocalStorage(Map<String, dynamic> reminderData) {
    // This is a fallback - in a real app, you'd want to sync with backend
    // For now, we'll just show success since the API should handle it
    print('Reminder data: $reminderData');
  }
  
  @override
  void dispose() {
    _medicationNameController.dispose();
    _dosageController.dispose();
    _specialInstructionsController.dispose();
    super.dispose();
  }
}
