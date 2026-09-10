import '../../core/services/api_service.dart';
import '../models/user.dart';

class PasswordResetChallenge {
  const PasswordResetChallenge({
    required this.message,
    required this.verificationToken,
  });

  final String message;
  final String verificationToken;
}

/// Auth endpoints: login, forgot/reset password and admin user registration.
class AuthRepository {
  AuthRepository(this._api);

  final ApiService _api;

  /// POST /auth/login → `{token, user}`.
  Future<({String token, String refreshToken, User user})> login({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    final data = await _api.post('/auth/login', {
      'email': email,
      'password': password,
      'rememberMe': rememberMe,
    });
    final token = '${(data as Map)['token'] ?? ''}';
    final refreshToken = '${data['refreshToken'] ?? ''}';
    if (token.isEmpty || refreshToken.isEmpty) {
      throw const ApiException('The server did not return a complete session.');
    }
    final userJson = data['user'];
    final mergedUser = userJson is Map
        ? <String, dynamic>{
            ...Map<String, dynamic>.from(userJson),
            if (data['activeCompanyId'] != null)
              'companyPermissions': data['companyPermissions'],
            'activeCompanyId': data['activeCompanyId'],
            'companies': data['companies'],
          }
        : <String, dynamic>{};
    return (
      token: token,
      refreshToken: refreshToken,
      user: User.fromJson(mergedUser),
    );
  }

  /// POST /auth/forgot-password → always-success message.
  Future<PasswordResetChallenge> forgotPassword(String email) async {
    final data = await _api.post('/auth/forgot-password', {'email': email});
    final map = data is Map ? data : const {};
    final token = '${map['verificationToken'] ?? ''}';
    if (token.isEmpty) {
      throw const ApiException('A verification code could not be created.');
    }
    return PasswordResetChallenge(
      message:
          '${map['message'] ?? 'If the email exists, a verification code was sent.'}',
      verificationToken: token,
    );
  }

  Future<String> verifyResetOtp({
    required String verificationToken,
    required String otp,
  }) async {
    final data = await _api.post('/auth/verify-reset-otp', {
      'verificationToken': verificationToken,
      'otp': otp,
    });
    final token = data is Map ? '${data['resetToken'] ?? ''}' : '';
    if (token.isEmpty) {
      throw const ApiException('The reset token was not returned.');
    }
    return token;
  }

  /// POST /auth/reset-password.
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) => _api.post('/auth/reset-password', {
    'token': token,
    'newPassword': newPassword,
  });

  /// POST /auth/admin/register (admin JWT) — creates a user.
  Future<User> registerUser({
    required String name,
    required String email,
    required String password,
    String role = 'viewer',
    String? phoneNumber,
    List<String> permissions = const <String>[],
  }) async {
    final data = await _api.post('/auth/admin/register', {
      'name': name,
      'email': email,
      'password': password,
      'role': role,
      'permissions': permissions,
      if (phoneNumber != null && phoneNumber.isNotEmpty)
        'phoneNumber': phoneNumber,
    });
    final userJson = (data as Map)['user'] ?? data;
    return User.fromJson(
      userJson is Map ? Map<String, dynamic>.from(userJson) : const {},
    );
  }
}
