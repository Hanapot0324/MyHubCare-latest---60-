# My Hub Cares Mobile App

Flutter mobile application for patients to manage their health records, appointments, medications, and more.

## Features

- ✅ User Authentication (Login/Register)
- ✅ Dashboard with health status overview
- ✅ Appointments management
- ✅ Medication reminders and adherence tracking
- ✅ Prescriptions viewing
- ✅ Lab results viewing
- ✅ Patient profile management

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile
flutter pub get
```

### 2. Configure API Base URL

The app automatically detects the platform and uses the appropriate base URL:
- **Android Emulator**: `http://10.0.2.2:5000/api`
- **iOS Simulator**: `http://localhost:5000/api`
- **Physical Device**: You need to update the base URL in `lib/services/api_service.dart` to use your computer's IP address (e.g., `http://192.168.1.100:5000/api`)

To find your computer's IP address:
- **Windows**: Run `ipconfig` in Command Prompt
- **Mac/Linux**: Run `ifconfig` in Terminal

### 3. Run the App

```bash
flutter run
```

## Project Structure

```
mobile/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── services/
│   │   └── api_service.dart     # Backend API communication
│   └── screens/
│       ├── login.dart           # Login screen
│       ├── register.dart        # Registration screen
│       ├── dashboard.dart      # Home/Dashboard screen
│       ├── appointments_screen.dart
│       ├── medications_screen.dart
│       ├── prescriptions_screen.dart
│       ├── lab_results_screen.dart
│       └── profile_screen.dart
└── pubspec.yaml                 # Dependencies
```

## API Integration

The app connects to the backend API at `http://localhost:5000/api`. All API calls are handled through the `ApiService` class which:

- Manages authentication tokens securely using `flutter_secure_storage`
- Handles all HTTP requests and responses
- Provides methods for:
  - Authentication (login/register)
  - Appointments
  - Medications/Reminders
  - Prescriptions
  - Lab Results
  - Patient Profile

## Backend Endpoints Used

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `GET /api/appointments` - Get appointments
- `POST /api/appointments` - Create appointment
- `GET /api/prescriptions` - Get prescriptions
- `GET /api/lab-results` - Get lab results
- `GET /api/medication-adherence/reminders` - Get medication reminders
- `GET /api/profile/me` - Get patient profile

## Notes

- The app uses secure storage for authentication tokens
- All API calls include authentication headers when a token is available
- The app automatically handles loading states and error messages
- Pull-to-refresh is available on list screens

## Troubleshooting

### Connection Issues

If you're having trouble connecting to the backend:

1. **Check if backend is running**: Make sure your backend server is running on port 5000
2. **Check base URL**: Verify the base URL in `api_service.dart` matches your setup
3. **Physical device**: If using a physical device, ensure:
   - Your phone and computer are on the same WiFi network
   - The IP address in `api_service.dart` matches your computer's IP
   - Firewall allows connections on port 5000

### Build Issues

If you encounter build errors:

```bash
flutter clean
flutter pub get
flutter run
```

## Development

To add new features:

1. Add API methods to `lib/services/api_service.dart`
2. Create new screens in `lib/screens/`
3. Update navigation in `lib/main.dart` or `lib/screens/dashboard.dart`


