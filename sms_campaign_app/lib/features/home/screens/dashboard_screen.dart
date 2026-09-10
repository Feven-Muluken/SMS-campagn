import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/services/api_service.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/providers/appointments_provider.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/providers/contacts_provider.dart';
import '../../../data/repositories/admin_repository.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/loader.dart';
import '../../reports/widgets/stat_card.dart';

/// Dashboard: admins see `/admin/stats` + recent activity; other roles see a
/// contacts/appointments summary built from their own endpoints.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, int>? _stats;
  List<Map<String, dynamic>> _recentCampaigns = const [];
  List<Map<String, dynamic>> _recentMessages = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    final usePlatformDashboard = auth.user?.accountScope == 'platform';
    setState(() {
      _loading = true;
      _error = null;
    });
    if (!auth.can('dashboard.view')) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      if (usePlatformDashboard) {
        final admin = context.read<AdminRepository>();
        final results = await Future.wait([admin.stats(), admin.recentActivity()]);
        if (!mounted) return;
        setState(() {
          _stats = results[0] as Map<String, int>;
          final activity = results[1]
              as ({List<Map<String, dynamic>> campaigns, List<Map<String, dynamic>> messages});
          _recentCampaigns = activity.campaigns;
          _recentMessages = activity.messages;
        });
      } else {
        final companyId = auth.user?.companyId;
        if (companyId != null) {
          final dashboard = await context
              .read<AdminRepository>()
              .companyDashboard(companyId);
          if (mounted) {
            setState(() {
              _stats = dashboard.stats;
              _recentCampaigns = dashboard.campaigns;
              _recentMessages = dashboard.messages;
            });
          }
        }
        final loads = <Future<void>>[];
        if (auth.can('contact.view')) {
          loads.add(context.read<ContactsProvider>().load());
        }
        if (auth.can('appointment.view')) {
          loads.add(context.read<AppointmentsProvider>().load());
        }
        await Future.wait(loads);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: _loading
              ? const Loader(message: 'Loading dashboard…')
              : _error != null
                  ? ErrorView(message: _error!, onRetry: _load)
                  : !auth.can('dashboard.view')
                      ? ListView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(24),
                          children: const [
                            SizedBox(height: 80),
                            Icon(Icons.lock_outline, size: 52, color: Colors.grey),
                            SizedBox(height: 16),
                            Text('Dashboard access is not enabled for this company account.',
                                textAlign: TextAlign.center),
                          ],
                        )
                      : auth.user?.accountScope == 'platform'
                      ? _adminBody()
                      : _memberBody(),
        ),
      ),
    );
  }

  Widget _adminBody() {
    final auth = context.watch<AuthProvider>();
    final stats = _stats ?? const <String, int>{};
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        LayoutBuilder(builder: (context, constraints) {
          final columns = constraints.maxWidth >= 1100
              ? 5
              : 2;
          final width =
              (constraints.maxWidth - (12 * (columns - 1))) / columns;
          return Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              if (auth.can('user.manage')) StatCard(width: width, label: 'Total Users', value: '${stats['users'] ?? 0}', icon: Icons.people_outline),
              if (auth.can('contact.view')) StatCard(width: width, label: 'Total Contacts', value: '${stats['contacts'] ?? 0}', icon: Icons.contacts_outlined),
              if (auth.can('campaign.view')) StatCard(width: width, label: 'Campaigns', value: '${stats['campaigns'] ?? 0}', icon: Icons.campaign_outlined),
              if (auth.can('delivery.view')) StatCard(width: width, label: 'Messages', value: '${stats['messages'] ?? 0}', icon: Icons.sms_outlined),
              if (auth.can('group.view')) StatCard(width: width, label: 'Groups', value: '${stats['groups'] ?? 0}', icon: Icons.groups_outlined),
            ],
          );
        }),
        if (auth.can('campaign.view')) ...[
        const SizedBox(height: 24),
        const Text('Recent campaigns',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (_recentCampaigns.isEmpty)
          const Text('No campaigns yet.', style: TextStyle(color: Colors.grey)),
        for (var i = 0; i < _recentCampaigns.length && i < 5; i++)
          AnimatedEntry(
            index: i,
            child: _RecentActivityItem(
              icon: Icons.campaign_outlined,
              title: '${_recentCampaigns[i]['name'] ?? 'Campaign'}',
              status: '${_recentCampaigns[i]['status'] ?? ''}',
              details: [
                _campaignDetails(_recentCampaigns[i]),
                Formatters.date(DateTime.tryParse(
                    '${_recentCampaigns[i]['createdAt'] ?? ''}')),
              ],
            ),
          ),
        ],
        if (auth.can('delivery.view')) ...[
        const SizedBox(height: 24),
        const Text('Recent messages',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (_recentMessages.isEmpty)
          const Text('No messages yet.', style: TextStyle(color: Colors.grey)),
        for (var i = 0; i < _recentMessages.length && i < 5; i++)
          AnimatedEntry(
            index: i,
            child: _RecentActivityItem(
              icon: Icons.sms_outlined,
              title: _messageTitle(_recentMessages[i]),
              status: '${_recentMessages[i]['status'] ?? ''}',
              details: [
                'To: ${_messageRecipient(_recentMessages[i])}',
                'Message: ${_recentMessages[i]['content'] ?? ''}',
                Formatters.date(DateTime.tryParse(
                    '${_recentMessages[i]['createdAt'] ?? ''}')),
              ],
            ),
          ),
        ],
      ],
    );
  }

  String _campaignDetails(Map<String, dynamic> campaign) {
    final creator = campaign['creator'] as Map?;
    final type = '${campaign['type'] ?? 'campaign'}';
    return [
      type,
      'By: ${creator?['name'] ?? 'Unknown'}',
    ].join(' • ');
  }

  String _messageTitle(Map<String, dynamic> message) {
    final campaign = message['campaign'] as Map?;
    final group = (message['group'] ?? campaign?['group']) as Map?;
    final recipient = message['recipient'] as Map?;
    return '${campaign?['name'] ?? group?['name'] ?? recipient?['name'] ?? message['phoneNumber'] ?? 'Message'}';
  }

  String _messageRecipient(Map<String, dynamic> message) {
    final campaign = message['campaign'] as Map?;
    final group = (message['group'] ?? campaign?['group']) as Map?;
    final recipient = message['recipient'] as Map?;
    return '${recipient?['name'] ?? group?['name'] ?? message['phoneNumber'] ?? recipient?['phoneNumber'] ?? 'Unknown recipient'}';
  }

  Widget _memberBody() {
    final auth = context.watch<AuthProvider>();
    final contacts = context.watch<ContactsProvider>();
    final appointments = context.watch<AppointmentsProvider>();
    final upcoming = appointments.appointments
        .where((a) =>
            a.status != 'cancelled' &&
            (a.scheduledAt?.isAfter(DateTime.now()) ?? false))
        .length;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        LayoutBuilder(builder: (context, constraints) {
          const columns = 2;
          final width =
              (constraints.maxWidth - (12 * (columns - 1))) / columns;
          return Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              if (auth.can('contact.view'))
                StatCard(width: width, label: auth.user?.role == 'staff' ? 'Managed contacts' : 'My contacts', value: '${contacts.contacts.length}', icon: Icons.contacts_outlined),
              if (auth.can('appointment.view'))
                StatCard(width: width, label: 'Upcoming appointments', value: '$upcoming', icon: Icons.event_outlined),
              if (auth.can('campaign.view'))
                StatCard(width: width, label: 'Campaigns', value: '${_stats?['campaigns'] ?? 0}', icon: Icons.campaign_outlined),
              if (auth.can('delivery.view'))
                StatCard(width: width, label: 'Messages', value: '${_stats?['messages'] ?? 0}', icon: Icons.sms_outlined),
              if (auth.can('group.view'))
                StatCard(width: width, label: 'Groups', value: '${_stats?['groups'] ?? 0}', icon: Icons.groups_outlined),
            ],
          );
        }),
        if (auth.can('campaign.view')) ...[
          const SizedBox(height: 24),
          const Text('Recent campaigns', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          if (_recentCampaigns.isEmpty) const Text('No campaigns yet.', style: TextStyle(color: Colors.grey)),
          for (var i = 0; i < _recentCampaigns.length && i < 5; i++)
            AnimatedEntry(index: i, child: _RecentActivityItem(
              icon: Icons.campaign_outlined,
              title: '${_recentCampaigns[i]['name'] ?? 'Campaign'}',
              status: '${_recentCampaigns[i]['status'] ?? ''}',
              details: [_campaignDetails(_recentCampaigns[i]), Formatters.date(DateTime.tryParse('${_recentCampaigns[i]['createdAt'] ?? ''}'))],
            )),
        ],
        if (auth.can('delivery.view')) ...[
          const SizedBox(height: 24),
          const Text('Recent messages', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          if (_recentMessages.isEmpty) const Text('No messages yet.', style: TextStyle(color: Colors.grey)),
          for (var i = 0; i < _recentMessages.length && i < 5; i++)
            AnimatedEntry(index: i, child: _RecentActivityItem(
              icon: Icons.sms_outlined,
              title: _messageTitle(_recentMessages[i]),
              status: '${_recentMessages[i]['status'] ?? ''}',
              details: ['To: ${_messageRecipient(_recentMessages[i])}', 'Message: ${_recentMessages[i]['content'] ?? ''}', Formatters.date(DateTime.tryParse('${_recentMessages[i]['createdAt'] ?? ''}'))],
            )),
        ],
        if (auth.can('appointment.view')) ...[
        const SizedBox(height: 24),
        const Text('Next appointments',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (appointments.appointments.isEmpty)
          const Text('No appointments scheduled.',
              style: TextStyle(color: Colors.grey)),
        for (var i = 0; i < appointments.appointments.length && i < 5; i++)
          AnimatedEntry(
            index: i,
            child: Card(
              child: ListTile(
                leading: const Icon(Icons.event_outlined),
                title: Text(appointments.appointments[i].businessName),
                subtitle: Text(
                    Formatters.dateTime(appointments.appointments[i].scheduledAt)),
                trailing: Text(appointments.appointments[i].status),
              ),
            ),
          ),
        ],
      ],
    );
  }

}

class _RecentActivityItem extends StatelessWidget {
  const _RecentActivityItem({
    required this.icon,
    required this.title,
    required this.status,
    required this.details,
  });

  final IconData icon;
  final String title;
  final String status;
  final List<String> details;

  @override
  Widget build(BuildContext context) {
    final visibleDetails = details.where((text) => text.trim().isNotEmpty);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              if (status.trim().isNotEmpty) ...[
                const SizedBox(width: 8),
                _ActivityStatus(status: status),
              ],
            ],
          ),
          const SizedBox(height: 5),
          Padding(
            padding: const EdgeInsets.only(left: 30),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final detail in visibleDetails)
                  Text(
                    detail,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xff989EA9),
                      fontSize: 12,
                      height: 1.45,
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 20),
        ],
      ),
    );
  }
}

class _ActivityStatus extends StatelessWidget {
  const _ActivityStatus({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (status.toLowerCase()) {
      'sent' || 'delivered' || 'completed' || 'active' =>
        (const Color(0xffDCFCE7), const Color(0xff15803D)),
      'failed' || 'cancelled' || 'rejected' =>
        (const Color(0xffFEE2E2), const Color(0xffDC2626)),
      'pending' || 'queued' || 'processing' || 'draft' =>
        (const Color(0xffFEF3C7), const Color(0xffB45309)),
      _ => (const Color(0xffF3F4F6), const Color(0xff6B7280)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
