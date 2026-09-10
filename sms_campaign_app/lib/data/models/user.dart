import 'json_helpers.dart';

class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.accountScope,
    this.phoneNumber,
    this.permissions = const <String>[],
    this.companyId,
    this.companyName,
    this.companyPlan,
    this.companyStatus,
    this.createdAt,
    this.updatedAt,
    this.companyJoinedAt,
    this.membershipId,
    this.creatorName,
    this.creatorEmail,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final String accountScope;
  final String? phoneNumber;
  final List<String> permissions;
  final String? companyId;
  final String? companyName;
  final String? companyPlan;
  final String? companyStatus;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final DateTime? companyJoinedAt;
  final String? membershipId;
  final String? creatorName;
  final String? creatorEmail;

  bool get isAdmin => role == 'admin';
  bool can(String permission) => permissions.contains(permission);

  factory User.fromJson(Map<String, dynamic> json) {
    final company = json['company'];
    final creator = json['creator'];
    return User(
      id: pickId(json),
      name: '${json['name'] ?? 'User'}',
      email: '${json['email'] ?? ''}',
      role: '${json['role'] ?? 'viewer'}',
      accountScope: json['activeCompanyId'] != null
          ? 'tenant'
          : '${json['accountScope'] ?? 'platform'}',
      phoneNumber: json['phoneNumber']?.toString(),
      permissions: pickStringList(
        json['companyPermissions'] ?? json['permissions'],
      ),
      companyId: company is Map
          ? '${company['id'] ?? ''}'
          : json['activeCompanyId']?.toString(),
      companyName: company is Map
          ? company['name']?.toString()
          : _activeCompanyValue(json, 'name'),
      companyPlan: company is Map
          ? company['plan']?.toString()
          : _activeCompanyValue(json, 'plan'),
      companyStatus: company is Map
          ? company['status']?.toString()
          : _activeCompanyValue(json, 'status'),
      createdAt: pickDate(json['createdAt']),
      updatedAt: pickDate(json['updatedAt']),
      companyJoinedAt: pickDate(json['companyJoinedAt']),
      membershipId: json['membershipId']?.toString(),
      creatorName: creator is Map ? creator['name']?.toString() : null,
      creatorEmail: creator is Map ? creator['email']?.toString() : null,
    );
  }

  static String? _activeCompanyValue(Map<String, dynamic> json, String key) {
    final activeId = json['activeCompanyId']?.toString();
    final companies = json['companies'];
    if (activeId == null || companies is! List) return null;
    for (final item in companies.whereType<Map>()) {
      if (item['companyId']?.toString() == activeId) {
        return item[key]?.toString();
      }
    }
    return null;
  }
}
