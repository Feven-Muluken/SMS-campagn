import '../../core/services/api_service.dart';
import '../models/contact.dart';

/// Contact endpoints: GET/POST /contacts, PUT/DELETE /contacts/:id.
class ContactRepository {
  ContactRepository(this._api);

  final ApiService _api;

  Future<List<Contact>> list({String? search}) async {
    final data = await _api.get('/contacts', query: {
      if (search != null && search.isNotEmpty) 'search': search,
      'pageSize': 200,
    });
    return unwrapList(data).map(Contact.fromJson).toList();
  }

  Future<int> count() async {
    final data = await _api.get('/contacts', query: {'pageSize': 1});
    if (data is Map && data['total'] != null) {
      return int.tryParse('${data['total']}') ?? 0;
    }
    return unwrapList(data).length;
  }

  /// 409 is surfaced as an [ApiException] on duplicates.
  Future<Contact> create(Contact contact) async {
    final data = await _api.post('/contacts', contact.toJson());
    final json = (data as Map)['contact'] ?? data['data'] ?? data;
    return Contact.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : const {});
  }

  Future<Contact> update(Contact contact) async {
    final data = await _api.put('/contacts/${contact.id}', contact.toJson());
    final json = (data as Map)['contact'] ?? data['data'] ?? data;
    return Contact.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : const {});
  }

  Future<void> delete(String id) => _api.delete('/contacts/$id');
}
