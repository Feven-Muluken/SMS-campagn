import 'json_helpers.dart';

class InternalMessage {
  const InternalMessage({
    required this.id,
    required this.creatorId,
    required this.recipientId,
    required this.senderId,
    required this.senderName,
    required this.content,
    this.createdAt,
    this.readAt,
    this.deliveryState = 'sent',
  });

  final String id;
  final String creatorId;
  final String recipientId;
  final String senderId;
  final String senderName;
  final String content;
  final DateTime? createdAt;
  final DateTime? readAt;
  final String deliveryState;

  factory InternalMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'];
    return InternalMessage(
      id: pickId(json),
      creatorId: '${json['createdById'] ?? ''}',
      recipientId: '${json['recipientUserId'] ?? ''}',
      senderId: '${json['senderId'] ?? ''}',
      senderName: sender is Map ? '${sender['name'] ?? 'User'}' : 'User',
      content: '${json['content'] ?? ''}',
      createdAt: pickDate(json['createdAt']),
      readAt: pickDate(json['readAt']),
    );
  }
}

class InternalRecipient {
  const InternalRecipient({
    required this.id,
    required this.name,
    required this.email,
    required this.companyName,
    this.companyId,
    required this.role,
    required this.accountScope,
  });
  final String id;
  final String name;
  final String email;
  final String companyName;
  final String? companyId;
  final String role;
  final String accountScope;

  factory InternalRecipient.fromJson(Map<String, dynamic> json) =>
      InternalRecipient(
        id: pickId(json),
        name: '${json['name'] ?? 'User'}',
        email: '${json['email'] ?? ''}',
        companyName: '${json['companyName'] ?? 'Platform'}',
        companyId: json['companyId']?.toString(),
        role: '${json['role'] ?? 'viewer'}',
        accountScope: '${json['accountScope'] ?? 'tenant'}',
      );
}

class InternalConversation {
  const InternalConversation({
    required this.id,
    required this.creatorId,
    required this.companyName,
    required this.creatorName,
    required this.creatorEmail,
    required this.creatorRole,
    required this.creatorScope,
    required this.creatorCompanyName,
    required this.recipientName,
    required this.recipientEmail,
    required this.recipientRole,
    required this.recipientScope,
    required this.recipientCompanyName,
    required this.subject,
    required this.status,
    required this.unreadCount,
    this.lastMessage,
    this.lastMessageAt,
  });

  final String id;
  final String creatorId;
  final String companyName;
  final String creatorName;
  final String creatorEmail;
  final String creatorRole;
  final String creatorScope;
  final String creatorCompanyName;
  final String recipientName;
  final String recipientEmail;
  final String recipientRole;
  final String recipientScope;
  final String recipientCompanyName;
  final String subject;
  final String status;
  final int unreadCount;
  final InternalMessage? lastMessage;
  final DateTime? lastMessageAt;

  factory InternalConversation.fromJson(Map<String, dynamic> json) {
    final company = json['company'];
    final creator = json['creator'];
    final recipient = json['recipient'];
    final last = json['lastMessage'];
    final conversationCompanyId = json['companyId']?.toString();
    return InternalConversation(
      id: pickId(json),
      creatorId: '${json['createdById'] ?? ''}',
      companyName: company is Map
          ? '${company['name'] ?? 'Company'}'
          : 'Company',
      creatorName: creator is Map ? '${creator['name'] ?? 'User'}' : 'User',
      creatorEmail: creator is Map ? '${creator['email'] ?? ''}' : '',
      creatorRole: _roleLabel(creator, conversationCompanyId),
      creatorScope: _scopeLabel(creator, conversationCompanyId),
      creatorCompanyName: _companyLabel(creator, conversationCompanyId),
      recipientName: recipient is Map
          ? '${recipient['name'] ?? 'User'}'
          : 'User',
      recipientEmail: recipient is Map ? '${recipient['email'] ?? ''}' : '',
      recipientRole: _roleLabel(recipient, conversationCompanyId),
      recipientScope: _scopeLabel(recipient, conversationCompanyId),
      recipientCompanyName: _companyLabel(recipient, conversationCompanyId),
      subject: '${json['subject'] ?? 'Support'}',
      status: '${json['status'] ?? 'open'}',
      unreadCount: int.tryParse('${json['unreadCount'] ?? 0}') ?? 0,
      lastMessage: last is Map
          ? InternalMessage.fromJson(Map<String, dynamic>.from(last))
          : null,
      lastMessageAt: pickDate(json['lastMessageAt']),
    );
  }

  static String _companyLabel(dynamic user, String? companyId) {
    if (user is! Map) return 'Company';
    final memberships = user['companyMemberships'];
    if (memberships is List) {
      for (final membership in memberships.whereType<Map>()) {
        final memberCompany = membership['company'];
        if (memberCompany is Map &&
            memberCompany['id']?.toString() == companyId) {
          return '${memberCompany['name'] ?? 'Company'}';
        }
      }
      final names = memberships
          .whereType<Map>()
          .map((membership) => membership['company'])
          .whereType<Map>()
          .map((company) => '${company['name'] ?? ''}')
          .where((name) => name.isNotEmpty)
          .toSet();
      if (names.isNotEmpty) return names.join(', ');
    }
    if ('${user['accountScope'] ?? ''}' == 'platform') return 'Platform';
    return 'Company';
  }

  static String _scopeLabel(dynamic user, String? companyId) {
    if (user is! Map) return 'tenant';
    final memberships = user['companyMemberships'];
    if (memberships is List) {
      for (final membership in memberships.whereType<Map>()) {
        final company = membership['company'];
        if (company is Map && company['id']?.toString() == companyId) {
          return 'tenant';
        }
      }
      if (memberships.isNotEmpty) return 'tenant';
    }
    return '${user['accountScope'] ?? 'platform'}';
  }

  static String _roleLabel(dynamic user, String? companyId) {
    if (user is! Map) return 'user';
    final memberships = user['companyMemberships'];
    if (memberships is List && memberships.isNotEmpty) {
      for (final membership in memberships.whereType<Map>()) {
        final memberCompany = membership['company'];
        if (memberCompany is Map &&
            memberCompany['id']?.toString() == companyId &&
            membership['role'] != null) {
          return '${membership['role']}';
        }
      }
      final first = memberships.first;
      if (first is Map && first['role'] != null) return '${first['role']}';
    }
    return '${user['role'] ?? 'user'}';
  }
}
