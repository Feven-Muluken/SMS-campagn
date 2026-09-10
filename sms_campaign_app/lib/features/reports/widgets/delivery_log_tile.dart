import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/message.dart';
import '../../../widgets/entity_detail_sheet.dart';
import 'status_chip.dart';

/// Responsive delivery summary with a complete, drill-down detail sheet.
class DeliveryLogTile extends StatelessWidget {
  const DeliveryLogTile({super.key, required this.message});

  final Message message;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _showDetails(context),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: AppColors.softRed,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      _sourceIcon,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          message.displayName,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          message.cardType,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusChip(status: message.status),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                message.content,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 5),
              if (message.pendingCount > 0 ||
                  message.sentCount > 0 ||
                  message.deliveredCount > 0 ||
                  message.failedCount > 0) ...[
                Wrap(
                  spacing: 8,
                  runSpacing: 5,
                  children: [
                    if (message.pendingCount > 0)
                      _count(
                        '${message.pendingCount} pending',
                        Colors.amber.shade800,
                      ),
                    if (message.sentCount > 0)
                      _count(
                        '${message.sentCount} sent',
                        Colors.green.shade700,
                      ),
                    if (message.deliveredCount > 0)
                      _count(
                        '${message.deliveredCount} delivered',
                        Colors.blue.shade700,
                      ),
                    if (message.failedCount > 0)
                      _count(
                        '${message.failedCount} failed',
                        Colors.red.shade700,
                      ),
                  ],
                ),
                const SizedBox(height: 7),
              ],
              Row(
                children: [
                  Text(
                    message.status.toLowerCase() == 'pending' &&
                            message.scheduledAt != null
                        ? '${message.recurringActive ? 'Next recurring send' : 'Scheduled'}: ${Formatters.dateTime(message.scheduledAt)}'
                        : Formatters.dateTime(
                            message.sentAt ?? message.createdAt,
                          ),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData get _sourceIcon => switch (message.sourceType) {
    'Campaign' => Icons.campaign_outlined,
    'Group' => Icons.groups_outlined,
    'Contact' || 'User' => Icons.chat_bubble_outline,
    _ => Icons.chat_bubble_outline,
  };

  Widget _count(String label, Color color) => Text(
    label,
    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: color),
  );

  Future<void> _showDetails(BuildContext context) => showEntityDetailSheet(
    context,
    title: message.displayName,
    icon: _sourceIcon,
    status: StatusChip(status: message.status),
    details: [
      DetailItem(Icons.route_outlined, 'Sent as', message.sourceType),
      if (message.lastDispatchStatus?.isNotEmpty == true)
        DetailItem(
          Icons.history_outlined,
          'Last sending attempt',
          Formatters.statusLabel(message.lastDispatchStatus!),
        ),
      DetailItem(
        Icons.campaign_outlined,
        'Campaign',
        message.campaignName ?? '',
      ),
      DetailItem(
        Icons.category_outlined,
        'Campaign type',
        message.campaignType ?? '',
      ),
      DetailItem(
        Icons.person_outline,
        'Created by',
        message.campaignCreatorName ?? '',
      ),
      DetailItem(Icons.people_outline, 'Audience', message.audience),
      DetailItem(
        Icons.people_outline,
        'Group members',
        message.groupMemberCount > 0 ? '${message.groupMemberCount}' : '',
      ),
      DetailItem(
        Icons.people_alt_outlined,
        'Recipients',
        message.campaignRecipientCount > 0
            ? '${message.campaignRecipientCount}'
            : '',
      ),
      DetailItem(
        Icons.phone_outlined,
        'Phone number',
        Formatters.phone(message.phoneNumber),
      ),
      DetailItem(
        Icons.send_outlined,
        'Sent',
        Formatters.dateTime(message.sentAt),
      ),
      DetailItem(
        Icons.calendar_today_outlined,
        message.status.toLowerCase() == 'pending' ? 'First created' : 'Created',
        Formatters.dateTime(message.createdAt),
      ),
      if (message.status.toLowerCase() == 'pending' &&
          message.scheduledAt != null)
        DetailItem(
          message.recurringActive
              ? Icons.event_repeat_outlined
              : Icons.event_outlined,
          message.recurringActive ? 'Next recurring send' : 'Upcoming send',
          Formatters.dateTime(message.scheduledAt),
        ),
      if (message.recurringActive)
        DetailItem(
          Icons.repeat_outlined,
          'Recurrence',
          message.recurringInterval?.isNotEmpty == true
              ? Formatters.statusLabel(message.recurringInterval!)
              : 'Active',
        ),
      DetailItem(
        Icons.update_outlined,
        'Updated',
        Formatters.dateTime(message.updatedAt),
      ),
      DetailItem(
        Icons.error_outline,
        'Failure reason',
        message.failureReason ?? '',
      ),
    ],
    bodyLabel: 'Message',
    body: message.content,
  );

  // TODO: Remove after the redesigned detail sheet has completed visual QA.
  // ignore: unused_element
  Future<void> _showLegacyDetails(BuildContext context) =>
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (context) => SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 620),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            message.displayName,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        StatusChip(status: message.status),
                      ],
                    ),
                    const SizedBox(height: 18),
                    _detail('Sent as', message.sourceType),
                    if (message.campaignName?.isNotEmpty ?? false)
                      _detail('Campaign', message.campaignName!),
                    if (message.campaignType?.isNotEmpty ?? false)
                      _detail('Campaign type', message.campaignType!),
                    if (message.campaignCreatorName?.isNotEmpty ?? false)
                      _detail('Created by', message.campaignCreatorName!),
                    if (message.groupName?.isNotEmpty ?? false)
                      _detail('Group', message.groupName!),
                    if (message.groupMemberCount > 0)
                      _detail('Group members', '${message.groupMemberCount}'),
                    if (message.campaignRecipientCount > 0)
                      _detail(
                        'Campaign recipients',
                        '${message.campaignRecipientCount}',
                      ),
                    if (message.recipientName?.isNotEmpty ?? false)
                      _detail(
                        message.recipientType ?? 'Contact',
                        message.recipientName!,
                      ),
                    _detail(
                      'Phone number',
                      Formatters.phone(message.phoneNumber),
                    ),
                    _detail('Sent', Formatters.dateTime(message.sentAt)),
                    _detail('Created', Formatters.dateTime(message.createdAt)),
                    if (message.failureReason?.isNotEmpty ?? false)
                      _detail('Failure reason', message.failureReason!),
                    const SizedBox(height: 14),
                    const Text(
                      'Message',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.gray100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: SelectableText(message.content),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

  Widget _detail(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 130,
          child: Text(
            label,
            style: const TextStyle(fontSize: 12, color: AppColors.muted),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );
}
