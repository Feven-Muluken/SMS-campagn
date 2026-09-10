import 'package:dio/dio.dart';

import 'storage_service.dart';

/// Error carrying a user-presentable message (and optional HTTP status).
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

/// Thin Dio wrapper that injects the configured base URL and the JWT bearer
/// token on every request, and normalizes errors into [ApiException].
class ApiService {
  ApiService(this._storage) {
    _dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: const {'Content-Type': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        options.baseUrl = _storage.serverUrl;
        final token = _storage.token;
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        final companyId = _storage.currentUser?.companyId;
        if (companyId != null && companyId.isNotEmpty) {
          options.headers['X-Company-Id'] = companyId;
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final request = error.requestOptions;
        final canRefresh = error.response?.statusCode == 401 &&
            request.extra['retriedAfterRefresh'] != true &&
            !request.path.startsWith('/auth/');
        if (!canRefresh || !await _refreshSession()) {
          handler.next(error);
          return;
        }
        try {
          request.extra['retriedAfterRefresh'] = true;
          request.headers['Authorization'] = 'Bearer ${_storage.token}';
          handler.resolve(await _dio.fetch<dynamic>(request));
        } on DioException catch (retryError) {
          handler.next(retryError);
        }
      },
    ));
  }

  final StorageService _storage;
  late final Dio _dio;
  Future<bool>? _refreshInProgress;

  Future<bool> _refreshSession() {
    return _refreshInProgress ??= _performRefresh().whenComplete(() {
      _refreshInProgress = null;
    });
  }

  Future<bool> _performRefresh() async {
    final refreshToken = _storage.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return false;
    try {
      final refreshClient = Dio(BaseOptions(
        baseUrl: _storage.serverUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: const {'Content-Type': 'application/json'},
      ));
      final response = await refreshClient.post<dynamic>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = response.data;
      final token = data is Map ? '${data['token'] ?? ''}' : '';
      final replacement = data is Map ? '${data['refreshToken'] ?? ''}' : '';
      if (token.isEmpty || replacement.isEmpty) return false;
      await _storage.updateTokens(token: token, refreshToken: replacement);
      return true;
    } on DioException {
      await _storage.clearSession();
      return false;
    }
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    try {
      return (await _dio.get<dynamic>(path, queryParameters: query)).data;
    } on DioException catch (error) {
      throw _toException(error);
    }
  }

  /// Verifies that the configured host is this application's backend.
  Future<Map<String, dynamic>> health() async {
    final data = await get('/health');
    if (data is! Map || data['ok'] != true) {
      throw const ApiException('The address did not return a valid API health response.');
    }
    return Map<String, dynamic>.from(data);
  }

  Future<dynamic> post(String path, Map<String, dynamic> data) async {
    try {
      return (await _dio.post<dynamic>(path, data: data)).data;
    } on DioException catch (error) {
      throw _toException(error);
    }
  }

  Future<dynamic> put(String path, Map<String, dynamic> data) async {
    try {
      return (await _dio.put<dynamic>(path, data: data)).data;
    } on DioException catch (error) {
      throw _toException(error);
    }
  }

  Future<dynamic> patch(String path, Map<String, dynamic> data) async {
    try {
      return (await _dio.patch<dynamic>(path, data: data)).data;
    } on DioException catch (error) {
      throw _toException(error);
    }
  }

  Future<void> delete(String path) async {
    try {
      await _dio.delete<dynamic>(path);
    } on DioException catch (error) {
      throw _toException(error);
    }
  }

  ApiException _toException(DioException error) {
    final data = error.response?.data;
    final message = data is Map
        ? data['message'] != null && data['error'] != null
            ? '${data['message']}: ${data['error']}'
            : '${data['message'] ?? data['error'] ?? 'Request failed'}'
        : (error.message ?? 'Unable to reach the server');
    return ApiException(message, statusCode: error.response?.statusCode);
  }
}

/// Unwraps a paginated backend response (`{data: [...], total, ...}`) or a
/// plain list into a list of JSON maps.
List<Map<String, dynamic>> unwrapList(dynamic data) {
  final list = data is List ? data : (data is Map ? data['data'] : null);
  if (list is! List) return <Map<String, dynamic>>[];
  return list
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}

/// Extracts a human-readable message from any thrown error.
String errorMessage(Object error) =>
    error is ApiException ? error.message : error.toString();
