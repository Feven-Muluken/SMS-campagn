import 'package:flutter/foundation.dart';

import '../../core/services/api_service.dart';
import '../../core/services/storage_service.dart';
import '../models/user.dart';
import '../repositories/auth_repository.dart';

/// Session state: stored token, current user, login/logout actions.
class AuthProvider extends ChangeNotifier {
  AuthProvider(this._auth, this._storage);

  final AuthRepository _auth;
  final StorageService _storage;

  User? user;
  bool busy = false;
  String? error;

  bool get isLoggedIn => _storage.hasSession;
  bool get isAdmin => user?.isAdmin ?? false;

  static const Map<String, Set<String>> _rolePermissions = {
    'admin': {
      'dashboard.view',
      'campaign.view',
      'campaign.create',
      'campaign.manage',
      'campaign.schedule',
      'campaign.send',
      'contact.view',
      'contact.create',
      'contact.manage',
      'contact.send',
      'group.view',
      'group.create',
      'group.manage',
      'group.send',
      'user.manage',
      'sms.send',
      'delivery.view',
      'appointment.view',
      'appointment.manage',
      'inbox.view',
      'inbox.reply',
      'inbox.assign',
      'inbox.status',
      'geo.send',
      'billing.send',
      'company.manage',
    },
    'staff': {
      'dashboard.view',
      'campaign.view',
      'campaign.create',
      'campaign.manage',
      'campaign.schedule',
      'campaign.send',
      'contact.view',
      'contact.create',
      'contact.manage',
      'contact.send',
      'group.view',
      'group.create',
      'group.manage',
      'group.send',
      'sms.send',
      'delivery.view',
      'appointment.view',
      'appointment.manage',
      'inbox.view',
      'inbox.reply',
      'inbox.status',
      'geo.send',
      'billing.send',
    },
    'viewer': {
      'dashboard.view',
      'campaign.view',
      'campaign.create',
      'campaign.schedule',
      'contact.view',
      'contact.create',
      'group.view',
      'group.create',
      'delivery.view',
      'appointment.view',
      'inbox.view',
    },
  };

  bool can(String permission) {
    final current = user;
    if (current == null) return false;
    if (current.role == 'admin' && current.companyId == null) return true;
    return current.can(permission);
  }

  void restoreSession() {
    user = _storage.currentUser;
  }

  Future<bool> login({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      final session = await _auth.login(
        email: email,
        password: password,
        rememberMe: rememberMe,
      );
      await _storage.saveSession(
        token: session.token,
        refreshToken: session.refreshToken,
        user: session.user,
      );
      user = session.user;
      return true;
    } catch (e) {
      error = errorMessage(e);
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<PasswordResetChallenge?> forgotPassword(String email) async {
    try {
      return await _auth.forgotPassword(email);
    } catch (e) {
      error = errorMessage(e);
      notifyListeners();
      return null;
    }
  }

  Future<String?> verifyResetOtp(String verificationToken, String otp) async {
    try {
      return await _auth.verifyResetOtp(
        verificationToken: verificationToken,
        otp: otp,
      );
    } catch (e) {
      error = errorMessage(e);
      notifyListeners();
      return null;
    }
  }

  Future<bool> resetPassword(String token, String newPassword) async {
    try {
      await _auth.resetPassword(token: token, newPassword: newPassword);
      return true;
    } catch (e) {
      error = errorMessage(e);
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.clearSession();
    user = null;
    notifyListeners();
  }
}
