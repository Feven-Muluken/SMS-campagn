import '../../core/services/api_service.dart';
import '../models/campaign.dart';

/// Campaign endpoints (admin only): /campaign, /campaign/create, /campaign/:id.
class CampaignRepository {
  CampaignRepository(this._api);

  final ApiService _api;

  Future<List<Campaign>> list({
    String? status,
    String? search,
    int page = 1,
  }) async {
    final data = await _api.get('/campaign', query: {
      'page': page,
      'pageSize': 500,
      if (status != null && status.isNotEmpty) 'status': status,
      if (search != null && search.isNotEmpty) 'search': search,
    });
    return unwrapList(data).map(Campaign.fromJson).toList();
  }

  Future<Campaign> getById(String id) async {
    final data = await _api.get('/campaign/$id');
    final json = (data as Map)['campaign'] ?? data['data'] ?? data;
    return Campaign.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : const {});
  }

  /// [type] must be one of `individual`, `group`, `broadcast/everyone`.
  Future<Campaign> create({
    required String name,
    required String message,
    required String type,
    List<String> recipients = const <String>[],
    String? group,
    bool recurring = false,
    String recurringInterval = 'daily',
    DateTime? recurrenceEndAt,
    DateTime? schedule,
  }) async {
    final data = await _api.post('/campaign/create', {
      'name': name,
      'message': message,
      'type': type,
      'recipientType': 'Contact',
      'recipients': recipients,
      if (group != null && group.isNotEmpty) 'group': group,
      if (schedule != null) 'schedule': schedule.toUtc().toIso8601String(),
      'recurring': {
        'active': recurring,
        if (recurring) 'interval': recurringInterval,
        if (recurring && recurrenceEndAt != null)
          'endAt': recurrenceEndAt.toUtc().toIso8601String(),
      },
    });
    final json = (data as Map)['campaign'] ?? data['data'] ?? data;
    return Campaign.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : const {});
  }

  Future<void> update(String id, Map<String, dynamic> changes) =>
      _api.put('/campaign/$id', changes);

  Future<void> changeStatus(String id, String action) =>
      _api.post('/campaign/$id/status', {'action': action});

  Future<void> delete(String id) => _api.delete('/campaign/$id');
}
