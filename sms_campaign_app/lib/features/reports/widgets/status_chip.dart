import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';

/// Small colored chip for statuses (delivered/sent/failed/pending/...).
class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (status.toLowerCase()) {
      'delivered' || 'sent' || 'approved' || 'active' || 'completed' => (
          AppColors.successSoft,
          AppColors.success
        ),
      'failed' || 'rejected' || 'cancelled' => (
          AppColors.softRed,
          AppColors.primary
        ),
      'scheduled' => (const Color(0xffDBEAFE), const Color(0xff2563EB)),
      'recurring' => (const Color(0xffEDE9FE), const Color(0xff7C3AED)),
      'sending' => (const Color(0xffE0F2FE), const Color(0xff0369A1)),
      'partial' => (const Color(0xffFFEDD5), const Color(0xffC2410C)),
      'paused' || 'suspended' => (
          const Color(0xffF1F5F9),
          const Color(0xff475569)
        ),
      'pending' || 'trial' || 'draft' => (
          AppColors.warningSoft,
          AppColors.warning
        ),
      _ => (const Color(0xffEEF2F7), AppColors.muted),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        Formatters.statusLabel(status),
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}
