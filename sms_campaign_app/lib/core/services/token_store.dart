import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/app_constants.dart';

/// Storage backend for the JWT. Abstracted so tests can use an in-memory
/// implementation (the secure-storage plugin needs platform channels).
abstract class TokenStore {
  Future<String?> read();
  Future<String?> readRefresh();
  Future<void> write(String token);
  Future<void> writeRefresh(String token);
  Future<void> clear();
}

/// Production store: Android Keystore / iOS Keychain via the plugin.
class SecureTokenStore implements TokenStore {
  const SecureTokenStore([this._storage = const FlutterSecureStorage()]);

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read() => _storage.read(key: AppConstants.keyAuthToken);

  @override
  Future<String?> readRefresh() =>
      _storage.read(key: AppConstants.keyRefreshToken);

  @override
  Future<void> write(String token) =>
      _storage.write(key: AppConstants.keyAuthToken, value: token);

  @override
  Future<void> writeRefresh(String token) =>
      _storage.write(key: AppConstants.keyRefreshToken, value: token);

  @override
  Future<void> clear() async {
    await _storage.delete(key: AppConstants.keyAuthToken);
    await _storage.delete(key: AppConstants.keyRefreshToken);
  }
}

/// In-memory store for widget/unit tests.
class MemoryTokenStore implements TokenStore {
  String? _token;
  String? _refreshToken;

  @override
  Future<String?> read() async => _token;

  @override
  Future<String?> readRefresh() async => _refreshToken;

  @override
  Future<void> write(String token) async => _token = token;

  @override
  Future<void> writeRefresh(String token) async => _refreshToken = token;

  @override
  Future<void> clear() async {
    _token = null;
    _refreshToken = null;
  }
}
