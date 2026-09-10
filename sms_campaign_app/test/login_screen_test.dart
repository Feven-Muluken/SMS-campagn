import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sms_campaign_app/core/services/api_service.dart';
import 'package:sms_campaign_app/core/services/storage_service.dart';
import 'package:sms_campaign_app/core/services/token_store.dart';
import 'package:sms_campaign_app/data/providers/auth_provider.dart';
import 'package:sms_campaign_app/data/repositories/auth_repository.dart';
import 'package:sms_campaign_app/features/auth/screens/login_screen.dart';

void main() {
  testWidgets('login screen renders email, password and sign-in button',
      (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final storage = await StorageService.init(tokenStore: MemoryTokenStore());

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<StorageService>.value(value: storage),
          ChangeNotifierProvider<AuthProvider>(
            create: (_) =>
                AuthProvider(AuthRepository(ApiService(storage)), storage),
          ),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Email'), findsWidgets);
    expect(find.text('Password'), findsWidgets);
    expect(find.text('Login'), findsWidgets);
    expect(find.text('Remember me'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });

  testWidgets('login form validates empty fields', (tester) async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final storage = await StorageService.init(tokenStore: MemoryTokenStore());

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider<StorageService>.value(value: storage),
          ChangeNotifierProvider<AuthProvider>(
            create: (_) =>
                AuthProvider(AuthRepository(ApiService(storage)), storage),
          ),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.widgetWithText(ElevatedButton, 'Login'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Login'));
    await tester.pumpAndSettle();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
  });
}
