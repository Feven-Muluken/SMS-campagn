import 'json_helpers.dart';

class Company {
  const Company({
    required this.id,
    required this.name,
    required this.plan,
    required this.status,
    this.slug,
    this.contactEmail,
    this.contactPhone,
    this.timezone,
    this.permissions = const <String>[],
    this.membersCount = 0,
    this.createdAt,
    this.updatedAt,
    this.creatorName,
    this.creatorEmail,
  });

  final String id;
  final String name;

  /// `starter`, `growth` or `enterprise`.
  final String plan;

  /// `trial`, `active` or `suspended`.
  final String status;
  final String? slug;
  final String? contactEmail;
  final String? contactPhone;
  final String? timezone;
  final List<String> permissions;
  final int membersCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? creatorName;
  final String? creatorEmail;

  factory Company.fromJson(Map<String, dynamic> json) {
    final creator = json['creator'];
    return Company(
      id: pickId(json),
      name: '${json['name'] ?? ''}',
      plan: '${json['plan'] ?? 'starter'}',
      status: '${json['status'] ?? 'trial'}',
      slug: json['slug']?.toString(),
      contactEmail: json['contactEmail']?.toString(),
      contactPhone: json['contactPhone']?.toString(),
      timezone: json['timezone']?.toString(),
      permissions: pickStringList(json['permissions']),
      membersCount: int.tryParse('${json['membersCount'] ?? 0}') ?? 0,
      createdAt: pickDate(json['createdAt']),
      updatedAt: pickDate(json['updatedAt']),
      creatorName: creator is Map ? creator['name']?.toString() : null,
      creatorEmail: creator is Map ? creator['email']?.toString() : null,
    );
  }
}
