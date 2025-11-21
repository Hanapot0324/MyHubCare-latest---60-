import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';

class LabResultsScreen extends StatefulWidget {
  const LabResultsScreen({Key? key}) : super(key: key);

  @override
  State<LabResultsScreen> createState() => _LabResultsScreenState();
}

class _LabResultsScreenState extends State<LabResultsScreen> {
  List<dynamic> _labResults = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadLabResults();
  }

  Future<void> _loadLabResults() async {
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getLabResults();
      if (result['success'] == true) {
        setState(() {
          _labResults = result['data'] as List;
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Lab Results'),
        backgroundColor: Color(0xFF2563EB),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _labResults.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadLabResults,
                  child: ListView.builder(
                    padding: EdgeInsets.all(16),
                    itemCount: _labResults.length,
                    itemBuilder: (context, index) {
                      return _buildLabResultCard(_labResults[index]);
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('🧪', style: TextStyle(fontSize: 64)),
          SizedBox(height: 20),
          Text(
            'No lab results yet',
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildLabResultCard(Map<String, dynamic> test) {
    final date = test['result_date'] != null
        ? DateTime.parse(test['result_date'])
        : null;

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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            test['test_name'] ?? 'Lab Test',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 12),
          Text(
            '${test['result_value'] ?? 'N/A'} ${test['result_unit'] ?? ''}',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2563EB),
            ),
          ),
          if (date != null) ...[
            SizedBox(height: 12),
            Text(
              '📅 ${DateFormat('MMM dd, yyyy').format(date)}',
              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
            ),
          ],
          if (test['lab_code'] != null) ...[
            SizedBox(height: 4),
            Text(
              'Lab Code: ${test['lab_code']}',
              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
            ),
          ],
        ],
      ),
    );
  }
}




