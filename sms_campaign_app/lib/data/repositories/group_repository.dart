import '../../core/services/api_service.dart';
import '../models/group.dart';
import '../models/message.dart';
import '../models/sms_send_result.dart';

/// Group endpoints: /groups, /groups/create, /groups/:id(/add|/send).
class GroupRepository {
  GroupRepository(this._api);

  final ApiService _api;

  Future<List<Group>> list() async {
    final data = await _api.get('/groups');
    return unwrapList(data).map(Group.fromJson).toList();
  }

  Future<Group> create(String name, List<String> memberIds) async {
    final data =
        await _api.post('/groups/create', {'name': name, 'members': memberIds});
    final json = (data as Map)['group'] ?? data['data'] ?? data;
    return Group.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : const {});
  }

  Future<void> update(String id, String name, List<String> memberIds) =>
      _api.put('/groups/$id', {'name': name, 'members': memberIds});

  Future<List<Message>> deliveries(String id) async {
    final data = await _api.get('/groups/$id/deliveries');
    return unwrapList(data).map(Message.fromJson).toList();
  }

  Future<void> delete(String id) => _api.delete('/groups/$id');

  Future<void> addMembers(String id, List<String> memberIds) =>
      _api.post('/groups/$id/add', {'members': memberIds});

  /// POST /groups/:id/send → `{successCount, failCount, total}`.
  Future<SmsSendResult> sendToGroup(
      String id, String content,
      {String? senderId}) async {
    final data = await _api.post('/groups/$id/send', {
      'content': content,
      if (senderId != null && senderId.isNotEmpty) 'senderId': senderId,
    });
    return SmsSendResult.fromResponse(data);
  }
}
