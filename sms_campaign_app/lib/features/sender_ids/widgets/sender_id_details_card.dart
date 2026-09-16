import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/sender_id.dart';
import '../../reports/widgets/status_chip.dart';

/// Displays the request audit information separately from the sender-ID row.
class SenderIdDetailsCard extends StatelessWidget {
  const SenderIdDetailsCard({super.key, required this.request});

  final SenderId request;

  @override
  Widget build(BuildContext context) {
    final reviewLabel = request.status == 'approved' ? 'Approved' : 'Rejected';
    return Card(
      color: AppColors.gray100,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.description_outlined,
                    size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Request details',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                StatusChip(status: request.status),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 18,
              runSpacing: 10,
              children: [
                _Detail(
                  icon: Icons.calendar_today_outlined,
                  label: 'Requested',
                  value: Formatters.dateTime(request.requestedAt),
                ),
                if (request.companyName?.isNotEmpty == true)
                  _Detail(
                    icon: Icons.business_outlined,
                    label: 'Company',
                    value: request.companyName!,
                  ),
                if (request.requesterName?.isNotEmpty == true)
                  _Detail(
                    icon: Icons.person_outline,
                    label: 'Requested by',
                    value: request.requesterName!,
                  ),
                if (request.reviewerName?.isNotEmpty == true)
                  _Detail(
                    icon: Icons.verified_user_outlined,
                    label: reviewLabel,
                    value:
                        '${request.reviewerName!}${request.reviewedAt == null ? '' : ' · ${Formatters.dateTime(request.reviewedAt!)}'}',
                  ),
              ],
            ),
            if (request.reason?.isNotEmpty == true) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(
                  'Reason\n${request.reason!}',
                  style: const TextStyle(fontSize: 12, height: 1.4),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 130, maxWidth: 320),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 16, color: AppColors.muted),
            const SizedBox(width: 6),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.muted)),
                  Text(value,
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ],
        ),
      );
}
