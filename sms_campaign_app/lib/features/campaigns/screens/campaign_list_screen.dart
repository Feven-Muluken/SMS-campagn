import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/utils/formatters.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/campaign.dart';
import '../../../data/models/contact.dart';
import '../../../data/models/message.dart';
import '../../../data/providers/campaigns_provider.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/providers/contacts_provider.dart';
import '../../../data/providers/groups_provider.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/status_filter_chip.dart';
import '../../reports/widgets/status_chip.dart';
import '../../reports/widgets/delivery_log_tile.dart';
import 'create_campaign_screen.dart';
import '../widgets/campaign_card.dart';

/// Admin campaign list with search, detail sheet, delete and "Send now".
class CampaignListScreen extends StatefulWidget {
  const CampaignListScreen({super.key});

  @override
  State<CampaignListScreen> createState() => _CampaignListScreenState();
}

class _CampaignListScreenState extends State<CampaignListScreen> {
  Timer? _refreshTimer;

  Future<void> _refresh() => Future.wait([
    context.read<CampaignsProvider>().load(),
    context.read<GroupsProvider>().load(),
    context.read<ContactsProvider>().load(),
  ]);

  Future<void> _openCreate() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) => FractionallySizedBox(
        heightFactor: .92,
        child: CreateCampaignScreen(
          embedded: true,
          onDone: () => Navigator.of(sheetContext).pop(),
        ),
      ),
    );
    if (!mounted) return;
    await _refresh();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CampaignsProvider>().load();
      context.read<GroupsProvider>().load();
      context.read<ContactsProvider>().load();
      _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
        if (mounted) context.read<CampaignsProvider>().load();
      });
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _openDetail(Campaign campaign) async {
    var detail = campaign;
    try {
      detail = await context.read<CampaignsProvider>().getById(campaign.id);
    } catch (error) {
      if (mounted) Notice.error(context, '$error');
    }
    if (!mounted) return;
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => _CampaignDetailSheet(campaign: detail),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<CampaignsProvider>();
    final groups = context.watch<GroupsProvider>();
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        icon: const Icon(Icons.add),
        label: const Text('New campaign'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: const InputDecoration(
                      hintText: 'Search campaigns',
                      prefixIcon: Icon(Icons.search, size: 20),
                    ),
                    onChanged: provider.setSearch,
                  ),
                ),
                const SizedBox(width: 10),
                IconButton(
                  tooltip: 'Refresh campaigns',
                  visualDensity: VisualDensity.compact,
                  onPressed: provider.loading ? null : _refresh,
                  icon: const Icon(Icons.refresh, size: 20),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 10),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '${provider.campaigns.length} ${provider.campaigns.length == 1 ? 'campaign' : 'campaigns'}',
                style: const TextStyle(
                  color: AppColors.muted,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          SizedBox(
            height: 42,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: CampaignsProvider.statuses.length,
              separatorBuilder: (_, _) => const SizedBox(width: 7),
              itemBuilder: (_, index) {
                final status = CampaignsProvider.statuses[index];
                return StatusFilterChip(
                  label: Formatters.statusLabel(status),
                  selected: provider.filter == status,
                  onSelected: (_) => provider.setFilter(status),
                );
              },
            ),
          ),
          const SizedBox(height: 6),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                child: provider.loading
                    ? const Loader()
                    : provider.error != null
                    ? ErrorView(
                        message: provider.error!,
                        onRetry: provider.load,
                      )
                    : provider.campaigns.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [
                          SizedBox(height: 120),
                          EmptyState(
                            icon: Icons.campaign_outlined,
                            title: 'No campaigns yet',
                            subtitle:
                                'Create your first campaign to start sending.',
                          ),
                        ],
                      )
                    : ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                        itemCount: provider.campaigns.length,
                        itemBuilder: (context, i) => AnimatedEntry(
                          index: i,
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: CampaignCard(
                              campaign: provider.campaigns[i],
                              audienceCount: provider.campaigns[i].group != null
                                  ? (groups
                                            .byId(provider.campaigns[i].group!)
                                            ?.memberCount ??
                                        0)
                                  : provider.campaigns[i].type ==
                                        'broadcast/everyone'
                                  ? context
                                        .read<ContactsProvider>()
                                        .contacts
                                        .length
                                  : provider.campaigns[i].recipients.length,
                              onTap: () => _openDetail(provider.campaigns[i]),
                            ),
                          ),
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CampaignDetailSheet extends StatelessWidget {
  const _CampaignDetailSheet({required this.campaign});

  final Campaign campaign;

  Future<void> _delete(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete campaign?'),
        content: Text('"${campaign.name}" will be permanently removed.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    final error = await context.read<CampaignsProvider>().remove(campaign.id);
    if (!context.mounted) return;
    Navigator.of(context).pop();
    if (error != null) {
      Notice.error(context, error);
    } else {
      Notice.success(context, 'Campaign deleted');
    }
  }

  Future<void> _sendNow(BuildContext context) async {
    final provider = context.read<CampaignsProvider>();
    final error = await provider.sendNow(campaign.id);
    if (!context.mounted) return;
    if (error != null) {
      Notice.error(context, error);
    } else {
      final result = provider.lastSendResult;
      if (result != null && result.successCount > 0) {
        Navigator.of(context).pop();
      }
      if (result == null) {
        Notice.error(context, 'The server returned no sending result.');
      } else {
        Notice.smsResult(context, result);
      }
    }
  }

  Future<void> _changeStatus(BuildContext context, String action) async {
    if (action == 'cancel') {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Cancel campaign schedule?'),
          content: const Text(
            'Future scheduled SMS messages for this campaign will not be sent.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Keep schedule'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Cancel schedule'),
            ),
          ],
        ),
      );
      if (confirmed != true || !context.mounted) return;
    }
    final error = await context.read<CampaignsProvider>().changeStatus(
      campaign.id,
      action,
    );
    if (!context.mounted) return;
    if (error != null) {
      Notice.error(context, error);
      return;
    }
    Navigator.of(context).pop();
    Notice.success(
      context,
      action == 'pause'
          ? 'Campaign paused'
          : action == 'resume'
          ? 'Campaign resumed'
          : 'Campaign cancelled',
    );
  }

  void _edit(BuildContext context) {
    Navigator.of(context).pop();
    Navigator.of(
      context,
    ).pushNamed(AppRoutes.campaignCreate, arguments: campaign);
  }

  @override
  Widget build(BuildContext context) {
    final sending = context.watch<CampaignsProvider>().sending;
    final auth = context.watch<AuthProvider>();
    final canManage = auth.can('campaign.manage');
    final canSend = auth.can('campaign.send');
    final canSchedule = auth.can('campaign.schedule');
    final contacts = context.watch<ContactsProvider>();
    final group = campaign.group == null
        ? null
        : context.watch<GroupsProvider>().byId(campaign.group!);
    final groupContacts = (group?.members ?? const <String>[])
        .map(contacts.byId)
        .whereType<Contact>()
        .toList();
    final directContacts = campaign.recipients
        .map(contacts.byId)
        .whereType<Contact>()
        .toList();
    final audienceCount = group != null
        ? group.memberCount
        : campaign.type == 'broadcast/everyone'
        ? contacts.contacts.length
        : campaign.recipients.length;
    final resolvedNames = <String>{
      ...campaign.contactRecipients,
      ...campaign.userRecipients,
      ...directContacts.map(
        (contact) => '${contact.name} (${contact.phoneNumber})',
      ),
    }.toList();
    return FractionallySizedBox(
      heightFactor: .9,
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          campaign.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      StatusChip(status: campaign.visibleStatus),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Created ${Formatters.dateTime(campaign.createdAt)}',
                    style: const TextStyle(
                      color: AppColors.muted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text('Message: ${campaign.message}'),
                  ),
                  const SizedBox(height: 8),
                  _detailRow(
                    Icons.people_outline,
                    'Audience',
                    '$audienceCount recipients',
                  ),
                  if (campaign.groupName?.isNotEmpty == true)
                    _detailRow(
                      Icons.groups_outlined,
                      'Group',
                      campaign.groupName!,
                    ),
                  _detailRow(
                    Icons.category_outlined,
                    'Campaign type',
                    campaign.displayType,
                  ),
                  if (campaign.creatorName?.isNotEmpty == true)
                    _detailRow(
                      Icons.person_outline,
                      'Created by',
                      campaign.creatorName!,
                    ),
                  _detailRow(
                    Icons.calendar_today_outlined,
                    'Created',
                    Formatters.dateTime(campaign.createdAt),
                  ),
                  if (campaign.updatedAt != null)
                    _detailRow(
                      Icons.update_outlined,
                      'Updated',
                      Formatters.dateTime(campaign.updatedAt),
                    ),
                  if (campaign.scheduledAt != null)
                    _detailRow(
                      Icons.schedule_outlined,
                      campaign.visibleStatus == 'recurring'
                          ? 'Next scheduled send'
                          : campaign.visibleStatus == 'scheduled'
                          ? 'Scheduled send'
                          : 'Last scheduled time',
                      Formatters.dateTime(campaign.scheduledAt),
                    ),
                  _detailRow(
                    Icons.event_repeat_outlined,
                    'Schedule status',
                    campaign.scheduleLabel,
                  ),
                  if (campaign.lastDispatchAt != null)
                    _detailRow(
                      Icons.send_outlined,
                      'Last attempt',
                      '${Formatters.dateTime(campaign.lastDispatchAt)}'
                          '${campaign.lastDispatchStatus?.isNotEmpty == true ? ' · ${Formatters.statusLabel(campaign.lastDispatchStatus!)}' : ''}',
                    ),
                  const SizedBox(height: 16),
                  if (group != null)
                    _audienceExpansion(
                      icon: Icons.groups_outlined,
                      title: 'Group contacts',
                      count: groupContacts.length,
                      emptyMessage: 'No group contacts are available.',
                      children: [
                        for (final contact in groupContacts)
                          _recipientTile(contact.name, contact.phoneNumber),
                      ],
                    )
                  else if (campaign.type == 'broadcast/everyone')
                    _audienceExpansion(
                      icon: Icons.campaign_outlined,
                      title: 'Broadcast audience',
                      count: contacts.contacts.length,
                      emptyMessage: 'No contacts are available.',
                      children: [
                        for (final contact in contacts.contacts)
                          _recipientTile(contact.name, contact.phoneNumber),
                      ],
                    )
                  else
                    _audienceExpansion(
                      icon: Icons.contacts_outlined,
                      title: 'Selected contacts',
                      count: directContacts.isNotEmpty
                          ? directContacts.length
                          : resolvedNames.length,
                      emptyMessage: 'No selected contacts are available.',
                      children: [
                        if (directContacts.isNotEmpty)
                          for (final contact in directContacts)
                            _recipientTile(contact.name, contact.phoneNumber)
                        else
                          for (final name in resolvedNames)
                            _recipientTile(name, null),
                      ],
                    ),
                  if (campaign.recurringActive) ...[
                    const SizedBox(height: 14),
                    const Text(
                      'Recurrence',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 7),
                    _recurrenceCard(context),
                  ],
                  const SizedBox(height: 16),
                  _InlineCampaignHistory(campaign: campaign),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
          if (canManage || canSend || canSchedule)
            _bottomActionCard(
              context,
              sending,
              canManage,
              canSend,
              canSchedule,
            ),
        ],
      ),
    );
  }

  Widget _bottomActionCard(
    BuildContext context,
    bool sending,
    bool canManage,
    bool canSend,
    bool canSchedule,
  ) => Container(
    width: double.infinity,
    padding: EdgeInsets.fromLTRB(
      12,
      10,
      12,
      MediaQuery.paddingOf(context).bottom + 10,
    ),
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: Color(0xffE5E7EB))),
    ),
    child: Row(
      children: [
        if (canSchedule &&
            campaign.recurringActive &&
            campaign.status != 'paused') ...[
          _iconAction(
            Icons.pause_outlined,
            'Pause campaign',
            () => _changeStatus(context, 'pause'),
          ),
          const SizedBox(width: 5),
        ] else if (canSchedule && campaign.status == 'paused') ...[
          _iconAction(
            Icons.play_arrow_outlined,
            'Resume campaign',
            () => _changeStatus(context, 'resume'),
          ),
          const SizedBox(width: 5),
        ],
        if (canManage &&
            (campaign.recurringActive ||
                campaign.visibleStatus == 'scheduled')) ...[
          _iconAction(
            Icons.edit_outlined,
            'Edit campaign',
            () => _edit(context),
          ),
          const SizedBox(width: 5),
        ],
        if (canSchedule && campaign.visibleStatus == 'scheduled') ...[
          _iconAction(
            Icons.cancel_outlined,
            'Cancel schedule',
            () => _changeStatus(context, 'cancel'),
          ),
          const SizedBox(width: 5),
        ],
        if (canSend)
          Expanded(
            child: FilledButton.icon(
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 42),
                padding: const EdgeInsets.symmetric(horizontal: 8),
                textStyle: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
              onPressed:
                  sending ||
                      [
                        'sending',
                        'paused',
                        'cancelled',
                      ].contains(campaign.status)
                  ? null
                  : () => _sendNow(context),
              icon: sending
                  ? const SizedBox.square(
                      dimension: 15,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.send_outlined, size: 17),
              label: Text(sending ? 'Sending…' : 'Send now'),
            ),
          ),
        if (canSend && canManage) const SizedBox(width: 5),
        if (canManage)
          _iconAction(
            Icons.delete_outline,
            'Delete campaign',
            () => _delete(context),
            destructive: true,
          ),
      ],
    ),
  );

  Widget _iconAction(
    IconData icon,
    String tooltip,
    VoidCallback onPressed, {
    bool destructive = false,
  }) => Tooltip(
    message: tooltip,
    child: IconButton(
      onPressed: onPressed,
      icon: Icon(icon, size: 20),
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(42, 42)),
        padding: const WidgetStatePropertyAll(EdgeInsets.zero),
        side: const WidgetStatePropertyAll(BorderSide(color: AppColors.border)),
        foregroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.pressed)
              ? Colors.white
              : destructive
              ? AppColors.primary
              : AppColors.ink,
        ),
        backgroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.pressed)
              ? AppColors.primary
              : Colors.transparent,
        ),
      ),
    ),
  );

  Widget _recurrenceCard(BuildContext context) {
    final next = campaign.scheduledAt?.toLocal();
    final interval = campaign.recurringInterval;
    final repeat = interval == 'daily'
        ? 'Every day'
        : interval == 'weekly'
        ? 'Every week'
        : interval == 'monthly'
        ? 'Every month'
        : 'Recurring';
    const weekdays = <String>[
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xffF5F1FF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _recurrenceValue('Repeat', repeat),
                const SizedBox(height: 10),
                _recurrenceValue(
                  'On',
                  interval == 'weekly' && next != null
                      ? weekdays[next.weekday - 1]
                      : interval == 'daily'
                      ? 'Every day'
                      : 'Scheduled day',
                ),
              ],
            ),
          ),
          Container(
            width: 1,
            height: 66,
            margin: const EdgeInsets.symmetric(horizontal: 12),
            color: const Color(0xffE7E0F8),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _recurrenceValue(
                  'Time',
                  next == null
                      ? 'Not set'
                      : TimeOfDay.fromDateTime(next).format(context),
                ),
                const SizedBox(height: 10),
                _recurrenceValue(
                  'End',
                  campaign.recurrenceEndAt == null
                      ? 'Never'
                      : Formatters.dateTime(campaign.recurrenceEndAt),
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right, size: 20),
        ],
      ),
    );
  }

  Widget _recurrenceValue(String label, String value) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontSize: 10, color: AppColors.muted)),
      const SizedBox(height: 3),
      Text(
        value,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
      ),
    ],
  );

  Widget _detailRow(IconData icon, String label, String value) => Padding(
    padding: const EdgeInsets.only(top: 10),
    child: Row(
      children: [
        Icon(icon, size: 18, color: AppColors.muted),
        const SizedBox(width: 8),
        Text('$label: ', style: const TextStyle(color: AppColors.muted)),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );

  Widget _audienceExpansion({
    required IconData icon,
    required String title,
    required int count,
    required String emptyMessage,
    required List<Widget> children,
  }) => Container(
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border.all(color: const Color(0xffE5E7EB)),
      borderRadius: BorderRadius.circular(12),
      boxShadow: const [
        BoxShadow(
          color: Color(0x0D000000),
          blurRadius: 8,
          offset: Offset(0, 2),
        ),
      ],
    ),
    child: ExpansionTile(
      tilePadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      visualDensity: const VisualDensity(vertical: -2),
      leading: Container(
        width: 38,
        height: 38,
        decoration: const BoxDecoration(
          color: Color(0xffFEE2E2),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: const Color(0xffDF0A0A), size: 19),
      ),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 13,
          height: 1.05,
          fontWeight: FontWeight.w700,
        ),
      ),
      subtitle: Text(
        icon == Icons.groups_outlined ? 'Group' : 'Audience',
        style: const TextStyle(fontSize: 10, color: AppColors.muted),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '$count',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                count == 1 ? 'Recipient' : 'Recipients',
                style: const TextStyle(fontSize: 9, color: AppColors.muted),
              ),
            ],
          ),
          const SizedBox(width: 6),
          const Icon(Icons.chevron_right, size: 20),
        ],
      ),
      childrenPadding: const EdgeInsets.fromLTRB(8, 0, 8, 6),
      children: children.isEmpty
          ? [
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  emptyMessage,
                  style: const TextStyle(color: AppColors.muted),
                ),
              ),
            ]
          : children,
    ),
  );

  Widget _recipientTile(String name, String? phone) => ListTile(
    dense: true,
    visualDensity: const VisualDensity(vertical: -4),
    minVerticalPadding: 0,
    minLeadingWidth: 24,
    horizontalTitleGap: 8,
    contentPadding: const EdgeInsets.symmetric(horizontal: 4),
    leading: const CircleAvatar(
      radius: 12,
      child: Icon(Icons.person_outline, size: 14),
    ),
    title: Text(
      name,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(fontSize: 12, height: 1),
    ),
    subtitle: phone == null || phone.isEmpty
        ? null
        : Text(
            phone,
            style: const TextStyle(
              fontSize: 10,
              height: 1.05,
              color: AppColors.muted,
            ),
          ),
  );
}

class _InlineCampaignHistory extends StatefulWidget {
  const _InlineCampaignHistory({required this.campaign});

  final Campaign campaign;

  @override
  State<_InlineCampaignHistory> createState() => _InlineCampaignHistoryState();
}

class _InlineCampaignHistoryState extends State<_InlineCampaignHistory> {
  late Future<List<Message>> _history;
  bool _showAll = false;
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    _history = _load();
  }

  Future<List<Message>> _load() =>
      context.read<CampaignsProvider>().sendingHistory(widget.campaign.id);

  Future<void> _refresh() async {
    if (_refreshing) return;
    final nextHistory = _load();
    setState(() {
      _refreshing = true;
      _history = nextHistory;
    });
    try {
      await nextHistory;
    } catch (_) {
      // The FutureBuilder below presents the backend error and retry action.
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Row(
        children: [
          const Expanded(
            child: Text(
              'Sending history',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          FutureBuilder<List<Message>>(
            future: _history,
            builder: (context, snapshot) {
              final records = snapshot.data ?? const <Message>[];
              final historyCount = records
                  .map(
                    (message) => message.dispatchId?.isNotEmpty == true
                        ? message.dispatchId!
                        : 'legacy-${message.id}',
                  )
                  .toSet()
                  .length;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.gray100,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$historyCount ${historyCount == 1 ? 'record' : 'records'}',
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 2),
          IconButton(
            tooltip: 'Refresh history',
            visualDensity: VisualDensity.compact,
            onPressed: _refreshing ? null : _refresh,
            icon: _refreshing
                ? const SizedBox.square(
                    dimension: 17,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh, size: 18),
          ),
        ],
      ),
      FutureBuilder<List<Message>>(
        future: _history,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: Center(
                child: SizedBox.square(
                  dimension: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            );
          }
          if (snapshot.hasError) {
            return TextButton.icon(
              onPressed: _refreshing ? null : _refresh,
              icon: const Icon(Icons.refresh, size: 17),
              label: const Text('Could not load history. Retry'),
            );
          }
          final records = snapshot.data ?? const <Message>[];
          if (records.isEmpty) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Text(
                'No sending history yet.',
                style: TextStyle(fontSize: 11, color: AppColors.muted),
              ),
            );
          }
          final grouped = <String, List<Message>>{};
          for (final record in records) {
            final key = record.dispatchId?.isNotEmpty == true
                ? record.dispatchId!
                : 'legacy-${record.id}';
            grouped.putIfAbsent(key, () => <Message>[]).add(record);
          }
          final attempts = grouped.values.toList()
            ..sort((a, b) {
              DateTime latest(List<Message> rows) => rows
                  .map((row) => row.sentAt ?? row.createdAt ?? DateTime(1970))
                  .reduce((left, right) => left.isAfter(right) ? left : right);
              return latest(b).compareTo(latest(a));
            });
          final visible = _showAll ? attempts : attempts.take(5).toList();
          return Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xffE5E7EB)),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.fromLTRB(10, 10, 10, 6),
            child: Column(
              children: [
                const Row(
                  children: [
                    Expanded(flex: 3, child: _HistoryLabel('Date')),
                    Expanded(child: _HistoryLabel('Sent')),
                    Expanded(child: _HistoryLabel('Delivered')),
                    Expanded(child: _HistoryLabel('Failed')),
                    Expanded(
                      flex: 2,
                      child: _HistoryLabel('Status', end: true),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                for (final attempt in visible)
                  _CampaignAttemptTile(records: attempt),
                if (attempts.length > 5)
                  TextButton.icon(
                    onPressed: () => setState(() => _showAll = !_showAll),
                    label: Text(
                      _showAll ? 'Show recent history' : 'Load older history',
                    ),
                    icon: Icon(
                      _showAll ? Icons.expand_less : Icons.expand_more,
                      size: 17,
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    ],
  );
}

class _CampaignHistorySheet extends StatefulWidget {
  const _CampaignHistorySheet({required this.campaign});

  final Campaign campaign;

  @override
  State<_CampaignHistorySheet> createState() => _CampaignHistorySheetState();
}

class _CampaignHistorySheetState extends State<_CampaignHistorySheet> {
  late Future<List<Message>> _history;

  @override
  void initState() {
    super.initState();
    _history = _load();
  }

  Future<List<Message>> _load() =>
      context.read<CampaignsProvider>().sendingHistory(widget.campaign.id);

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _history = next);
    await next;
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: FractionallySizedBox(
      heightFactor: .84,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Message history',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: 'Refresh history',
                  visualDensity: VisualDensity.compact,
                  onPressed: _refresh,
                  icon: const Icon(Icons.refresh, size: 20),
                ),
              ],
            ),
            Text(
              widget.campaign.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.muted,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: FutureBuilder<List<Message>>(
                future: _history,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Loader();
                  }
                  if (snapshot.hasError) {
                    return ErrorView(
                      message: '${snapshot.error}',
                      onRetry: () => _refresh(),
                    );
                  }
                  final records = snapshot.data ?? const <Message>[];
                  if (records.isEmpty) {
                    return RefreshIndicator(
                      onRefresh: _refresh,
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [
                          SizedBox(height: 60),
                          EmptyState(
                            icon: Icons.outbox_outlined,
                            title: 'No SMS history',
                            subtitle: 'This campaign has not been sent yet.',
                          ),
                        ],
                      ),
                    );
                  }
                  final grouped = <String, List<Message>>{};
                  for (final record in records) {
                    final key = record.dispatchId?.isNotEmpty == true
                        ? record.dispatchId!
                        : 'legacy-${record.id}';
                    grouped.putIfAbsent(key, () => <Message>[]).add(record);
                  }
                  final attempts = grouped.values.toList()
                    ..sort((a, b) {
                      DateTime latest(List<Message> rows) => rows
                          .map(
                            (row) =>
                                row.sentAt ?? row.createdAt ?? DateTime(1970),
                          )
                          .reduce(
                            (left, right) => left.isAfter(right) ? left : right,
                          );
                      return latest(b).compareTo(latest(a));
                    });
                  return RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount: attempts.length + 1,
                      separatorBuilder: (_, _) => const SizedBox(height: 6),
                      itemBuilder: (_, index) {
                        if (index == 0) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${attempts.length} ${attempts.length == 1 ? 'sending attempt' : 'sending attempts'}',
                                  style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                const Row(
                                  children: [
                                    Expanded(
                                      flex: 3,
                                      child: _HistoryLabel('Date'),
                                    ),
                                    Expanded(child: _HistoryLabel('Sent')),
                                    Expanded(child: _HistoryLabel('Delivered')),
                                    Expanded(child: _HistoryLabel('Failed')),
                                    Expanded(
                                      flex: 2,
                                      child: _HistoryLabel('Status', end: true),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        }
                        return _CampaignAttemptTile(
                          records: attempts[index - 1],
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _HistoryLabel extends StatelessWidget {
  const _HistoryLabel(this.label, {this.end = false});

  final String label;
  final bool end;

  @override
  Widget build(BuildContext context) => Text(
    label,
    textAlign: end ? TextAlign.end : TextAlign.center,
    maxLines: 1,
    overflow: TextOverflow.ellipsis,
    style: const TextStyle(
      fontSize: 9,
      color: AppColors.muted,
      fontWeight: FontWeight.w700,
    ),
  );
}

class _CampaignAttemptTile extends StatelessWidget {
  const _CampaignAttemptTile({required this.records});

  final List<Message> records;

  @override
  Widget build(BuildContext context) {
    final sent = records.where((row) => row.status == 'sent').length;
    final delivered = records.where((row) => row.status == 'delivered').length;
    final failed = records.where((row) => row.status == 'failed').length;
    final pending = records.where((row) => row.status == 'pending').length;
    final date = records
        .map((row) => row.sentAt ?? row.createdAt ?? DateTime(1970))
        .reduce((left, right) => left.isAfter(right) ? left : right);
    final status = pending > 0
        ? 'pending'
        : failed == records.length
        ? 'failed'
        : 'sent';
    return Container(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0xffE5E7EB))),
      ),
      child: InkWell(
        onTap: () => _showRecipients(context),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Text(
                  Formatters.dateTime(date),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10, height: 1.15),
                ),
              ),
              Expanded(child: _number(sent)),
              Expanded(child: _number(delivered)),
              Expanded(child: _number(failed)),
              Expanded(
                flex: 2,
                child: Align(
                  alignment: Alignment.centerRight,
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: StatusChip(status: status),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _number(int value) => Text(
    '$value',
    textAlign: TextAlign.center,
    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
  );

  Future<void> _showRecipients(BuildContext context) =>
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (_) => SafeArea(
          child: FractionallySizedBox(
            heightFactor: .78,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
              itemCount: records.length,
              separatorBuilder: (_, _) => const SizedBox(height: 6),
              itemBuilder: (_, index) =>
                  DeliveryLogTile(message: records[index]),
            ),
          ),
        ),
      );
}
