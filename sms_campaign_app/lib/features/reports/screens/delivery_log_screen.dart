import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/utils/formatters.dart';
import '../../../data/providers/reports_provider.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/status_filter_chip.dart';
import '../widgets/delivery_log_tile.dart';

/// Full delivery log with status filter and phone search.
class DeliveryLogScreen extends StatefulWidget {
  const DeliveryLogScreen({super.key});

  @override
  State<DeliveryLogScreen> createState() => _DeliveryLogScreenState();
}

class _DeliveryLogScreenState extends State<DeliveryLogScreen> {
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ReportsProvider>().load();
    });
    _refreshTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (mounted) context.read<ReportsProvider>().refreshSilently();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ReportsProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Delivery log')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search by phone number',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
              keyboardType: TextInputType.phone,
              onChanged: provider.setSearch,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final status in ReportsProvider.statuses)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: StatusFilterChip(
                        label:
                            '${Formatters.statusLabel(status)} '
                            '(${provider.counts[status] ?? 0})',
                        selected: provider.filter == status,
                        onSelected: (_) => provider.setFilter(status),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: provider.load,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                child: provider.loading
                    ? const Loader()
                    : provider.error != null
                    ? ErrorView(
                        message: provider.error!,
                        onRetry: provider.load,
                      )
                    : provider.messages.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [
                          SizedBox(height: 100),
                          EmptyState(
                            icon: Icons.receipt_long_outlined,
                            title: 'No log entries',
                          ),
                        ],
                      )
                    : ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(16),
                        itemCount: provider.messages.length,
                        itemBuilder: (context, i) => AnimatedEntry(
                          index: i,
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: DeliveryLogTile(
                              message: provider.messages[i],
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
