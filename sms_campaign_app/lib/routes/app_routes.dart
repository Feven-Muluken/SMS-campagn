import 'package:flutter/material.dart';

import '../data/models/contact.dart';
import '../data/models/campaign.dart';
import '../features/auth/screens/forgot_password_screen.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/reset_otp_screen.dart';
import '../features/appointments/screens/appointments_screen.dart';
import '../features/campaigns/screens/create_campaign_screen.dart';
import '../features/campaigns/screens/campaign_list_screen.dart';
import '../features/contacts/screens/contact_form_screen.dart';
import '../features/contacts/screens/group_detail_screen.dart';
import '../features/home/screens/home_shell.dart';
import '../features/reports/screens/delivery_log_screen.dart';
import '../features/premium/screens/billing_sms_screen.dart';
import '../features/premium/screens/geo_sms_screen.dart';
import '../features/premium/screens/inbox_chat_screen.dart';
import '../features/sender_ids/screens/request_sender_id_screen.dart';
import '../features/sender_ids/screens/sender_id_list_screen.dart';
import '../features/settings/screens/companies_screen.dart';
import '../features/settings/screens/users_screen.dart';

/// Named route constants and the route table.
abstract final class AppRoutes {
  static const String login = '/login';
  static const String forgotPassword = '/forgot-password';
  static const String verifyResetOtp = '/verify-reset-otp';
  static const String home = '/home';
  static const String campaignCreate = '/campaigns/create';
  static const String campaigns = '/campaigns';
  static const String contactForm = '/contacts/form';
  static const String groupDetail = '/groups/detail';
  static const String senderIds = '/sender-ids';
  static const String senderIdRequest = '/sender-ids/request';
  static const String deliveryLog = '/reports/log';
  static const String users = '/settings/users';
  static const String companies = '/settings/companies';
  static const String appointments = '/appointments';
  static const String inboxChat = '/inbox-chat';
  static const String geoSms = '/geo-sms';
  static const String billingSms = '/billing-sms';

  /// Routes only an admin may open; other roles are bounced to [home].
  static const Set<String> adminOnly = {users, companies};

  static Route<dynamic> onGenerateRoute(
    RouteSettings settings, {
    required bool isAdmin,
  }) {
    final restricted = adminOnly.contains(settings.name) && !isAdmin;
    final Widget page = restricted
        ? const HomeShell()
        : switch (settings.name) {
            login => const LoginScreen(),
            forgotPassword => const ForgotPasswordScreen(),
            verifyResetOtp => ResetOtpScreen(
              arguments: settings.arguments as ResetOtpArguments,
            ),
            home => const HomeShell(),
            campaignCreate => CreateCampaignScreen(
              campaign: settings.arguments as Campaign?,
            ),
            campaigns => const CampaignListScreen(),
            contactForm => ContactFormScreen(
              contact: settings.arguments as Contact?,
            ),
            groupDetail => GroupDetailScreen(
              groupId: settings.arguments as String,
            ),
            senderIds => const SenderIdListScreen(),
            senderIdRequest => const RequestSenderIdScreen(),
            deliveryLog => const DeliveryLogScreen(),
            users => const UsersScreen(),
            companies => const CompaniesScreen(),
            appointments => const AppointmentsScreen(),
            inboxChat => const InboxChatScreen(),
            geoSms => const GeoSmsScreen(),
            billingSms => const BillingSmsScreen(),
            _ => const LoginScreen(),
          };
    return MaterialPageRoute<dynamic>(builder: (_) => page, settings: settings);
  }
}
