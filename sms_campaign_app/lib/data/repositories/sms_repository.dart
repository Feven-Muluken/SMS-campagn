import '../../core/services/api_service.dart';
import '../models/message.dart';
import '../models/inbox_conversation.dart';
import '../models/internal_conversation.dart';
import '../models/contact.dart';
import '../models/sms_send_result.dart';

/// Result of a paginated `/sms/status` query.
class MessagePage {
  const MessagePage({required this.messages, required this.total});

  final List<Message> messages;
  final int total;
}

class SmsProviderOptions {
  const SmsProviderOptions({
    required this.defaultProvider,
    required this.available,
    required this.configured,
    required this.userSelectable,
  });

  final String defaultProvider;
  final List<String> available;
  final Map<String, bool> configured;
  final bool userSelectable;
}

/// SMS endpoints: /sms/send, /sms/send-group, /sms/send-contacts, /sms/status.
class SmsRepository {
  SmsRepository(this._api);

  final ApiService _api;

  Future<List<InternalConversation>> internalConversations({
    String status = 'active',
  }) async {
    final data = await _api.get(
      '/sms/internal-inbox/conversations',
      query: {'status': status},
    );
    return unwrapList(data).map(InternalConversation.fromJson).toList();
  }

  Future<List<InternalRecipient>> internalRecipients() async {
    final data = await _api.get('/sms/internal-inbox/recipients');
    return unwrapList(data).map(InternalRecipient.fromJson).toList();
  }

  Future<InternalConversation> startInternalConversation({
    required String message,
    required String recipientUserId,
    String? companyId,
  }) async {
    final data = await _api.post('/sms/internal-inbox/conversations', {
      'message': message,
      'recipientUserId': recipientUserId,
      if (companyId?.isNotEmpty == true) 'companyId': companyId,
    });
    return InternalConversation.fromJson(
      Map<String, dynamic>.from((data as Map)['data'] as Map),
    );
  }

  Future<List<InternalMessage>> internalMessages(String conversationId) async {
    final data = await _api.get(
      '/sms/internal-inbox/conversations/$conversationId/messages',
    );
    return unwrapList(data).map(InternalMessage.fromJson).toList();
  }

  Future<void> archiveInternalConversation(String conversationId) => _api.patch(
    '/sms/internal-inbox/conversations/$conversationId',
    {'status': 'archived'},
  );

  Future<void> restoreInternalConversation(String conversationId) => _api.patch(
    '/sms/internal-inbox/conversations/$conversationId',
    {'status': 'open'},
  );

  Future<void> updateInternalConversationStatus(
    String conversationId,
    String status,
  ) => _api.patch('/sms/internal-inbox/conversations/$conversationId', {
    'status': status,
  });

  Future<void> deleteInternalConversation(String conversationId) =>
      _api.delete('/sms/internal-inbox/conversations/$conversationId');

  Future<InternalMessage> sendInternalMessage(
    String conversationId,
    String message,
  ) async {
    final data = await _api.post(
      '/sms/internal-inbox/conversations/$conversationId/messages',
      {'message': message},
    );
    return InternalMessage.fromJson(
      Map<String, dynamic>.from((data as Map)['data'] as Map),
    );
  }

  Future<SmsProviderOptions> providerOptions() async {
    final data = await _api.get('/sms/providers');
    final map = data is Map ? data : const {};
    final available = map['available'] is List
        ? (map['available'] as List).map((value) => '$value').toList()
        : <String>[];
    return SmsProviderOptions(
      defaultProvider: '${map['default'] ?? 'africastalking'}',
      available: available,
      configured: map['configured'] is Map
          ? Map<String, dynamic>.from(
              map['configured'] as Map,
            ).map((key, value) => MapEntry(key, value == true))
          : const <String, bool>{},
      userSelectable: map['userSelectable'] == true,
    );
  }

  /// POST /sms/send — send a campaign now.
  Future<SmsSendResult> sendCampaign(
    String campaignId, {
    String? senderId,
    String? provider,
  }) async {
    final data = await _api.post('/sms/send', {
      'campaignID': campaignId,
      if (senderId != null && senderId.isNotEmpty) 'senderId': senderId,
      if (provider != null && provider.isNotEmpty) 'provider': provider,
    });
    return SmsSendResult.fromResponse(data);
  }

  /// POST /sms/send-group.
  Future<SmsSendResult> sendGroup(
    String groupId,
    String message, {
    String? senderId,
    String? provider,
  }) async {
    final data = await _api.post('/sms/send-group', {
      'groupId': groupId,
      'message': message,
      if (senderId != null && senderId.isNotEmpty) 'senderId': senderId,
      if (provider != null && provider.isNotEmpty) 'provider': provider,
    });
    return SmsSendResult.fromResponse(data);
  }

  /// POST /sms/send-contacts.
  Future<SmsSendResult> sendContacts(
    List<String> contactIds,
    String message, {
    String? senderId,
    String? provider,
  }) async {
    final data = await _api.post('/sms/send-contacts', {
      'contactIds': contactIds,
      'message': message,
      if (senderId != null && senderId.isNotEmpty) 'senderId': senderId,
      if (provider != null && provider.isNotEmpty) 'provider': provider,
    });
    return SmsSendResult.fromResponse(data);
  }

  Future<SmsSendResult> sendInboxReply(String contactId, String message) async {
    final data = await _api.post('/sms/inbox/reply', {
      'contactId': contactId,
      'message': message,
    });
    return SmsSendResult.fromResponse(data);
  }

  Future<SmsSendResult> sendInboxGroup(String groupId, String message) async {
    final data = await _api.post('/sms/inbox/reply-group', {
      'groupId': groupId,
      'message': message,
    });
    return SmsSendResult.fromResponse(data);
  }

  Future<List<Message>> inbox() async {
    final messages = <Message>[];
    var page = 1;
    var totalPages = 1;
    do {
      final data = await _api.get(
        '/sms/inbox',
        query: {'page': page, 'pageSize': 100},
      );
      messages.addAll(unwrapList(data).map(Message.fromJson));
      totalPages = data is Map
          ? int.tryParse('${data['totalPages'] ?? 1}') ?? 1
          : 1;
      page++;
    } while (page <= totalPages);
    return messages;
  }

  Future<List<InboxConversation>> inboxConversations({
    String? search,
    String? status,
  }) async {
    final data = await _api.get(
      '/sms/inbox/conversations',
      query: {
        if (search?.trim().isNotEmpty == true) 'search': search!.trim(),
        if (status?.isNotEmpty == true && status != 'all') 'status': status,
      },
    );
    return unwrapList(data).map(InboxConversation.fromJson).toList();
  }

  Future<List<Message>> inboxConversationMessages(String conversationId) async {
    final data = await _api.get(
      '/sms/inbox/conversations/$conversationId/messages',
    );
    return unwrapList(data).map(Message.fromJson).toList();
  }

  Future<void> markInboxRead(String conversationId) =>
      _api.post('/sms/inbox/conversations/$conversationId/read', const {});

  Future<InboxConversation> updateInboxConversation(
    String conversationId,
    Map<String, dynamic> changes,
  ) async {
    final data = await _api.patch(
      '/sms/inbox/conversations/$conversationId',
      changes,
    );
    final value = data is Map ? data['data'] : null;
    return InboxConversation.fromJson(Map<String, dynamic>.from(value as Map));
  }

  Future<void> deleteInboxConversation(String conversationId) =>
      _api.delete('/sms/inbox/conversations/$conversationId');

  Future<List<InboxStaff>> inboxStaff() async {
    final data = await _api.get('/sms/inbox/staff');
    return unwrapList(data).map(InboxStaff.fromJson).toList();
  }

  Future<List<Contact>> inboxContacts() async {
    final data = await _api.get('/sms/inbox/contacts');
    return unwrapList(data).map(Contact.fromJson).toList();
  }

  Future<InboxConversation> startInboxConversation(
    String contactId, {
    String? senderId,
  }) async {
    final data = await _api.post('/sms/inbox/conversations', {
      'contactId': contactId,
      if (senderId?.isNotEmpty == true) 'senderId': senderId,
    });
    return InboxConversation.fromJson(
      Map<String, dynamic>.from((data as Map)['data'] as Map),
    );
  }

  Future<SmsSendResult> replyToConversation(
    String conversationId,
    String message, {
    String? senderId,
  }) async {
    final data = await _api.post(
      '/sms/inbox/conversations/$conversationId/reply',
      {
        'message': message,
        if (senderId?.isNotEmpty == true) 'senderId': senderId,
      },
    );
    return SmsSendResult.fromResponse(data);
  }

  Future<Map<String, dynamic>> previewGeo({
    required double latitude,
    required double longitude,
    required double radiusKm,
    String? placeName,
  }) async => Map<String, dynamic>.from(
    await _api.post('/sms/geo/preview', {
          'centerLat': latitude,
          'centerLng': longitude,
          'radiusKm': radiusKm,
          if (placeName?.isNotEmpty == true) 'placeName': placeName,
        })
        as Map,
  );

  Future<SmsSendResult> sendGeo({
    required double latitude,
    required double longitude,
    required double radiusKm,
    required String message,
    String? placeName,
    String? senderId,
  }) async {
    final data = await _api.post('/sms/geo/send', {
      'centerLat': latitude,
      'centerLng': longitude,
      'radiusKm': radiusKm,
      'message': message,
      if (placeName?.isNotEmpty == true) 'placeName': placeName,
      if (senderId?.isNotEmpty == true) 'senderId': senderId,
    });
    return SmsSendResult.fromResponse(data);
  }

  /// GET /sms/status — paginated delivery log.
  Future<MessagePage> status({
    String? status,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    String? campaignId,
    bool summary = false,
    bool aggregateCampaigns = true,
    int page = 1,
    int pageSize = 50,
  }) async {
    final data = await _api.get(
      summary ? '/sms/summary' : '/sms/status',
      query: {
        if (status != null && status.isNotEmpty) 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
        if (campaignId != null && campaignId.isNotEmpty)
          'campaignId': campaignId,
        if (aggregateCampaigns) 'aggregateCampaigns': 'true',
        'page': page,
        'pageSize': pageSize,
      },
    );
    final total = data is Map ? int.tryParse('${data['total'] ?? 0}') ?? 0 : 0;
    return MessagePage(
      messages: unwrapList(data).map(Message.fromJson).toList(),
      total: total,
    );
  }
}
