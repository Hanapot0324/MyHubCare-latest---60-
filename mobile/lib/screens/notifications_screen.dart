import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'package:intl/intl.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = true;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getNotifications();
      if (result['success'] == true) {
        // Ensure data is a List
        final data = result['data'];
        List<dynamic> notificationsList = [];
        
        if (data is List) {
          notificationsList = data;
        } else if (data is Map) {
          // If it's a map, try to extract arrays
          notificationsList = data['in_app_messages'] ?? data['messages'] ?? [];
        }
        
        setState(() {
          _notifications = notificationsList;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result['message'] ?? 'Failed to load notifications')),
          );
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading notifications: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _refreshNotifications() async {
    setState(() => _isRefreshing = true);
    try {
      final result = await ApiService.getNotifications();
      if (result['success'] == true) {
        // Ensure data is a List
        final data = result['data'];
        List<dynamic> notificationsList = [];
        
        if (data is List) {
          notificationsList = data;
        } else if (data is Map) {
          // If it's a map, try to extract arrays
          notificationsList = data['in_app_messages'] ?? data['messages'] ?? [];
        }
        
        setState(() {
          _notifications = notificationsList;
          _isRefreshing = false;
        });
      } else {
        setState(() => _isRefreshing = false);
      }
    } catch (e) {
      setState(() => _isRefreshing = false);
    }
  }

  Future<void> _markAsRead(String messageId) async {
    final result = await ApiService.markNotificationAsRead(messageId);
    if (result['success'] == true) {
      setState(() {
        final index = _notifications.indexWhere((n) => n['message_id'] == messageId);
        if (index != -1) {
          _notifications[index]['read'] = true;
          _notifications[index]['is_read'] = true;
        }
      });
    }
  }

  void _showNotificationDetails(Map<String, dynamic> notification) {
    // Mark as read if unread
    final isRead = notification['read'] == true || notification['is_read'] == true;
    if (!isRead && notification['message_id'] != null) {
      _markAsRead(notification['message_id']);
    }

    // Show dialog with full details
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Container(
            constraints: BoxConstraints(maxWidth: 400, maxHeight: 600),
            padding: EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        notification['subject'] ?? notification['title'] ?? 'Notification',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: Icon(Icons.close),
                      color: Colors.grey[600],
                    ),
                  ],
                ),
                SizedBox(height: 16),
                Divider(),
                SizedBox(height: 16),
                // Content
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Message/Body
                        if (notification['body'] != null || notification['message'] != null)
                          Text(
                            notification['body'] ?? notification['message'] ?? '',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.black87,
                              height: 1.5,
                            ),
                          ),
                        SizedBox(height: 20),
                        // Details section
                        Container(
                          padding: EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Date/Time
                              _buildDetailRow(
                                '📅',
                                'Date & Time',
                                _formatDate(notification['created_at'] ?? 
                                           notification['timestamp'] ?? 
                                           notification['sent_at'] ?? ''),
                              ),
                              SizedBox(height: 12),
                              // Sender (if available)
                              if (notification['sender_name'] != null)
                                _buildDetailRow(
                                  '👤',
                                  'From',
                                  notification['sender_name'],
                                ),
                              if (notification['sender_name'] != null)
                                SizedBox(height: 12),
                              // Priority (if available)
                              if (notification['priority'] != null)
                                _buildDetailRow(
                                  '🚩',
                                  'Priority',
                                  notification['priority'].toString().toUpperCase(),
                                ),
                              if (notification['priority'] != null)
                                SizedBox(height: 12),
                              // Status
                              _buildDetailRow(
                                'ℹ️',
                                'Status',
                                (notification['read'] == true || notification['is_read'] == true)
                                    ? 'Read'
                                    : 'Unread',
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 20),
                // Close button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Color(0xFFB82132),
                      padding: EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      'Close',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(String emoji, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          emoji,
          style: TextStyle(fontSize: 20),
        ),
        SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.black87,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _markAllAsRead() async {
    final result = await ApiService.markAllNotificationsAsRead();
    if (result['success'] == true) {
      setState(() {
        for (var notification in _notifications) {
          notification['read'] = true;
          notification['is_read'] = true;
        }
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('All notifications marked as read')),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['message'] ?? 'Failed to mark all as read')),
        );
      }
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return 'Unknown date';
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final difference = now.difference(date);

      if (difference.inDays == 0) {
        if (difference.inHours == 0) {
          if (difference.inMinutes == 0) {
            return 'Just now';
          }
          return '${difference.inMinutes} minute${difference.inMinutes == 1 ? '' : 's'} ago';
        }
        return '${difference.inHours} hour${difference.inHours == 1 ? '' : 's'} ago';
      } else if (difference.inDays == 1) {
        return 'Yesterday';
      } else if (difference.inDays < 7) {
        return '${difference.inDays} days ago';
      } else {
        return DateFormat('MMM d, yyyy').format(date);
      }
    } catch (e) {
      return dateString;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => 
      n['read'] != true && n['is_read'] != true
    ).length;

    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications'),
        backgroundColor: Color(0xFFB82132),
        foregroundColor: Colors.white,
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: Text(
                'Mark all read',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refreshNotifications,
              child: _notifications.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.notifications_none, size: 64, color: Colors.grey[400]),
                          SizedBox(height: 16),
                          Text(
                            'No notifications',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'You\'re all caught up!',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: _notifications.length,
                      itemBuilder: (context, index) {
                        final notification = _notifications[index];
                        final isRead = notification['read'] == true || notification['is_read'] == true;
                        final messageId = notification['message_id'];

                        return InkWell(
                          onTap: () {
                            _showNotificationDetails(notification);
                          },
                          child: Container(
                            padding: EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isRead ? Colors.white : Color(0xFFEFF6FF),
                              border: Border(
                                bottom: BorderSide(
                                  color: Colors.grey[200]!,
                                  width: 1,
                                ),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Unread indicator
                                if (!isRead)
                                  Container(
                                    width: 8,
                                    height: 8,
                                    margin: EdgeInsets.only(top: 6, right: 12),
                                    decoration: BoxDecoration(
                                      color: Color(0xFF2563EB),
                                      shape: BoxShape.circle,
                                    ),
                                  )
                                else
                                  SizedBox(width: 20),
                                // Notification content
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        notification['subject'] ?? notification['title'] ?? 'Notification',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                                          color: Colors.black87,
                                        ),
                                      ),
                                      SizedBox(height: 4),
                                      Text(
                                        notification['body'] ?? notification['message'] ?? '',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey[700],
                                          height: 1.4,
                                        ),
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      SizedBox(height: 8),
                                      Text(
                                        _formatDate(notification['created_at'] ?? notification['timestamp']),
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[500],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // Icon
                                Icon(
                                  Icons.chevron_right,
                                  color: Colors.grey[400],
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

