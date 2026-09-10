import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../data/models/sms_send_result.dart';

/// Snackbar helpers for success / error / info notices.
abstract final class Notice {
  static void smsResult(BuildContext context, SmsSendResult result) {
    if (result.allSucceeded) return success(context, result.summary);
    if (result.partiallySucceeded) return warning(context, result.summary);
    error(context, result.summary);
  }

  static void success(BuildContext context, String message) =>
      _show(context, message, AppColors.success);

  static void error(BuildContext context, String message) =>
      _show(context, message, AppColors.primary);

  static void info(BuildContext context, String message) =>
      _show(context, message, AppColors.ink);

  static void warning(BuildContext context, String message) =>
      _show(context, message, const Color(0xffB45309));

  static void _show(BuildContext context, String message, Color color) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        backgroundColor: color,
        content: Text(message, style: const TextStyle(color: Colors.white)),
      ));
  }
}
