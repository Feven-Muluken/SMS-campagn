import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../../data/models/user.dart';
import '../config/app_constants.dart';
import 'token_store.dart';

/// Facade over [SharedPreferences] for profile/server-URL data and a secure
/// [TokenStore] (Android Keystore / iOS Keychain) for the JWT.
///
/// The token is cached in memory at [init] so synchronous consumers (the Dio
/// interceptor, [hasSession]) keep working without async calls.
class StorageService {
  StorageService(this._prefs, this._tokenStore);

  final SharedPreferences _prefs;
  final TokenStore _tokenStore;
  String? _tokenCache;
  String? _refreshTokenCache;

  static Future<StorageService> init({TokenStore? tokenStore}) async {
    final service = StorageService(
      await SharedPreferences.getInstance(),
      tokenStore ?? const SecureTokenStore(),
    );
    service._tokenCache = await service._loadToken();
    service._refreshTokenCache = await service._tokenStore.readRefresh();
    return service;
  }

  /// Reads the token from secure storage, migrating a legacy plaintext token
  /// stored by older app versions if present.
  Future<String?> _loadToken() async {
    var token = await _tokenStore.read();
    if (token == null || token.isEmpty) {
      final legacy = _prefs.getString(AppConstants.keyAuthToken);
      if (legacy != null && legacy.isNotEmpty) {
        await _tokenStore.write(legacy);
        await _prefs.remove(AppConstants.keyAuthToken);
        token = legacy;
      }
    }
    return token;
  }

  String? get token => _tokenCache;
  String? get refreshToken => _refreshTokenCache;

  bool get hasSession =>
      (token != null && token!.isNotEmpty) ||
      (refreshToken != null && refreshToken!.isNotEmpty);

  String get serverUrl =>
      _prefs.getString(AppConstants.keyServerUrl) ??
      AppConstants.defaultBaseUrl;

  Future<void> setServerUrl(String url) => _prefs.setString(
    AppConstants.keyServerUrl,
    url.replaceFirst(RegExp(r'/+$'), ''),
  );

  Future<void> saveSession({
    required String token,
    required String refreshToken,
    required User user,
  }) async {
    await _tokenStore.write(token);
    await _tokenStore.writeRefresh(refreshToken);
    _tokenCache = token;
    _refreshTokenCache = refreshToken;
    await _prefs.setString(AppConstants.keyUserId, user.id);
    await _prefs.setString(AppConstants.keyUserName, user.name);
    await _prefs.setString(AppConstants.keyUserEmail, user.email);
    await _prefs.setString(AppConstants.keyUserRole, user.role);
    await _prefs.setString(AppConstants.keyUserAccountScope, user.accountScope);
    await _prefs.setString(
      AppConstants.keyUserPermissions,
      jsonEncode(user.permissions),
    );
    if (user.companyId != null) {
      await _prefs.setString(AppConstants.keyCompanyId, user.companyId!);
    } else {
      await _prefs.remove(AppConstants.keyCompanyId);
    }
    if (user.companyName != null) {
      await _prefs.setString(AppConstants.keyCompanyName, user.companyName!);
    } else {
      await _prefs.remove(AppConstants.keyCompanyName);
    }
    if (user.companyPlan != null) {
      await _prefs.setString(AppConstants.keyCompanyPlan, user.companyPlan!);
    } else {
      await _prefs.remove(AppConstants.keyCompanyPlan);
    }
    if (user.companyStatus != null) {
      await _prefs.setString(
        AppConstants.keyCompanyStatus,
        user.companyStatus!,
      );
    } else {
      await _prefs.remove(AppConstants.keyCompanyStatus);
    }
  }

  Future<void> updateTokens({
    required String token,
    required String refreshToken,
  }) async {
    await _tokenStore.write(token);
    await _tokenStore.writeRefresh(refreshToken);
    _tokenCache = token;
    _refreshTokenCache = refreshToken;
  }

  User? get currentUser {
    if (!hasSession) return null;
    return User(
      id: _prefs.getString(AppConstants.keyUserId) ?? '',
      name: _prefs.getString(AppConstants.keyUserName) ?? 'User',
      email: _prefs.getString(AppConstants.keyUserEmail) ?? '',
      role: _prefs.getString(AppConstants.keyUserRole) ?? 'viewer',
      accountScope:
          _prefs.getString(AppConstants.keyUserAccountScope) ??
          (_prefs.getString(AppConstants.keyCompanyId) == null
              ? 'platform'
              : 'tenant'),
      permissions: _storedPermissions,
      companyId: _prefs.getString(AppConstants.keyCompanyId),
      companyName: _prefs.getString(AppConstants.keyCompanyName),
      companyPlan: _prefs.getString(AppConstants.keyCompanyPlan),
      companyStatus: _prefs.getString(AppConstants.keyCompanyStatus),
    );
  }

  List<String> get _storedPermissions {
    try {
      final value = jsonDecode(
        _prefs.getString(AppConstants.keyUserPermissions) ?? '[]',
      );
      return value is List ? value.map((item) => '$item').toList() : <String>[];
    } catch (_) {
      return <String>[];
    }
  }

  Future<void> clearSession() async {
    await _tokenStore.clear();
    _tokenCache = null;
    _refreshTokenCache = null;
    await _prefs.remove(AppConstants.keyAuthToken);
    await _prefs.remove(AppConstants.keyUserId);
    await _prefs.remove(AppConstants.keyUserName);
    await _prefs.remove(AppConstants.keyUserEmail);
    await _prefs.remove(AppConstants.keyUserRole);
    await _prefs.remove(AppConstants.keyUserAccountScope);
    await _prefs.remove(AppConstants.keyUserPermissions);
    await _prefs.remove(AppConstants.keyCompanyId);
    await _prefs.remove(AppConstants.keyCompanyName);
    await _prefs.remove(AppConstants.keyCompanyPlan);
    await _prefs.remove(AppConstants.keyCompanyStatus);
  }

  /// Raw access used by the locally-persisted sender ID requests.
  String? getRaw(String key) => _prefs.getString(key);

  Future<void> setRaw(String key, String value) => _prefs.setString(key, value);
}
