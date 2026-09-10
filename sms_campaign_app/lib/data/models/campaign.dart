import 'json_helpers.dart';

class Campaign {
  const Campaign({
    required this.id,
    required this.name,
    required this.message,
    required this.type,
    this.status = 'draft',
    this.recipients = const <String>[],
    this.group,
    this.groupName,
    this.groupMembers = const <String>[],
    this.contactRecipients = const <String>[],
    this.userRecipients = const <String>[],
    this.recipientType,
    this.creatorName,
    this.companyId,
    this.scheduledAt,
    this.recurringActive = false,
    this.recurringInterval,
    this.recurrenceEndAt,
    this.lastDispatchAt,
    this.lastDispatchStatus,
    this.queuedCount = 0,
    this.sentCount = 0,
    this.deliveredCount = 0,
    this.failedCount = 0,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String message;

  /// One of `individual`, `group`, `broadcast/everyone`.
  final String type;
  final String status;
  final List<String> recipients;
  final String? group;
  final String? groupName;
  final List<String> groupMembers;
  final List<String> contactRecipients;
  final List<String> userRecipients;
  final String? recipientType;
  final String? creatorName;
  final String? companyId;
  final DateTime? scheduledAt;
  final bool recurringActive;
  final String? recurringInterval;
  final DateTime? recurrenceEndAt;
  final DateTime? lastDispatchAt;
  final String? lastDispatchStatus;
  final int queuedCount;
  final int sentCount;
  final int deliveredCount;
  final int failedCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  int get audienceCount => recipients.length;

  String get visibleStatus {
    if (recurringActive && scheduledAt != null && status == 'pending') {
      return 'recurring';
    }
    if (!recurringActive &&
        scheduledAt != null &&
        scheduledAt!.isAfter(DateTime.now()) &&
        status == 'pending') {
      return 'scheduled';
    }
    return status == 'partial' ? 'sent' : status;
  }

  String get displayType => switch (type) {
    'broadcast/everyone' => 'Broadcast',
    'group' => 'Group',
    'individual' => 'Selected contacts',
    _ => type,
  };

  String get scheduleLabel {
    if (recurringActive) {
      final interval = recurringInterval;
      return interval == null || interval.isEmpty
          ? 'Recurring'
          : 'Recurring ${interval[0].toUpperCase()}${interval.substring(1)}';
    }
    return scheduledAt == null ? 'Not scheduled' : 'Scheduled';
  }

  factory Campaign.fromJson(Map<String, dynamic> json) {
    final group = json['group'];
    final creator = json['creator'];
    final recipients = json['recipientLinks'] ?? json['recipients'];
    final groupMembers = group is Map && group['members'] is List
        ? (group['members'] as List)
              .map(
                (item) => item is Map
                    ? '${item['name'] ?? item['phoneNumber'] ?? item['id'] ?? ''}'
                    : '$item',
              )
              .where((value) => value.isNotEmpty)
              .toList()
        : const <String>[];
    final resolved = json['recipientsResolved'];
    List<String> resolvedNames(String key) =>
        resolved is Map && resolved[key] is List
        ? (resolved[key] as List)
              .map(
                (item) => item is Map
                    ? '${item['name'] ?? item['email'] ?? item['phoneNumber'] ?? item['id'] ?? ''}'
                    : '$item',
              )
              .where((value) => value.isNotEmpty)
              .toList()
        : const <String>[];
    final dispatches = json['dispatches'];
    Map? lastDispatch;
    if (dispatches is List) {
      for (final item in dispatches.whereType<Map>()) {
        if ('${item['status'] ?? ''}' != 'pending') {
          lastDispatch = item;
          break;
        }
      }
    }
    final deliveryCounts = json['deliveryCounts'];
    int count(String key) => deliveryCounts is Map
        ? int.tryParse('${deliveryCounts[key] ?? 0}') ?? 0
        : 0;
    return Campaign(
      id: pickId(json),
      name: '${json['name'] ?? ''}',
      message: '${json['message'] ?? ''}',
      type: '${json['type'] ?? 'individual'}',
      status: '${json['displayStatus'] ?? json['status'] ?? 'draft'}',
      recipients: recipients is List
          ? recipients
                .map(
                  (item) => item is Map
                      ? '${item['recipientId'] ?? item['_id'] ?? item['id'] ?? ''}'
                      : '$item',
                )
                .where((id) => id.isNotEmpty)
                .toList()
          : const <String>[],
      group: group is Map
          ? '${group['_id'] ?? group['id'] ?? ''}'
          : group?.toString(),
      groupName: group is Map ? group['name']?.toString() : null,
      groupMembers: groupMembers,
      contactRecipients: resolvedNames('contacts'),
      userRecipients: resolvedNames('users'),
      recipientType: json['recipientType']?.toString(),
      creatorName: creator is Map ? creator['name']?.toString() : null,
      companyId: json['companyId']?.toString(),
      scheduledAt: pickDate(json['schedule']),
      recurringActive: json['recurringActive'] == true,
      recurringInterval: json['recurringInterval']?.toString(),
      recurrenceEndAt: pickDate(json['recurrenceEndAt']),
      lastDispatchAt: pickDate(
        lastDispatch?['dispatchedAt'] ?? lastDispatch?['scheduledFor'],
      ),
      lastDispatchStatus: lastDispatch?['status']?.toString(),
      queuedCount: count('queued'),
      sentCount: count('sent'),
      deliveredCount: count('delivered'),
      failedCount: count('failed'),
      createdAt: pickDate(json['createdAt']),
      updatedAt: pickDate(json['updatedAt']),
    );
  }
}
