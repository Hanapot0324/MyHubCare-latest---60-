import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../services/api_service.dart';
import 'appointments_screen.dart';
import 'medications_screen.dart';
import 'prescriptions_screen.dart';
import 'lab_results_screen.dart';
import 'profile_screen.dart';
import 'notifications_screen.dart';

class Dashboard extends StatefulWidget {
  const Dashboard({Key? key}) : super(key: key);

  @override
  State<Dashboard> createState() => _DashboardState();
}

class _DashboardState extends State<Dashboard> {
  int _currentIndex = 0;
  Map<String, dynamic>? _currentUser;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userStr = prefs.getString('user');
      if (userStr != null) {
        setState(() {
          _currentUser = jsonDecode(userStr);
          _isLoading = false;
        });
      } else {
        // Try to get from API
        final result = await ApiService.getCurrentUser();
        if (result['success'] == true && result['user'] != null) {
          await prefs.setString('user', jsonEncode(result['user']));
          setState(() {
            _currentUser = result['user'];
            _isLoading = false;
          });
        } else {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _HomePage(user: _currentUser),
          AppointmentsScreen(),
          MedicationsScreen(),
          LabResultsScreen(),
          ProfileScreen(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFFB82132),
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: 'Appointments'),
          BottomNavigationBarItem(icon: Icon(Icons.medication), label: 'Medications'),
          BottomNavigationBarItem(icon: Icon(Icons.science), label: 'Labs'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class _HomePage extends StatefulWidget {
  final Map<String, dynamic>? user;

  const _HomePage({Key? key, this.user}) : super(key: key);

  @override
  State<_HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<_HomePage> {
  int _upcomingCount = 0;
  int _medicationCount = 0;
  int _adherenceRate = 95;
  bool _isLoading = true;
  int _unreadNotificationCount = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
    _loadNotificationCount();
    // Refresh notification count every 30 seconds
    Future.delayed(Duration(seconds: 30), () {
      if (mounted) {
        _loadNotificationCount();
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Refresh notification count when screen becomes visible
    _loadNotificationCount();
  }

  Future<void> _loadNotificationCount() async {
    try {
      final result = await ApiService.getUnreadNotificationCount();
      if (result['success'] == true && mounted) {
        setState(() {
          _unreadNotificationCount = result['count'] ?? 0;
        });
      }
    } catch (e) {
      // Silently fail for notification count
    }
  }

  Future<void> _loadData() async {
    try {
      // Load appointments
      final appointmentsResult = await ApiService.getAppointments();
      if (appointmentsResult['success'] == true) {
        final appointments = appointmentsResult['data'] as List;
        final now = DateTime.now();
        _upcomingCount = appointments.where((apt) {
          final date = DateTime.parse(apt['scheduled_start']);
          return date.isAfter(now) && apt['status'] == 'scheduled';
        }).length;
      }

      // Load medications
      final remindersResult = await ApiService.getMedicationReminders();
      if (remindersResult['success'] == true) {
        final reminders = remindersResult['data'] as List;
        _medicationCount = reminders.length;
      }

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final userName = widget.user?['full_name'] ?? widget.user?['username'] ?? 'Patient';

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Header
          SliverAppBar(
            expandedHeight: 180,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFB82132), Color(0xFFD2665A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                padding: EdgeInsets.only(top: 50, left: 20, right: 20, bottom: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.home, color: Colors.white, size: 24),
                            SizedBox(width: 8),
                            Text(
                              'My Hub Cares',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        Row(
                          children: [
                            Stack(
                              children: [
                                IconButton(
                                  onPressed: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => NotificationsScreen(),
                                      ),
                                    ).then((_) {
                                      // Refresh notification count when returning
                                      _loadNotificationCount();
                                    });
                                  },
                                  icon: Icon(Icons.notifications, color: Colors.white, size: 24),
                                ),
                                if (_unreadNotificationCount > 0)
                                  Positioned(
                                    right: 8,
                                    top: 8,
                                    child: Container(
                                      padding: EdgeInsets.all(4),
                                      decoration: BoxDecoration(
                                        color: Color(0xFFEF4444),
                                        shape: BoxShape.circle,
                                      ),
                                      constraints: BoxConstraints(
                                        minWidth: 16,
                                        minHeight: 16,
                                      ),
                                      child: Text(
                                        _unreadNotificationCount > 9 ? '9+' : '$_unreadNotificationCount',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            IconButton(
                              onPressed: () {},
                              icon: Icon(Icons.settings, color: Colors.white, size: 24),
                            ),
                          ],
                        ),
                      ],
                    ),
                    SizedBox(height: 20),
                    Text(
                      'Welcome back!',
                      style: TextStyle(color: Colors.white70, fontSize: 16),
                    ),
                    Text(
                      userName,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      "It's my hub, and it's yours. Welcome Home! 🏠",
                      style: TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Health Status Card
                  _buildHealthStatusCard(),
                  SizedBox(height: 25),

                  // Quick Actions
                  _buildQuickActions(),
                  SizedBox(height: 25),

                  // Stats Grid
                  _buildStatsGrid(),
                  SizedBox(height: 25),

                  // Next Appointment
                  _buildSectionHeader('Next Appointment', 'View All', () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => AppointmentsScreen()),
                    );
                  }),
                  SizedBox(height: 15),
                  _buildNextAppointment(),
                  SizedBox(height: 25),

                  // Today's Medications
                  _buildSectionHeader('Today\'s Medications', 'View All', () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => MedicationsScreen()),
                    );
                  }),
                  SizedBox(height: 15),
                  _buildTodayMedications(),
                  SizedBox(height: 25),

                  // Health Tip
                  _buildHealthTip(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHealthStatusCard() {
    return Container(
      padding: EdgeInsets.all(20),
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
      child: Column(
        children: [
          Text(
            'Your Health Status',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 20),
          Stack(
            alignment: Alignment.center,
            children: [
              SizedBox(
                width: 100,
                height: 100,
                child: CircularProgressIndicator(
                  value: _adherenceRate / 100,
                  strokeWidth: 8,
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                  backgroundColor: Color(0xFFE5E7EB),
                ),
              ),
              Text(
                '$_adherenceRate%',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF10B981),
                ),
              ),
            ],
          ),
          SizedBox(height: 15),
          Text(
            'Medication Adherence',
            style: TextStyle(color: Colors.grey[600]),
          ),
          SizedBox(height: 5),
          Text(
            '✓ Excellent! Keep it up!',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF10B981),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = [
      {'icon': Icons.calendar_today, 'label': 'Appointments', 'page': AppointmentsScreen()},
      {'icon': Icons.medication, 'label': 'Medications', 'page': MedicationsScreen()},
      {'icon': Icons.description, 'label': 'Prescriptions', 'page': PrescriptionsScreen()},
      {'icon': Icons.vaccines, 'label': 'Vaccines', 'page': null},
      {'icon': Icons.science, 'label': 'Lab Results', 'page': LabResultsScreen()},
      {'icon': Icons.star, 'label': 'Feedback', 'page': null},
      {'icon': Icons.menu_book, 'label': 'Learn', 'page': null},
      {'icon': Icons.person, 'label': 'Profile', 'page': ProfileScreen()},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 4,
        crossAxisSpacing: 15,
        mainAxisSpacing: 15,
      ),
      itemCount: actions.length,
      itemBuilder: (context, index) {
        final action = actions[index];
        return GestureDetector(
          onTap: () {
            if (action['page'] != null) {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => action['page'] as Widget),
              );
            }
          },
          child: Container(
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
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  action['icon'] as IconData,
                  size: 32,
                  color: Color(0xFFB82132),
                ),
                SizedBox(height: 8),
                Text(
                  action['label'] as String,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatsGrid() {
    return Row(
      children: [
        Expanded(
          child: _buildStatBox('$_upcomingCount', 'Upcoming Visits'),
        ),
        SizedBox(width: 12),
        Expanded(
          child: _buildStatBox('$_medicationCount', 'Medications Today'),
        ),
      ],
    );
  }

  Widget _buildStatBox(String value, String label) {
    return Container(
      padding: EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2563EB),
            ),
          ),
          SizedBox(height: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, String action, VoidCallback onAction) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        TextButton(
          onPressed: onAction,
          child: Text(
            action,
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF2563EB),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNextAppointment() {
    return FutureBuilder<Map<String, dynamic>>(
      future: ApiService.getAppointments(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(child: CircularProgressIndicator());
        }

        if (!snapshot.hasData || snapshot.data!['success'] != true) {
          return _buildEmptyState(Icons.calendar_today, 'No upcoming appointments', 'Book Appointment', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => AppointmentsScreen()),
            );
          });
        }

        final appointments = snapshot.data!['data'] as List;
        final upcoming = appointments.where((apt) {
          final date = DateTime.parse(apt['scheduled_start']);
          return date.isAfter(DateTime.now()) && apt['status'] == 'scheduled';
        }).toList();

        if (upcoming.isEmpty) {
          return _buildEmptyState(Icons.calendar_today, 'No upcoming appointments', 'Book Appointment', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => AppointmentsScreen()),
            );
          });
        }

        upcoming.sort((a, b) => DateTime.parse(a['scheduled_start']).compareTo(DateTime.parse(b['scheduled_start'])));
        final next = upcoming.first;
        final date = DateTime.parse(next['scheduled_start']);

        return _buildAppointmentCard(next, date);
      },
    );
  }

  Widget _buildAppointmentCard(Map<String, dynamic> apt, DateTime date) {
    return Container(
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
      child: Row(
        children: [
          Container(
            width: 60,
            padding: EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Color(0xFF2563EB),
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
                  _getMonthAbbr(date.month),
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
              children: [
                Text(
                  _formatAppointmentType(apt['appointment_type'] ?? ''),
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.access_time, size: 14, color: Colors.grey[600]),
                    SizedBox(width: 4),
                    Text(
                      _formatTime(date),
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                  ],
                ),
                SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.local_hospital, size: 14, color: Colors.grey[600]),
                    SizedBox(width: 4),
                    Text(
                      apt['facility_name'] ?? 'My Hub Cares',
                      style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayMedications() {
    return FutureBuilder<Map<String, dynamic>>(
      future: ApiService.getMedicationReminders(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(child: CircularProgressIndicator());
        }

        if (!snapshot.hasData || snapshot.data!['success'] != true) {
          return _buildEmptyState(Icons.medication, 'No medication reminders set', 'Set Reminders', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => MedicationsScreen()),
            );
          });
        }

        final reminders = snapshot.data!['data'] as List;
        if (reminders.isEmpty) {
          return _buildEmptyState(Icons.medication, 'No medication reminders set', 'Set Reminders', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => MedicationsScreen()),
            );
          });
        }

        return Column(
          children: reminders.take(3).map((reminder) => _buildMedicationCard(reminder)).toList(),
        );
      },
    );
  }

  Widget _buildMedicationCard(Map<String, dynamic> reminder) {
    return Container(
      margin: EdgeInsets.only(bottom: 12),
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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  reminder['medication_name'] ?? 'Medication',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Take at ${reminder['reminder_time'] ?? 'N/A'}',
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
              ],
            ),
          ),
          Column(
            children: [
              Text(
                reminder['reminder_time'] ?? 'N/A',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF2563EB),
                ),
              ),
              SizedBox(height: 8),
              ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: Color(0xFF10B981),
                  padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check, size: 16, color: Colors.white),
                    SizedBox(width: 4),
                    Text('Taken', style: TextStyle(fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHealthTip() {
    return Container(
      padding: EdgeInsets.all(20),
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
      child: Column(
        children: [
          Icon(Icons.lightbulb, size: 40, color: Color(0xFFF59E0B)),
          SizedBox(height: 10),
          Text(
            'Health Tip of the Day',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 15),
          Text(
            'Did you know?\n\nTaking your HIV medication at the same time every day helps maintain effective drug levels and improves treatment success.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.black87,
              height: 1.6,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(IconData icon, String message, String action, VoidCallback onAction) {
    return Container(
      padding: EdgeInsets.all(40),
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
      child: Column(
        children: [
          Icon(icon, size: 48, color: Color(0xFFB82132)),
          SizedBox(height: 15),
          Text(
            message,
            style: TextStyle(color: Colors.grey[600]),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 15),
          ElevatedButton(
            onPressed: onAction,
            style: ElevatedButton.styleFrom(
              backgroundColor: Color(0xFF2563EB),
              padding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            ),
            child: Text(action),
          ),
        ],
      ),
    );
  }

  String _getMonthAbbr(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }

  String _formatTime(DateTime date) {
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  String _formatAppointmentType(String type) {
    return type.split('_').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
  }
}

