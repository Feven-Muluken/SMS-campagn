import 'json_helpers.dart';

/// A sender ID request persisted for company-level administrator review.
class SenderId {
  const SenderId({
    required this.id,
    required this.senderId,
    required this.status,
    required this.requestedAt,
    this.companyName,
    this.requesterName,
    this.reason,
    this.countryCodes = const <String>[],
  });

  final String id;
  final String senderId;

  /// `pending`, `approved` or `rejected`.
  final String status;
  final DateTime requestedAt;
  final String? companyName;
  final String? requesterName;
  final String? reason;
  final List<String> countryCodes;

  factory SenderId.fromJson(Map<String, dynamic> json) => SenderId(
        id: pickId(json),
        senderId: '${json['senderId'] ?? ''}',
        status: '${json['status'] ?? 'pending'}',
        requestedAt:
            pickDate(json['requestedAt'] ?? json['createdAt']) ?? DateTime.now(),
        companyName: json['company'] is Map
            ? (json['company'] as Map)['name']?.toString()
            : json['companyName']?.toString(),
        requesterName: json['requester'] is Map
            ? (json['requester'] as Map)['name']?.toString()
            : json['requesterName']?.toString(),
        reason: json['reason']?.toString(),
        countryCodes: pickStringList(json['countryCodes']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'senderId': senderId,
        'status': status,
        'requestedAt': requestedAt.toIso8601String(),
      };
}
