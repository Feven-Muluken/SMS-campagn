import '../config/app_constants.dart';

/// Form field validators. Each returns `null` when valid, else an error text.
abstract final class Validators {
  static final RegExp _emailPattern =
      RegExp(r'^[\w.+-]+@[\w-]+\.[\w.]{2,}$');
  static final RegExp _e164Pattern = RegExp(r'^\+[1-9]\d{7,14}$');

  static String? required(String? value, [String field = 'This field']) {
    if (value == null || value.trim().isEmpty) return '$field is required';
    return null;
  }

  static String? email(String? value) {
    final empty = required(value, 'Email');
    if (empty != null) return empty;
    if (!_emailPattern.hasMatch(value!.trim())) {
      return 'Enter a valid email address';
    }
    return null;
  }

  /// E.164 phone numbers, e.g. `+251911234567`.
  static String? phone(String? value) {
    final empty = required(value, 'Phone number');
    if (empty != null) return empty;
    if (!_e164Pattern.hasMatch(value!.trim())) {
      return 'Use E.164 format, e.g. +251911234567';
    }
    return null;
  }

  static String? password(String? value) {
    final empty = required(value, 'Password');
    if (empty != null) return empty;
    if (value!.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  /// Sender IDs: 1-11 alphanumeric characters (backend rule).
  static String? senderId(String? value) {
    final empty = required(value, 'Sender ID');
    if (empty != null) return empty;
    if (!AppConstants.senderIdPattern.hasMatch(value!.trim())) {
      return '1-11 letters or digits, no spaces';
    }
    return null;
  }
}
