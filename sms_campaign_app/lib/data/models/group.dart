import 'json_helpers.dart';

class Group {
  const Group({
    required this.id,
    required this.name,
    this.members = const <String>[],
    this.ownerName,
    this.ownerEmail,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;

  /// Contact IDs (or populated contact maps reduced to IDs).
  final List<String> members;
  final String? ownerName;
  final String? ownerEmail;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  int get memberCount => members.length;

  factory Group.fromJson(Map<String, dynamic> json) {
    final owner = json['owner'];
    return Group(
      id: pickId(json),
      name: '${json['name'] ?? ''}',
      members: pickStringList(json['members']),
      ownerName: owner is Map ? '${owner['name'] ?? ''}' : null,
      ownerEmail: owner is Map ? '${owner['email'] ?? ''}' : null,
      createdAt: pickDate(json['createdAt']),
      updatedAt: pickDate(json['updatedAt']),
    );
  }
}
