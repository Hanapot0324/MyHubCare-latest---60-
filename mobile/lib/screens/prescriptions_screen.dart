import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({Key? key}) : super(key: key);

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  List<dynamic> _prescriptions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPrescriptions();
  }

  Future<void> _loadPrescriptions() async {
    setState(() => _isLoading = true);
    try {
      final result = await ApiService.getPrescriptions();
      if (result['success'] == true) {
        setState(() {
          _prescriptions = result['data'] as List;
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
        title: Text('My Prescriptions'),
        backgroundColor: Color(0xFF2563EB),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _prescriptions.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadPrescriptions,
                  child: ListView.builder(
                    padding: EdgeInsets.all(16),
                    itemCount: _prescriptions.length,
                    itemBuilder: (context, index) {
                      return _buildPrescriptionCard(_prescriptions[index]);
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
          Text('📋', style: TextStyle(fontSize: 64)),
          SizedBox(height: 20),
          Text(
            'No prescriptions yet',
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildPrescriptionCard(Map<String, dynamic> rx) {
    final date = rx['prescription_date'] != null
        ? DateTime.parse(rx['prescription_date'])
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Prescription #${rx['prescription_id'] ?? 'N/A'}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Color(0xFF10B981),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Active',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          if (date != null) ...[
            SizedBox(height: 8),
            Text(
              'Date: ${DateFormat('MMM dd, yyyy').format(date)}',
              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
            ),
          ],
          if (rx['items'] != null && (rx['items'] as List).isNotEmpty) ...[
            SizedBox(height: 12),
            Divider(),
            SizedBox(height: 12),
            ...(rx['items'] as List).map((item) => Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['medication_name'] ?? 'Medication',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        '${item['dosage'] ?? 'N/A'} - ${item['frequency'] ?? 'N/A'}',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                )),
          ],
          if (rx['next_refill_date'] != null) ...[
            SizedBox(height: 12),
            Text(
              '📅 Next refill: ${DateFormat('MMM dd, yyyy').format(DateTime.parse(rx['next_refill_date']))}',
              style: TextStyle(
                fontSize: 13,
                color: Color(0xFFF59E0B),
              ),
            ),
          ],
        ],
      ),
    );
  }
}




