import 'json_helpers.dart';

class Contact {
  const Contact({
    required this.id,
    required this.name,
    required this.phoneNumber,
    this.groups = const <String>[],
    this.groupNames = const <String>[],
    this.locationName,
    this.latitude,
    this.longitude,
    this.creatorName,
    this.creatorEmail,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String phoneNumber;

  /// IDs of the groups this contact belongs to.
  final List<String> groups;
  final List<String> groupNames;
  final String? locationName;
  final double? latitude;
  final double? longitude;
  final String? creatorName;
  final String? creatorEmail;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory Contact.fromJson(Map<String, dynamic> json) {
    final rawGroups = json['groups'];
    final location = json['location'];
    final creator = json['creator'];
    return Contact(
      id: pickId(json),
      name: '${json['name'] ?? ''}',
      phoneNumber: '${json['phoneNumber'] ?? ''}',
      groups: pickStringList(json['groups']),
      groupNames: rawGroups is List
          ? rawGroups
                .whereType<Map>()
                .map((group) => '${group['name'] ?? ''}')
                .where((name) => name.isNotEmpty)
                .toList()
          : const <String>[],
      locationName: location is Map
          ? location['locationName']?.toString()
          : null,
      latitude: location is Map
          ? double.tryParse('${location['latitude'] ?? ''}')
          : null,
      longitude: location is Map
          ? double.tryParse('${location['longitude'] ?? ''}')
          : null,
      creatorName: creator is Map ? creator['name']?.toString() : null,
      creatorEmail: creator is Map ? creator['email']?.toString() : null,
      createdAt: pickDate(json['createdAt']),
      updatedAt: pickDate(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'phoneNumber': phoneNumber,
    'groups': groups,
    'location': latitude != null && longitude != null
        ? {
            'locationName': locationName,
            'latitude': latitude,
            'longitude': longitude,
            'source': 'manual',
            'capturedAt': DateTime.now().toIso8601String(),
          }
        : null,
  };
}
