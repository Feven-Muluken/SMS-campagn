import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/campaign.dart';
import '../../../widgets/interactive_card.dart';
import '../../reports/widgets/status_chip.dart';

/// Card summarizing a campaign in the list.
class CampaignCard extends StatelessWidget {
  const CampaignCard({
    super.key,
    required this.campaign,
    required this.audienceCount,
    this.onTap,
  });

  final Campaign campaign;
  final int audienceCount;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InteractiveCard(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        campaign.name,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Message: ${campaign.message}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.ink,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                StatusChip(status: campaign.visibleStatus),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 14,
              runSpacing: 7,
              children: [
                _Meta(
                  Icons.people_outline,
                  'Audience: $audienceCount (${campaign.groupName ?? campaign.displayType})',
                ),
                if (campaign.creatorName?.isNotEmpty == true)
                  _Meta(Icons.person_outline, 'By: ${campaign.creatorName}'),
                _Meta(
                  Icons.calendar_today_outlined,
                  'Created: ${Formatters.dateTime(campaign.createdAt)}',
                ),
                if (campaign.visibleStatus == 'recurring')
                  _MetaBadge(
                    Icons.event_repeat_outlined,
                    campaign.scheduledAt == null
                        ? 'Recurring'
                        : 'Next send: ${Formatters.dateTime(campaign.scheduledAt)}',
                    background: const Color(0xffEDE9FE),
                    foreground: const Color(0xff6D28D9),
                  )
                else if (campaign.visibleStatus == 'scheduled')
                  _MetaBadge(
                    Icons.schedule_outlined,
                    'Scheduled: ${Formatters.dateTime(campaign.scheduledAt)}',
                    background: const Color(0xffFEF3C7),
                    foreground: const Color(0xffB45309),
                  ),
                if (campaign.lastDispatchAt != null)
                  _MetaBadge(
                    Icons.send_outlined,
                    campaign.lastDispatchStatus == 'sent'
                        ? 'Last sent: ${Formatters.dateTime(campaign.lastDispatchAt)}'
                        : 'Last attempt: ${Formatters.dateTime(campaign.lastDispatchAt)}',
                    background: campaign.lastDispatchStatus == 'failed'
                        ? const Color(0xffFEE2E2)
                        : campaign.lastDispatchStatus == 'partial'
                        ? const Color(0xffFFEDD5)
                        : campaign.lastDispatchStatus == 'pending'
                        ? const Color(0xffFEF3C7)
                        : const Color(0xffDCFCE7),
                    foreground: campaign.lastDispatchStatus == 'failed'
                        ? const Color(0xffDC2626)
                        : campaign.lastDispatchStatus == 'partial'
                        ? const Color(0xffC2410C)
                        : campaign.lastDispatchStatus == 'pending'
                        ? const Color(0xffB45309)
                        : const Color(0xff15803D),
                  ),
              ],
            ),
            if (campaign.queuedCount > 0 ||
                campaign.sentCount > 0 ||
                campaign.deliveredCount > 0 ||
                campaign.failedCount > 0) ...[
              const SizedBox(height: 9),
              Wrap(
                spacing: 7,
                runSpacing: 6,
                children: [
                  if (campaign.queuedCount > 0)
                    _ResultBadge(
                      '${campaign.queuedCount} queued',
                      const Color(0xffFEF3C7),
                      const Color(0xffB45309),
                    ),
                  if (campaign.sentCount > 0)
                    _ResultBadge(
                      '${campaign.sentCount} sent',
                      const Color(0xffDCFCE7),
                      const Color(0xff15803D),
                    ),
                  if (campaign.deliveredCount > 0)
                    _ResultBadge(
                      '${campaign.deliveredCount} delivered',
                      const Color(0xffDBEAFE),
                      const Color(0xff2563EB),
                    ),
                  if (campaign.failedCount > 0)
                    _ResultBadge(
                      '${campaign.failedCount} failed',
                      const Color(0xffFEE2E2),
                      const Color(0xffDC2626),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ResultBadge extends StatelessWidget {
  const _ResultBadge(this.label, this.background, this.foreground);

  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(
      label,
      style: TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w700,
        color: foreground,
      ),
    ),
  );
}

class _MetaBadge extends StatelessWidget {
  const _MetaBadge(
    this.icon,
    this.label, {
    required this.background,
    required this.foreground,
  });

  final IconData icon;
  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(
      color: background,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: foreground),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: foreground,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    ),
  );
}

class _Meta extends StatelessWidget {
  const _Meta(this.icon, this.label);

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 14, color: AppColors.muted),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(fontSize: 12, color: AppColors.muted)),
    ],
  );
}
