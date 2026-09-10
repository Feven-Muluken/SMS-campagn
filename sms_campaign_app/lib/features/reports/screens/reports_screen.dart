import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/utils/formatters.dart';
import '../../../data/models/message.dart';
import '../../../data/providers/reports_provider.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/status_filter_chip.dart';
import '../widgets/stat_card.dart';
import '../widgets/status_chip.dart';
import '../widgets/delivery_log_tile.dart';

/// Delivery reporting: summary counts, status filter chips, phone search and
/// the delivery log.
class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ReportsProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ReportsProvider>();
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: provider.load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: [
            LayoutBuilder(builder: (context, constraints) {
              final columns = constraints.maxWidth >= 960
                  ? 4
                  : 2;
              final width =
                  (constraints.maxWidth - (12 * (columns - 1))) / columns;
              final counts = provider.counts;
              return Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  StatCard(width: width, label: 'Total', value: '${counts['all'] ?? 0}', icon: Icons.sms_outlined),
                  StatCard(width: width, label: 'Delivered', value: '${counts['delivered'] ?? 0}', icon: Icons.mark_email_read_outlined),
                  StatCard(width: width, label: 'Failed', value: '${counts['failed'] ?? 0}', icon: Icons.error_outline),
                  StatCard(width: width, label: 'Pending', value: '${counts['pending'] ?? 0}', icon: Icons.schedule_outlined),
                ],
              );
            }),
            const SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final status in ReportsProvider.statuses)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: StatusFilterChip(
                        label: '${Formatters.statusLabel(status)} '
                            '(${provider.counts[status] ?? 0})',
                        selected: provider.filter == status,
                        onSelected: (_) => provider.setFilter(status),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(
                hintText: 'Search by phone number',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
              keyboardType: TextInputType.phone,
              onChanged: provider.setSearch,
            ),
            const SizedBox(height: 12),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: provider.loading
                  ? const Padding(
                      padding: EdgeInsets.only(top: 60), child: Loader())
                  : provider.error != null
                      ? ErrorView(
                          message: provider.error!, onRetry: provider.load)
                      : provider.messages.isEmpty
                          ? const Padding(
                              padding: EdgeInsets.only(top: 40),
                              child: EmptyState(
                                icon: Icons.query_stats_outlined,
                                title: 'No messages match',
                                subtitle:
                                    'Try another status filter or search.',
                              ),
                            )
                          : Column(
                              children: [
                                for (var i = 0;
                                    i < provider.messages.length;
                                    i++)
                                  AnimatedEntry(
                                    index: i,
                                    child: Padding(
                                      padding:
                                          const EdgeInsets.only(bottom: 8),
                                      child: DeliveryLogTile(
                                          message: provider.messages[i]),
                                    ),
                                  ),
                              ],
                            ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shared delivery-log row: phone, content, status, campaign, sentAt.
// TODO: Remove after the redesigned delivery row has completed visual QA.
// ignore: unused_element
class _LegacyDeliveryLogTile extends StatelessWidget {
  const _LegacyDeliveryLogTile({required this.message});

  final Message message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(Formatters.phone(message.phoneNumber),
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                StatusChip(status: message.status),
              ],
            ),
            const SizedBox(height: 6),
            Text(message.content,
                maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 6),
            Text(
              '${message.campaignName ?? 'Direct message'} · '
              '${Formatters.dateTime(message.sentAt)}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
