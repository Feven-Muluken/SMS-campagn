import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/services/storage_service.dart';
import 'core/theme/app_theme.dart';
import 'data/providers/app_providers.dart';
import 'routes/app_routes.dart';

/// Root widget: wires providers, theme and routes.
class SmsCampaignApp extends StatelessWidget {
  const SmsCampaignApp({super.key, required this.storage});

  final StorageService storage;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: buildAppProviders(storage),
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        initialRoute: storage.hasSession ? AppRoutes.home : AppRoutes.login,
        // Role is re-read on every navigation so the guard stays current.
        onGenerateRoute: (settings) => AppRoutes.onGenerateRoute(settings,
            isAdmin: storage.currentUser?.role == 'admin'),
      ),
    );
  }
}
