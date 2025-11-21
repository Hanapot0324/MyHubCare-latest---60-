import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class AppointmentReminderCard extends StatelessWidget {
  final Map<String, dynamic> appointment;

  const AppointmentReminderCard({
    Key? key,
    required this.appointment,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final startDate = DateTime.parse(appointment['scheduled_start']);
    final endDate = DateTime.parse(appointment['scheduled_end']);
    
    return Container(
      margin: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 6,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF2563EB), Color(0xFF1E40AF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            padding: EdgeInsets.all(30),
            child: Column(
              children: [
                Text(
                  '🗓️ Appointment Reminder',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'MyHubCares - Your Partner in Sexual Health and Wellness',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white70,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),

          // Body
          Padding(
            padding: EdgeInsets.all(30),
            child: Column(
              children: [
                _buildInfoRow('Patient Name:', appointment['patient_name'] ?? 'N/A'),
                _buildInfoRow(
                  'Date:',
                  DateFormat('EEEE, MMMM dd, yyyy').format(startDate),
                ),
                _buildInfoRow(
                  'Time:',
                  '${DateFormat('hh:mm a').format(startDate)} - ${DateFormat('hh:mm a').format(endDate)}',
                ),
                _buildInfoRow(
                  'Appointment Type:',
                  _formatAppointmentType(appointment['appointment_type'] ?? ''),
                ),
                _buildInfoRow(
                  'Healthcare Provider:',
                  appointment['provider_name'] ?? 'To be assigned',
                ),
                _buildInfoRow(
                  'Facility:',
                  appointment['facility_name'] ?? 'N/A',
                ),
                _buildInfoRow(
                  'Facility Address:',
                  appointment['facility_address'] ?? 'N/A',
                ),

                // Important Reminders
                Container(
                  margin: EdgeInsets.symmetric(vertical: 20),
                  padding: EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border(
                      left: BorderSide(
                        color: Color(0xFF2563EB),
                        width: 4,
                      ),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Important Reminders:',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF2563EB),
                        ),
                      ),
                      SizedBox(height: 10),
                      _buildReminderItem('Please arrive 15 minutes before your scheduled time'),
                      _buildReminderItem('Bring your identification card and PhilHealth card (if applicable)'),
                      _buildReminderItem('Bring your previous medical records and prescriptions'),
                      _buildReminderItem('If you need to cancel or reschedule, please contact us at least 24 hours in advance'),
                    ],
                  ),
                ),

                if (appointment['notes'] != null && appointment['notes'].toString().isNotEmpty)
                  _buildInfoRow('Notes:', appointment['notes']),
              ],
            ),
          ),

          // Footer
          Container(
            decoration: BoxDecoration(
              color: Color(0xFFF3F4F6),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(12),
                bottomRight: Radius.circular(12),
              ),
            ),
            padding: EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  'This is an automated reminder from MyHubCares',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 8),
                Text(
                  '📞 Ortigas: 0917-187-2273 | Pasay: 0898-700-1267 | Alabang: 0954-468-1630',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 4),
                Text(
                  'For inquiries, please contact your healthcare facility',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 15),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 150,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.grey[600],
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: Colors.black87,
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReminderItem(String text) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.only(top: 6, right: 8),
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: Color(0xFF2563EB),
                shape: BoxShape.circle,
              ),
            ),
          ),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 14,
                color: Colors.black87,
                height: 1.8,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatAppointmentType(String type) {
    return type
        .split('_')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }
}




