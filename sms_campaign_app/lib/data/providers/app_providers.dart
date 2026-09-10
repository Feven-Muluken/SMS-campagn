import 'package:provider/provider.dart';
import 'package:provider/single_child_widget.dart';

import '../../core/services/api_service.dart';
import '../../core/services/storage_service.dart';
import '../repositories/admin_repository.dart';
import '../repositories/appointment_repository.dart';
import '../repositories/auth_repository.dart';
import '../repositories/campaign_repository.dart';
import '../repositories/contact_repository.dart';
import '../repositories/group_repository.dart';
import '../repositories/sender_id_repository.dart';
import '../repositories/sms_repository.dart';
import 'appointments_provider.dart';
import 'auth_provider.dart';
import 'campaigns_provider.dart';
import 'contacts_provider.dart';
import 'groups_provider.dart';
import 'reports_provider.dart';
import 'sender_id_provider.dart';

/// All app-wide providers (services, repositories, state) wired in one place.
List<SingleChildWidget> buildAppProviders(StorageService storage) => [
      Provider<StorageService>.value(value: storage),
      Provider<ApiService>(create: (_) => ApiService(storage)),
      Provider<AuthRepository>(
          create: (c) => AuthRepository(c.read<ApiService>())),
      Provider<ContactRepository>(
          create: (c) => ContactRepository(c.read<ApiService>())),
      Provider<GroupRepository>(
          create: (c) => GroupRepository(c.read<ApiService>())),
      Provider<CampaignRepository>(
          create: (c) => CampaignRepository(c.read<ApiService>())),
      Provider<SmsRepository>(
          create: (c) => SmsRepository(c.read<ApiService>())),
      Provider<AppointmentRepository>(
          create: (c) => AppointmentRepository(c.read<ApiService>())),
      Provider<AdminRepository>(
          create: (c) => AdminRepository(c.read<ApiService>())),
      Provider<SenderIdRepository>(
          create: (c) => SenderIdRepository(c.read<ApiService>())),
      ChangeNotifierProvider<AuthProvider>(
          create: (c) => AuthProvider(c.read<AuthRepository>(), storage)
            ..restoreSession()),
      ChangeNotifierProvider<ContactsProvider>(
          create: (c) => ContactsProvider(c.read<ContactRepository>())),
      ChangeNotifierProvider<GroupsProvider>(
          create: (c) => GroupsProvider(c.read<GroupRepository>())),
      ChangeNotifierProvider<CampaignsProvider>(
          create: (c) => CampaignsProvider(
              c.read<CampaignRepository>(), c.read<SmsRepository>())),
      ChangeNotifierProvider<AppointmentsProvider>(
          create: (c) => AppointmentsProvider(c.read<AppointmentRepository>())),
      ChangeNotifierProvider<ReportsProvider>(
          create: (c) => ReportsProvider(c.read<SmsRepository>())),
      ChangeNotifierProvider<SenderIdProvider>(
          create: (c) => SenderIdProvider(c.read<SenderIdRepository>())),
    ];
