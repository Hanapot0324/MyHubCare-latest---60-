import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'screens/login.dart';
import 'screens/register.dart';
import 'screens/dashboard.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_fonts/google_fonts.dart';

Future<void> main() async {
  await dotenv.load(fileName: ".env");
  runApp(MyHubCaresApp());
}

class MyHubCaresApp extends StatelessWidget {
  MyHubCaresApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'My Hub Cares',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFFB82132),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFB82132),
          primary: const Color(0xFFB82132),
          secondary: const Color(0xFFD2665A),
        ).copyWith(
          background: Colors.white,
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: Colors.white,
        textTheme: kIsWeb 
            ? GoogleFonts.poppinsTextTheme(ThemeData.light().textTheme)
            : ThemeData.light().textTheme.apply(fontFamily: 'Poppins'),
        fontFamilyFallback: const ['Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'EmojiOne Color', 'Android Emoji'],
      ),
      home: Login(),
      routes: {
        '/login': (context) => Login(),
        '/register': (context) => Register(),
        '/dashboard': (context) => Dashboard(),
      },
    );
  }
}
