import 'json_helpers.dart';

/// A single SMS delivery record from `GET /sms/status`.
class Message {
  const Message({
    required this.id,
    required this.phoneNumber,
    required this.content,
    required this.status,
    this.lastDispatchStatus,
    this.sentAt,
    this.scheduledAt,
    this.campaignId,
    this.campaignName,
    this.campaignType,
    this.campaignRecipientCount = 0,
    this.campaignCreatorName,
    this.recipientType,
    this.recipientName,
    this.groupId,
    this.groupName,
    this.groupMemberCount = 0,
    this.dispatchId,
    this.createdAt,
    this.updatedAt,
    this.failureReason,
    this.direction = 'outbound',
    this.channel,
    this.sentByName,
    this.sentCount = 0,
    this.deliveredCount = 0,
    this.failedCount = 0,
    this.pendingCount = 0,
    this.recurringActive = false,
    this.recurringInterval,
  });

  final String id;
  final String phoneNumber;
  final String content;
  final String status;
  final String? lastDispatchStatus;
  final DateTime? sentAt;
  final DateTime? scheduledAt;
  final String? campaignId;
  final String? campaignName;
  final String? campaignType;
  final int campaignRecipientCount;
  final String? campaignCreatorName;
  final String? recipientType;
  final String? recipientName;
  final String? groupId;
  final String? groupName;
  final int groupMemberCount;
  final String? dispatchId;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? failureReason;
  final String direction;
  final String? channel;
  final String? sentByName;
  final int sentCount;
  final int deliveredCount;
  final int failedCount;
  final int pendingCount;
  final bool recurringActive;
  final String? recurringInterval;
  bool get isInbound => direction == 'inbound';

  String get sourceType {
    if (campaignName?.isNotEmpty ?? false) return 'Campaign';
    if (groupName?.isNotEmpty ?? false) return 'Group';
    if (recipientName?.isNotEmpty ?? false) return recipientType ?? 'Contact';
    return 'Phone number';
  }

  String get displayName => switch (sourceType) {
    'Campaign' => campaignName!,
    'Group' => groupName!,
    'Contact' || 'User' => recipientName!,
    _ => phoneNumber,
  };

  String get audience => groupName?.isNotEmpty == true
      ? groupName!
      : recipientName?.isNotEmpty == true
      ? recipientName!
      : phoneNumber;

  String get cardType => switch (sourceType) {
    'Campaign' => 'Campaign message',
    'Group' => 'Group message',
    'Contact' => 'Contact message',
    'User' => 'User message',
    _ => 'Phone message',
  };

  factory Message.fromJson(Map<String, dynamic> json) {
    final campaign = json['campaign'];
    final recipient = json['recipient'];
    final group = json['group'] ?? (campaign is Map ? campaign['group'] : null);
    final response = json['response'];
    final sentBy = json['sentBy'];
    int number(dynamic value) => int.tryParse('${value ?? 0}') ?? 0;
    return Message(
      id: pickId(json),
      phoneNumber: '${json['phoneNumber'] ?? ''}',
      content: '${json['content'] ?? ''}',
      status: '${json['status'] ?? 'pending'}',
      lastDispatchStatus: json['lastDispatchStatus']?.toString(),
      sentAt: pickDate(json['sentAt']),
      scheduledAt: pickDate(
        json['scheduledAt'] ??
            (response is Map && response['dispatch'] is Map
                ? response['dispatch']['scheduledFor']
                : null) ??
            (campaign is Map ? campaign['schedule'] : null),
      ),
      campaignId: campaign is Map
          ? '${campaign['id'] ?? campaign['_id'] ?? ''}'
          : null,
      campaignName: campaign is Map ? '${campaign['name'] ?? ''}' : null,
      campaignType: campaign is Map ? '${campaign['type'] ?? ''}' : null,
      campaignRecipientCount: number(
        json['recipientCount'] ??
            (campaign is Map ? campaign['recipientCount'] : 0),
      ),
      campaignCreatorName: campaign is Map && campaign['creator'] is Map
          ? '${campaign['creator']['name'] ?? ''}'
          : null,
      recipientType: recipient is Map
          ? '${recipient['type'] ?? json['recipientType'] ?? ''}'
          : '${json['recipientType'] ?? ''}',
      recipientName: recipient is Map ? '${recipient['name'] ?? ''}' : null,
      groupId: group is Map ? '${group['id'] ?? ''}' : null,
      groupName: group is Map ? '${group['name'] ?? ''}' : null,
      groupMemberCount: group is Map ? number(group['memberCount']) : 0,
      dispatchId: response is Map && response['dispatch'] is Map
          ? '${response['dispatch']['dispatchId'] ?? ''}'
          : null,
      createdAt: pickDate(
        campaign is Map
            ? (campaign['createdAt'] ?? json['createdAt'])
            : json['createdAt'],
      ),
      updatedAt: pickDate(json['updatedAt']),
      failureReason: response is Map && response['error'] != null
          ? '${response['error']}'
          : null,
      direction: response is Map
          ? '${response['direction'] ?? 'outbound'}'.toLowerCase()
          : 'outbound',
      channel:
          json['channel']?.toString() ??
          (response is Map ? response['channel']?.toString() : null),
      sentByName: sentBy is Map ? sentBy['name']?.toString() : null,
      sentCount: number(json['sentCount']),
      deliveredCount: number(json['deliveredCount']),
      failedCount: number(json['failedCount']),
      pendingCount: number(json['pendingCount']),
      recurringActive: campaign is Map && campaign['recurringActive'] == true,
      recurringInterval: campaign is Map
          ? campaign['recurringInterval']?.toString()
          : null,
    );
  }
}
