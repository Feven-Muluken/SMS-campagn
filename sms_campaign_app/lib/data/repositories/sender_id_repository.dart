import '../../core/services/api_service.dart';
import '../models/sender_id.dart';

/// Company sender-ID requests persisted and reviewed by the backend.
class SenderIdRepository {
  SenderIdRepository(this._api);

  final ApiService _api;

  Future<List<SenderId>> list() async {
    final data = await _api.get('/sender-id-requests/my');
    return unwrapList(data).map(SenderId.fromJson).toList();
  }

  Future<List<SenderId>> listApproved() async {
    final data = await _api.get('/sender-id-requests/approved');
    return unwrapList(data).map(SenderId.fromJson).toList();
  }

  Future<List<SenderId>> listPending() async {
    final data = await _api.get('/sender-id-requests/pending');
    return unwrapList(data).map(SenderId.fromJson).toList();
  }

  Future<List<SenderId>> listAllAdmin() async {
    final data = await _api.get('/sender-id-requests/all');
    return unwrapList(data).map(SenderId.fromJson).toList();
  }

  Future<void> review(String id, String status) =>
      _api.patch('/sender-id-requests/$id/review', {'status': status});

  Future<SenderId> request(String senderId, {String? reason}) async {
    final data = await _api.post('/sender-id-requests', {
      'senderId': senderId,
      if (reason?.isNotEmpty == true) 'reason': reason,
    });
    final json = (data as Map)['data'] ?? data;
    return SenderId.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : const {});
  }

  Future<void> remove(String senderId) =>
      _api.delete('/sender-id-requests/sender-id/$senderId');
}
