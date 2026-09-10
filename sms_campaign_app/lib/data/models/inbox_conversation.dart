import 'json_helpers.dart';
import 'message.dart';

class InboxStaff {
  const InboxStaff({required this.id, required this.name, required this.email});

  final String id;
  final String name;
  final String email;

  factory InboxStaff.fromJson(Map<String, dynamic> json) => InboxStaff(
    id: pickId(json),
    name: '${json['name'] ?? 'Staff member'}',
    email: '${json['email'] ?? ''}',
  );
}

class InboxConversation {
  const InboxConversation({
    required this.id,
    required this.customerPhone,
    required this.status,
    required this.unreadCount,
    this.customerName,
    this.companyName,
    this.contactId,
    this.senderId,
    this.assignedToId,
    this.assignedToName,
    this.sourceCampaignName,
    this.tags = const [],
    this.lastMessage,
    this.lastMessageAt,
    this.createdAt,
  });

  final String id;
  final String customerPhone;
  final String status;
  final int unreadCount;
  final String? customerName;
  final String? companyName;
  final String? contactId;
  final String? senderId;
  final String? assignedToId;
  final String? assignedToName;
  final String? sourceCampaignName;
  final List<String> tags;
  final Message? lastMessage;
  final DateTime? lastMessageAt;
  final DateTime? createdAt;

  String get title =>
      customerName?.trim().isNotEmpty == true ? customerName! : customerPhone;

  factory InboxConversation.fromJson(Map<String, dynamic> json) {
    final contact = json['contact'];
    final company = json['company'];
    final assignee = json['assignee'];
    final campaign = json['sourceCampaign'];
    final last = json['lastMessage'];
    return InboxConversation(
      id: pickId(json),
      customerPhone: '${json['customerPhone'] ?? ''}',
      status: '${json['status'] ?? 'open'}',
      unreadCount: int.tryParse('${json['unreadCount'] ?? 0}') ?? 0,
      customerName: contact is Map ? contact['name']?.toString() : null,
      companyName: company is Map ? company['name']?.toString() : null,
      contactId: contact is Map ? '${contact['id'] ?? ''}' : null,
      senderId: json['senderId']?.toString(),
      assignedToId: assignee is Map ? '${assignee['id'] ?? ''}' : null,
      assignedToName: assignee is Map ? assignee['name']?.toString() : null,
      sourceCampaignName: campaign is Map ? campaign['name']?.toString() : null,
      tags: contact is Map ? pickStringList(contact['tags']) : const [],
      lastMessage: last is Map
          ? Message.fromJson(Map<String, dynamic>.from(last))
          : null,
      lastMessageAt: pickDate(json['lastMessageAt']),
      createdAt: pickDate(json['createdAt']),
    );
  }
}
