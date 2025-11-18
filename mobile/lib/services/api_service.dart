import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiService {
  // Base URL configuration
  // 
  // IMPORTANT: Change this URL based on your setup:
  // - Web: 'http://localhost:5000/api'
  // - Android Emulator: 'http://10.0.2.2:5000/api'
  // - iOS Simulator: 'http://localhost:5000/api'
  // - Physical Device: Use your computer's IP, e.g., 'http://192.168.1.6:5000/api'
  // 
  // To find your computer's IP:
  // - Windows: Run 'ipconfig' in Command Prompt and look for IPv4 Address
  // - Mac/Linux: Run 'ifconfig' in Terminal
  static String get baseUrl {
    // Check if running on web
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }
    
    // For mobile platforms, use IP address for network access
    // Replace 192.168.1.6 with your actual local IP address
    // This allows the mobile app to connect via network
    return 'http://192.168.1.6:5000/api';
    
    // Alternative configurations:
    // For Android Emulator, use:
    // return 'http://10.0.2.2:5000/api';
    
    // For iOS Simulator, use:
    // return 'http://localhost:5000/api';
  }
  
  static const FlutterSecureStorage _storage = FlutterSecureStorage();
  
  // Get auth token
  static Future<String?> getToken() async {
    return await _storage.read(key: 'token');
  }
  
  // Save auth token
  static Future<void> saveToken(String token) async {
    await _storage.write(key: 'token', value: token);
  }
  
  // Remove auth token
  static Future<void> removeToken() async {
    await _storage.delete(key: 'token');
  }
  
  // Get headers with auth token
  static Future<Map<String, String>> getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
  
  // Login
  static Future<Map<String, dynamic>> login(String username, String password, {String role = 'patient'}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
          'role': role,
        }),
      );
      
      final data = jsonDecode(response.body);
      
      if (data['success'] == true && data['token'] != null) {
        await saveToken(data['token']);
        return {'success': true, 'user': data['user'], 'token': data['token']};
      }
      
      return {'success': false, 'message': data['message'] ?? 'Login failed'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Register
  static Future<Map<String, dynamic>> register(Map<String, dynamic> patientData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(patientData),
      );
      
      final data = jsonDecode(response.body);
      
      if (data['success'] == true && data['token'] != null) {
        await saveToken(data['token']);
        return {'success': true, 'user': data['user'], 'token': data['token']};
      }
      
      return {'success': false, 'message': data['message'] ?? 'Registration failed'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Get current user
  static Future<Map<String, dynamic>> getCurrentUser() async {
    try {
      final headers = await getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/auth/me'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'user': data['user']};
      }
      
      return {'success': false, 'message': 'Failed to get user info'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Get appointments
  static Future<Map<String, dynamic>> getAppointments({String? date}) async {
    try {
      final headers = await getHeaders();
      String url = '$baseUrl/appointments';
      if (date != null) {
        url = '$baseUrl/appointments/date/$date';
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data'] ?? []};
      }
      
      // Handle different error status codes
      String errorMessage = 'Failed to fetch appointments';
      try {
        final errorData = jsonDecode(response.body);
        errorMessage = errorData['message'] ?? errorMessage;
      } catch (_) {
        // If response body is not JSON, use default message
      }
      
      // Handle authentication errors
      if (response.statusCode == 401) {
        return {
          'success': false, 
          'message': errorMessage.isNotEmpty ? errorMessage : 'Authentication required. Please login again.'
        };
      }
      
      // Handle forbidden errors
      if (response.statusCode == 403) {
        return {
          'success': false, 
          'message': errorMessage.isNotEmpty ? errorMessage : 'Access denied. Invalid or expired token.'
        };
      }
      
      // Handle bad request errors
      if (response.statusCode == 400) {
        return {
          'success': false, 
          'message': errorMessage.isNotEmpty ? errorMessage : 'Invalid request. Please check your input.'
        };
      }
      
      // Handle not found errors
      if (response.statusCode == 404) {
        return {
          'success': false, 
          'message': errorMessage.isNotEmpty ? errorMessage : 'Appointments endpoint not found.'
        };
      }
      
      return {
        'success': false, 
        'message': '$errorMessage (Status: ${response.statusCode})'
      };
    } catch (e) {
      // Handle network errors
      if (e.toString().contains('Failed host lookup') || e.toString().contains('SocketException')) {
        return {
          'success': false, 
          'message': 'Network error: Cannot connect to server. Please check your internet connection.'
        };
      }
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Check availability
  static Future<Map<String, dynamic>> checkAvailability({
    required String facilityId,
    String? providerId,
    required String scheduledStart,
    required String scheduledEnd,
  }) async {
    try {
      final headers = await getHeaders();
      final params = {
        'facility_id': facilityId,
        'scheduled_start': scheduledStart,
        'scheduled_end': scheduledEnd,
      };
      if (providerId != null) {
        params['provider_id'] = providerId;
      }
      
      final uri = Uri.parse('$baseUrl/appointments/availability/check').replace(queryParameters: params);
      final response = await http.get(uri, headers: headers);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data']};
      }
      
      return {'success': false, 'message': 'Failed to check availability'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }

  // Create appointment
  static Future<Map<String, dynamic>> createAppointment(Map<String, dynamic> appointmentData) async {
    try {
      final headers = await getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/appointments'),
        headers: headers,
        body: jsonEncode(appointmentData),
      );
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data']};
      }
      
      // Handle different error status codes
      String errorMessage = 'Failed to create appointment';
      try {
        final errorData = jsonDecode(response.body);
        errorMessage = errorData['message'] ?? errorMessage;
      } catch (_) {
        // If response body is not JSON, use default message
      }
      
      // Handle authentication errors
      if (response.statusCode == 401) {
        return {
          'success': false, 
          'message': errorMessage.isNotEmpty ? errorMessage : 'Authentication required. Please login again.'
        };
      }
      
      // Handle forbidden errors
      if (response.statusCode == 403) {
        return {
          'success': false, 
          'message': errorMessage.isNotEmpty ? errorMessage : 'Access denied. Invalid or expired token.'
        };
      }
      
      // Handle bad request errors (validation errors)
      if (response.statusCode == 400) {
        return {
          'success': false, 
          'message': errorMessage.isNotEmpty ? errorMessage : 'Invalid request. Please check all required fields are filled.'
        };
      }
      
      // Handle not found errors
      if (response.statusCode == 404) {
        return {
          'success': false, 
          'message': errorMessage.isNotEmpty ? errorMessage : 'Patient, facility, or provider not found.'
        };
      }
      
      return {
        'success': false, 
        'message': '$errorMessage (Status: ${response.statusCode})'
      };
    } catch (e) {
      // Handle network errors
      if (e.toString().contains('Failed host lookup') || e.toString().contains('SocketException')) {
        return {
          'success': false, 
          'message': 'Network error: Cannot connect to server. Please check your internet connection.'
        };
      }
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Get patients
  static Future<Map<String, dynamic>> getPatients() async {
    try {
      final headers = await getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/patients?status=active'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['patients'] ?? data['data'] ?? []};
      }
      
      return {'success': false, 'message': 'Failed to fetch patients'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Get facilities
  static Future<Map<String, dynamic>> getFacilities() async {
    try {
      final headers = await getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/facilities'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data'] ?? []};
      }
      
      return {'success': false, 'message': 'Failed to fetch facilities'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Get providers (physicians/doctors)
  static Future<Map<String, dynamic>> getProviders({String? facilityId}) async {
    try {
      final headers = await getHeaders();
      String url = '$baseUrl/users/providers';
      if (facilityId != null) {
        url += '?facility_id=$facilityId';
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] && data['providers'] != null) {
          return {'success': true, 'data': data['providers']};
        }
        return {'success': true, 'data': []};
      }
      
      // Fallback to old endpoint for backward compatibility
      if (response.statusCode == 404 || response.statusCode == 403) {
        // Try old endpoint
        final oldResponse = await http.get(
          Uri.parse('$baseUrl/users'),
          headers: headers,
        );
        
        if (oldResponse.statusCode == 200) {
          final oldData = jsonDecode(oldResponse.body);
          List providers = [];
          if (oldData['success'] && oldData['users']) {
            providers = (oldData['users'] as List).where((u) => 
              u['role']?.toLowerCase() == 'physician'
            ).toList();
          }
          return {'success': true, 'data': providers};
        }
      }
      
      return {'success': false, 'message': 'Failed to fetch providers'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Get prescriptions
  static Future<Map<String, dynamic>> getPrescriptions({String? patientId}) async {
    try {
      final headers = await getHeaders();
      String url = '$baseUrl/prescriptions';
      if (patientId != null) {
        url += '?patient_id=$patientId';
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['prescriptions'] ?? data['data'] ?? []};
      }
      
      return {'success': false, 'message': 'Failed to fetch prescriptions'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Get lab results
  static Future<Map<String, dynamic>> getLabResults({String? patientId}) async {
    try {
      final headers = await getHeaders();
      String url = '$baseUrl/lab-results';
      if (patientId != null) {
        url += '?patient_id=$patientId';
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['results'] ?? data['data'] ?? []};
      }
      
      return {'success': false, 'message': 'Failed to fetch lab results'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Get medication reminders
  static Future<Map<String, dynamic>> getMedicationReminders({String? patientId}) async {
    try {
      final headers = await getHeaders();
      String url = '$baseUrl/medication-adherence/reminders';
      if (patientId != null) {
        url += '?patient_id=$patientId';
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['reminders'] ?? data['data'] ?? []};
      }
      
      return {'success': false, 'message': 'Failed to fetch reminders'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Create medication reminder
  static Future<Map<String, dynamic>> createMedicationReminder(Map<String, dynamic> reminderData) async {
    try {
      final headers = await getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/medication-adherence/reminders'),
        headers: headers,
        body: jsonEncode(reminderData),
      );
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data']};
      }
      
      final error = jsonDecode(response.body);
      return {'success': false, 'message': error['message'] ?? 'Failed to create reminder'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
  
  // Get patient profile
  static Future<Map<String, dynamic>> getPatientProfile() async {
    try {
      final headers = await getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/profile/me'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'patient': data['patient']};
      }
      
      return {'success': false, 'message': 'Failed to fetch profile'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }

  // Get notifications
  static Future<Map<String, dynamic>> getNotifications({String? type}) async {
    try {
      final headers = await getHeaders();
      String url = '$baseUrl/notifications';
      if (type != null) {
        url += '?type=$type';
      } else {
        url += '?type=in_app';
      }
      
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Handle the response structure: data can be an object with in_app_messages and push_notifications
        // or it can be a direct array
        List<dynamic> notifications = [];
        
        if (data['success'] == true && data['data'] != null) {
          if (data['data'] is List) {
            // Direct array
            notifications = data['data'];
          } else if (data['data'] is Map) {
            // Object with in_app_messages and push_notifications
            final dataMap = data['data'] as Map<String, dynamic>;
            if (type == 'in_app' || type == null) {
              notifications = dataMap['in_app_messages'] ?? [];
            } else if (type == 'push') {
              notifications = dataMap['push_notifications'] ?? [];
            } else {
              // Combine both for 'all' type
              final inApp = dataMap['in_app_messages'] ?? [];
              final push = dataMap['push_notifications'] ?? [];
              notifications = [...inApp, ...push];
            }
          }
        } else if (data['messages'] != null && data['messages'] is List) {
          notifications = data['messages'];
        }
        
        return {'success': true, 'data': notifications};
      }
      
      return {'success': false, 'message': 'Failed to fetch notifications'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }

  // Get unread notification count
  static Future<Map<String, dynamic>> getUnreadNotificationCount() async {
    try {
      final headers = await getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/notifications/unread-count'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'count': data['count'] ?? 0};
      }
      
      return {'success': false, 'count': 0};
    } catch (e) {
      return {'success': false, 'count': 0};
    }
  }

  // Mark notification as read
  static Future<Map<String, dynamic>> markNotificationAsRead(String messageId) async {
    try {
      final headers = await getHeaders();
      final response = await http.put(
        Uri.parse('$baseUrl/notifications/$messageId/read'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data};
      }
      
      return {'success': false, 'message': 'Failed to mark notification as read'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }

  // Mark all notifications as read
  static Future<Map<String, dynamic>> markAllNotificationsAsRead() async {
    try {
      final headers = await getHeaders();
      final response = await http.put(
        Uri.parse('$baseUrl/notifications/read-all'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data};
      }
      
      return {'success': false, 'message': 'Failed to mark all notifications as read'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }

  // Record medication adherence (taken/missed)
  static Future<Map<String, dynamic>> recordMedicationAdherence({
    required String prescriptionId,
    required String patientId,
    required String adherenceDate,
    required bool taken,
    String? missedReason,
  }) async {
    try {
      final headers = await getHeaders();
      final response = await http.post(
        Uri.parse('$baseUrl/medication-adherence'),
        headers: headers,
        body: jsonEncode({
          'prescription_id': prescriptionId,
          'patient_id': patientId,
          'adherence_date': adherenceDate,
          'taken': taken,
          if (missedReason != null) 'missed_reason': missedReason,
        }),
      );
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data']};
      }
      
      String errorMessage = 'Failed to record medication adherence';
      try {
        final errorData = jsonDecode(response.body);
        errorMessage = errorData['message'] ?? errorMessage;
      } catch (_) {}
      
      return {'success': false, 'message': errorMessage};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }

  // Get medication adherence records
  static Future<Map<String, dynamic>> getMedicationAdherence({
    String? patientId,
    String? prescriptionId,
    String? startDate,
    String? endDate,
  }) async {
    try {
      final headers = await getHeaders();
      final params = <String, String>{};
      if (patientId != null) params['patient_id'] = patientId;
      if (prescriptionId != null) params['prescription_id'] = prescriptionId;
      if (startDate != null) params['start_date'] = startDate;
      if (endDate != null) params['end_date'] = endDate;
      
      final uri = Uri.parse('$baseUrl/medication-adherence').replace(queryParameters: params);
      final response = await http.get(uri, headers: headers);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data'] ?? [], 'summary': data['summary']};
      }
      
      return {'success': false, 'message': 'Failed to fetch adherence records'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }

  // Get adherence statistics for a prescription
  static Future<Map<String, dynamic>> getPrescriptionAdherenceStatistics(String prescriptionId) async {
    try {
      final headers = await getHeaders();
      final response = await http.get(
        Uri.parse('$baseUrl/medication-adherence/prescription/$prescriptionId/statistics'),
        headers: headers,
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data']};
      }
      
      return {'success': false, 'message': 'Failed to fetch adherence statistics'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }

  // Get patient adherence records
  static Future<Map<String, dynamic>> getPatientAdherence({
    required String patientId,
    String? startDate,
    String? endDate,
  }) async {
    try {
      final headers = await getHeaders();
      final params = <String, String>{};
      if (startDate != null) params['start_date'] = startDate;
      if (endDate != null) params['end_date'] = endDate;
      
      final uri = Uri.parse('$baseUrl/medication-adherence/patient/$patientId').replace(queryParameters: params);
      final response = await http.get(uri, headers: headers);
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': true, 'data': data['data'] ?? [], 'summary': data['summary']};
      }
      
      return {'success': false, 'message': 'Failed to fetch patient adherence'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: ${e.toString()}'};
    }
  }
}

