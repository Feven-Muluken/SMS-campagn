import 'package:intl/intl.dart';

/// Display formatting helpers for dates and phone numbers.
abstract final class Formatters {
  static String date(DateTime? value) => value == null
      ? '—'
      : DateFormat.yMMMd().format(value.toLocal());

  static String dateTime(DateTime? value) => value == null
      ? '—'
      : DateFormat.yMMMd().add_jm().format(value.toLocal());

  static String time(DateTime? value) =>
      value == null ? '—' : DateFormat.jm().format(value.toLocal());

  /// Groups an E.164 phone number for readability, e.g. `+251 91 123 4567`.
  /// Returns the raw value when it does not look like E.164.
  static String phone(String raw) {
    final value = raw.trim();
    if (!value.startsWith('+') || value.length < 8) return value;
    final country = value.substring(0, value.length - 9);
    final rest = value.substring(value.length - 9);
    return '$country ${rest.substring(0, 2)} ${rest.substring(2, 5)} '
        '${rest.substring(5)}';
  }

  /// Short human label for message statuses.
  static String statusLabel(String status) {
    if (status.isEmpty) return 'Unknown';
    if (status.toLowerCase() == 'draft') return 'Not sent';
    if (status.toLowerCase() == 'pending') return 'Pending';
    return status[0].toUpperCase() + status.substring(1);
  }
}
