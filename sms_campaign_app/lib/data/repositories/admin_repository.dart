import '../../core/services/api_service.dart';
import '../models/company.dart';
import '../models/user.dart';

/// Admin endpoints: /admin/stats, /admin/recent-activity, /admin/users,
/// /admin/companies.
class AdminRepository {
  AdminRepository(this._api);

  final ApiService _api;

  /// GET /admin/stats → counts for the dashboard.
  Future<Map<String, int>> stats() async {
    final data = await _api.get('/admin/stats');
    final map = data is Map ? data : const {};
    int count(String key) => int.tryParse('${map[key] ?? 0}') ?? 0;
    return {
      'users': count('userCount'),
      'contacts': count('contactCount'),
      'campaigns': count('campaignCount'),
      'messages': count('messageCount'),
      'groups': count('groupCount'),
    };
  }

  /// GET /admin/recent-activity → `{recentCampaigns, recentMessages}`.
  Future<({List<Map<String, dynamic>> campaigns, List<Map<String, dynamic>> messages})>
      recentActivity() async {
    final data = await _api.get('/admin/recent-activity');
    final map = data is Map ? data : const {};
    List<Map<String, dynamic>> pick(String key) => (map[key] is List)
        ? (map[key] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : <Map<String, dynamic>>[];
    return (campaigns: pick('recentCampaigns'), messages: pick('recentMessages'));
  }

  Future<({Map<String, int> stats, List<Map<String, dynamic>> campaigns, List<Map<String, dynamic>> messages})>
      companyDashboard(String companyId) async {
    final data = await _api.get('/companies/$companyId/dashboard');
    final map = data is Map ? data : const {};
    final rawStats = map['stats'] is Map ? map['stats'] as Map : const {};
    int count(String key) => int.tryParse('${rawStats[key] ?? 0}') ?? 0;
    List<Map<String, dynamic>> rows(String key) => map[key] is List
        ? (map[key] as List)
            .whereType<Map>()
            .map((item) => Map<String, dynamic>.from(item))
            .toList()
        : <Map<String, dynamic>>[];
    return (
      stats: {
        'contacts': count('contactCount'),
        'groups': count('groupCount'),
        'campaigns': count('campaignCount'),
        'messages': count('messageCount'),
      },
      campaigns: rows('recentCampaigns'),
      messages: rows('recentMessages'),
    );
  }

  Future<List<User>> users({
    String? search,
    int page = 1,
    String sortBy = 'created_at',
    String sortDir = 'DESC',
  }) async {
    final data = await _api.get('/admin/users', query: {
      'page': page,
      'pageSize': 50,
      if (search != null && search.isNotEmpty) 'search': search,
      'sortBy': sortBy,
      'sortDir': sortDir,
    });
    return unwrapList(data).map(User.fromJson).toList();
  }

  Future<void> updateUser(String id, Map<String, dynamic> changes) =>
      _api.put('/admin/users/$id', changes);

  Future<void> deleteUser(String id) => _api.delete('/admin/users/$id');

  Future<List<Company>> companies() async {
    final data = await _api.get('/admin/companies');
    return unwrapList(data).map(Company.fromJson).toList();
  }

  Future<List<User>> companyUsers(String companyId,
      {required String companyName}) async {
    final data = await _api.get('/companies/$companyId/users');
    return unwrapList(data).map((row) {
      final nested = row['user'];
      final json = nested is Map
          ? <String, dynamic>{
              ...Map<String, dynamic>.from(nested),
              'role': row['role'],
              'permissions': row['permissions'],
              'companyJoinedAt': row['createdAt'],
              'membershipId': row['id'],
              'company': {'id': companyId, 'name': companyName},
            }
          : row;
      return User.fromJson(json);
    }).toList();
  }

  Future<Company> createCompany({
    required String name,
    String? slug,
    required String plan,
    required String status,
    required String contactEmail,
    required String contactPhone,
    required String timezone,
    List<String> permissions = const <String>[],
  }) async {
    final data = await _api.post('/admin/companies', {
      'name': name,
      if (slug != null && slug.isNotEmpty) 'slug': slug,
      'plan': plan,
      'status': status,
      'contactEmail': contactEmail,
      'contactPhone': contactPhone,
      'timezone': timezone,
      'permissions': permissions,
    });
    final json = (data as Map)['company'] ?? data['data'] ?? data;
    return Company.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : const {});
  }

  Future<void> updateCompanyPermissions(
          String id, List<String> permissions) =>
      _api.put('/admin/companies/$id/permissions', {'permissions': permissions});

  Future<void> addCompanyUser(String companyId,
          {required String name,
          required String email,
          required String password,
          String? phoneNumber,
          String role = 'viewer',
          List<String> permissions = const <String>[]}) =>
      _api.post('/companies/$companyId/users', {
        'name': name,
        'email': email,
        'password': password,
        if (phoneNumber != null && phoneNumber.isNotEmpty)
          'phoneNumber': phoneNumber,
        'role': role,
        'permissions': permissions,
      });

  Future<void> updateCompanyUser(
          String companyId, String membershipId, Map<String, dynamic> changes) =>
      _api.put('/companies/$companyId/users/$membershipId', changes);

  Future<void> deleteCompanyUser(String companyId, String membershipId) =>
      _api.delete('/companies/$companyId/users/$membershipId');
}
