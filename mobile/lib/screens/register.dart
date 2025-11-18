import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import 'dashboard.dart';

class Register extends StatefulWidget {
  const Register({Key? key}) : super(key: key);

  @override
  _RegisterState createState() => _RegisterState();
}

class _RegisterState extends State<Register> {
  // State variables
  int currentStep = 0;
  bool _isSubmitting = false;
  String generatedUIC = '';
  final _formKey = GlobalKey<FormState>();

  // Step 1: Personal Info
  final firstNameController = TextEditingController();
  final middleNameController = TextEditingController();
  final lastNameController = TextEditingController();
  String suffix = '';
  DateTime? birthDate;
  String sex = 'M';
  String civilStatus = '';
  final nationalityController = TextEditingController(text: 'Filipino');

  // Parent info
  final motherNameController = TextEditingController();
  final fatherNameController = TextEditingController();
  final birthOrderController = TextEditingController(text: '1');

  // Step 2: Contact & Branch
  final phoneController = TextEditingController();
  final emailController = TextEditingController();
  final addressController = TextEditingController();
  final cityController = TextEditingController();
  final provinceController = TextEditingController();
  final philhealthController = TextEditingController();
  int selectedBranch = 1;

  // Step 3: Account
  final usernameController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmPasswordController = TextEditingController();
  bool termsConsent = false;
  bool dataConsent = false;
  bool smsConsent = false;

  // Constants
  final List<String> branches = const [
    '🏥 MHC Ortigas Main',
    '🏥 MHC Pasay',
    '🏥 MHC Alabang',
  ];

  // Navigation methods
  void nextStep() {
    // Special validation for step 0 (Personal Info) - check birthDate
    if (currentStep == 0 && birthDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select your date of birth'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    // Validate current step
    if (_formKey.currentState?.validate() ?? false) {
      if (currentStep < 2) {
        setState(() {
          currentStep++;
        });
      } else {
        // On last step, validate and submit
        if (_formKey.currentState?.validate() ?? false) {
          submitRegistration();
        }
      }
    } else {
      // Show validation error
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill in all required fields correctly'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void previousStep() {
    if (currentStep > 0) {
      setState(() => currentStep--);
    }
  }

  // Registration methods
  Future<void> submitRegistration() async {
    if (!termsConsent || !dataConsent) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please accept the required consents')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Prepare registration data
      final registrationData = {
        'username': usernameController.text.trim(),
        'password': passwordController.text,
        'email': emailController.text.trim().isEmpty ? null : emailController.text.trim(),
        'full_name': '${firstNameController.text} ${lastNameController.text}',
        'role': 'patient',
        'first_name': firstNameController.text,
        'middle_name': middleNameController.text.isEmpty ? null : middleNameController.text,
        'last_name': lastNameController.text,
        'suffix': suffix.isEmpty ? null : suffix,
        'birth_date': birthDate?.toIso8601String().split('T')[0],
        'sex': sex,
        'civil_status': civilStatus,
        'nationality': nationalityController.text,
        'contact_phone': phoneController.text,
        'email': emailController.text.trim().isEmpty ? null : emailController.text.trim(),
        'address': addressController.text,
        'city': cityController.text,
        'province': provinceController.text,
        'philhealth_number': philhealthController.text.isEmpty ? null : philhealthController.text,
        'facility_id': selectedBranch.toString(),
        'mother_name': motherNameController.text,
        'father_name': fatherNameController.text,
        'birth_order': int.tryParse(birthOrderController.text) ?? 1,
      };

      final result = await ApiService.register(registrationData);

      if (result['success'] == true) {
        // Save user info
        final prefs = await SharedPreferences.getInstance();
        if (result['user'] != null) {
          await prefs.setString('user', jsonEncode(result['user']));
        }

        // Generate UIC for display
        String mother = motherNameController.text;
        String father = fatherNameController.text;
        String birthOrder = birthOrderController.text.padLeft(2, '0');
        String date = birthDate != null
            ? "${birthDate!.month.toString().padLeft(2, '0')}-${birthDate!.day.toString().padLeft(2, '0')}-${birthDate!.year}"
            : '';
        generatedUIC =
            "${mother.substring(0, 2).toUpperCase()}${father.substring(0, 2).toUpperCase()}$birthOrder$date";

        setState(() {
          currentStep = 3; // Success screen
          _isSubmitting = false;
        });
      } else {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Registration failed'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Connection error: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  // UI Components
  Widget _buildPersonalInfoStep() {
    return SingleChildScrollView(
      child: Column(
        children: [
          TextFormField(
            controller: firstNameController,
            decoration: const InputDecoration(labelText: 'First Name *'),
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
          TextFormField(
            controller: middleNameController,
            decoration: const InputDecoration(labelText: 'Middle Name'),
          ),
          TextFormField(
            controller: lastNameController,
            decoration: const InputDecoration(labelText: 'Last Name *'),
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
          DropdownButtonFormField<String>(
            value: suffix.isEmpty ? null : suffix,
            decoration: const InputDecoration(labelText: 'Suffix'),
            items: const ['None', 'Jr.', 'Sr.', 'II', 'III']
                .map((s) => DropdownMenuItem(
                      value: s == 'None' ? '' : s,
                      child: Text(s),
                    ))
                .toList(),
            onChanged: (val) => setState(() => suffix = val!),
          ),
          const SizedBox(height: 10),
          InputDatePickerFormField(
            firstDate: DateTime(1900),
            lastDate: DateTime.now(),
            initialDate: birthDate ?? DateTime(2000),
            fieldLabelText: 'Date of Birth *',
            onDateSubmitted: (val) {
              setState(() => birthDate = val);
            },
            onDateSaved: (val) {
              setState(() => birthDate = val);
            },
          ),
          if (birthDate == null && currentStep == 0)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Please select your date of birth',
                style: TextStyle(color: Colors.red[700], fontSize: 12),
              ),
            ),
          const SizedBox(height: 10),
          Row(
            children: [
              Flexible(
                child: RadioListTile(
                  title: const Text('👨 Male'),
                  value: 'M',
                  groupValue: sex,
                  onChanged: (val) => setState(() => sex = val!),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              Flexible(
                child: RadioListTile(
                  title: const Text('👩 Female'),
                  value: 'F',
                  groupValue: sex,
                  onChanged: (val) => setState(() => sex = val!),
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
          DropdownButtonFormField<String>(
            value: civilStatus.isEmpty ? null : civilStatus,
            decoration: const InputDecoration(labelText: 'Civil Status *'),
            validator: (val) => val == null || val.isEmpty ? 'Required' : null,
            items: const ['Single', 'Married', 'Widowed', 'Separated']
                .map((s) => DropdownMenuItem(
                      value: s,
                      child: Text(s),
                    ))
                .toList(),
            onChanged: (val) => setState(() => civilStatus = val!),
          ),
          TextFormField(
            controller: nationalityController,
            decoration: const InputDecoration(labelText: 'Nationality'),
          ),
          const SizedBox(height: 20),
          const Text('Parent Information (for UIC)',
              style: TextStyle(fontWeight: FontWeight.bold)),
          TextFormField(
            controller: motherNameController,
            decoration: const InputDecoration(labelText: "Mother's Name *"),
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
          TextFormField(
            controller: fatherNameController,
            decoration: const InputDecoration(labelText: "Father's Name *"),
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
          TextFormField(
            controller: birthOrderController,
            decoration: const InputDecoration(labelText: 'Birth Order *'),
            keyboardType: TextInputType.number,
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
        ],
      ),
    );
  }

  Widget _buildContactInfoStep() {
    return SingleChildScrollView(
      child: Column(
        children: [
          TextFormField(
            controller: phoneController,
            decoration: const InputDecoration(labelText: 'Mobile Number *'),
            keyboardType: TextInputType.phone,
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
          TextFormField(
            controller: emailController,
            decoration: const InputDecoration(labelText: 'Email Address'),
          ),
          TextFormField(
            controller: addressController,
            decoration: const InputDecoration(labelText: 'Street Address *'),
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
          TextFormField(
            controller: cityController,
            decoration: const InputDecoration(labelText: 'City *'),
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
          TextFormField(
            controller: provinceController,
            decoration: const InputDecoration(labelText: 'Province *'),
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
          TextFormField(
            controller: philhealthController,
            decoration: const InputDecoration(labelText: 'PhilHealth Number'),
          ),
          const SizedBox(height: 20),
          const Text('Choose Your Branch',
              style: TextStyle(fontWeight: FontWeight.bold)),
          ...List.generate(branches.length, (index) {
            return RadioListTile(
              title: Text(branches[index]),
              value: index + 1,
              groupValue: selectedBranch,
              onChanged: (val) => setState(() => selectedBranch = val as int),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildAccountStep() {
    return SingleChildScrollView(
      child: Column(
        children: [
          TextFormField(
            controller: usernameController,
            decoration: const InputDecoration(labelText: 'Username *'),
            validator: (value) => value!.isEmpty ? 'Required' : null,
          ),
          TextFormField(
            controller: passwordController,
            decoration: const InputDecoration(labelText: 'Password *'),
            obscureText: true,
            validator: (value) => value!.length < 6 ? 'Min 6 chars' : null,
          ),
          TextFormField(
            controller: confirmPasswordController,
            decoration: const InputDecoration(labelText: 'Confirm Password *'),
            obscureText: true,
            validator: (value) => value != passwordController.text
                ? 'Passwords do not match'
                : null,
          ),
          CheckboxListTile(
            value: termsConsent,
            title: const Text(
                'I agree to the Terms and Conditions and Privacy Policy *'),
            onChanged: (val) => setState(() => termsConsent = val!),
          ),
          CheckboxListTile(
            value: dataConsent,
            title: const Text(
                'I consent to the collection and processing of my health information *'),
            onChanged: (val) => setState(() => dataConsent = val!),
          ),
          CheckboxListTile(
            value: smsConsent,
            title: const Text(
                'I agree to receive appointment reminders and health updates via SMS and email'),
            onChanged: (val) => setState(() => smsConsent = val!),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessScreen() {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🏠 My Hub Cares'),
        backgroundColor: const Color(0xFFB82132),
      ),
      body: Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle, size: 80, color: Color(0xFF10B981)),
            const SizedBox(height: 20),
            const Text(
              'Registration Successful!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Your UIC: $generatedUIC',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFFB82132),
              ),
            ),
            const SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (context) => const Dashboard()),
                    (route) => false,
                  );
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFFB82132),
                ),
                child: const Text('Go to Dashboard'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepperControls(BuildContext context, ControlsDetails details) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          if (details.stepIndex > 0)
            Expanded(
              child: OutlinedButton(
                onPressed: details.onStepCancel,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  side: const BorderSide(color: Color(0xFFB82132)),
                ),
                child: const Text('Back'),
              ),
            ),
          if (details.stepIndex > 0) const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : details.onStepContinue,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
                backgroundColor: const Color(0xFFB82132),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      details.stepIndex == 2 ? 'Submit' : 'Continue',
                      overflow: TextOverflow.ellipsis,
                    ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Show success screen if registration is complete
    if (currentStep == 3) {
      return _buildSuccessScreen();
    }

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('🏠 My Hub Cares'),
        backgroundColor: const Color(0xFFB82132),
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: Stepper(
          type: StepperType.horizontal,
          currentStep: currentStep > 2 ? 2 : currentStep,
          onStepContinue: nextStep,
          onStepCancel: previousStep,
          controlsBuilder: _buildStepperControls,
          steps: [
            Step(
              title: const Text('Personal'),
              isActive: currentStep >= 0,
              content: _buildPersonalInfoStep(),
            ),
            Step(
              title: const Text('Contact'),
              isActive: currentStep >= 1,
              content: _buildContactInfoStep(),
            ),
            Step(
              title: const Text('Account'),
              isActive: currentStep >= 2,
              content: _buildAccountStep(),
            ),
          ],
        ),
      ),
    );
  }
}