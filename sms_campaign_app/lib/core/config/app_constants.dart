/// Application-wide constants: API defaults, storage keys and shared patterns.
abstract final class AppConstants {
  /// Override at build time with `--dart-define=API_BASE_URL=https://api.example.com`.
  /// Defaults to the production Railway API; development and staging builds
  /// can override it with --dart-define and users may configure it at login.
  static const String defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://smsbackend-production-fc8c.up.railway.app',
  );

  // SharedPreferences keys.
  static const String keyAuthToken = 'auth_token';
  static const String keyRefreshToken = 'refresh_token';
  static const String keyUserId = 'user_id';
  static const String keyUserName = 'user_name';
  static const String keyUserEmail = 'user_email';
  static const String keyUserRole = 'user_role';
  static const String keyUserAccountScope = 'user_account_scope';
  static const String keyUserPermissions = 'user_permissions';
  static const String keyCompanyId = 'company_id';
  static const String keyCompanyName = 'company_name';
  static const String keyCompanyPlan = 'company_plan';
  static const String keyCompanyStatus = 'company_status';
  static const String keyServerUrl = 'server_url';
  static const String keySenderIdRequests = 'sender_id_requests';

  /// Sender IDs: 1-11 alphanumeric characters (same rule the backend enforces).
  static final RegExp senderIdPattern = RegExp(r'^[A-Za-z0-9]{1,11}$');

  /// Campaign type enum values accepted by the backend.
  static const List<String> campaignTypes = <String>[
    'individual',
    'group',
    'broadcast/everyone',
  ];

  /// Sender ID request statuses (tracked locally).
  static const String senderIdPending = 'pending';
  static const String senderIdApproved = 'approved';
  static const String senderIdRejected = 'rejected';
}
