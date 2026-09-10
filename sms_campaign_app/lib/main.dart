import 'package:flutter/material.dart';

import 'app.dart';
import 'core/services/storage_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(SmsCampaignApp(storage: await StorageService.init()));
}
