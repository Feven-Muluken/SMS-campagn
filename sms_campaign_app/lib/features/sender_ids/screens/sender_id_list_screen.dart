import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/providers/sender_id_provider.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/notice.dart';
import '../widgets/sender_id_tile.dart';
import '../widgets/sender_id_details_card.dart';

/// Company request history or the platform administrator's approval queue.
class SenderIdListScreen extends StatefulWidget {
  const SenderIdListScreen({super.key});

  @override
  State<SenderIdListScreen> createState() => _SenderIdListScreenState();
}

class _SenderIdListScreenState extends State<SenderIdListScreen> {
  String? _reviewingId;

  bool get _isPlatformAdmin {
    final auth = context.read<AuthProvider>();
    return auth.isAdmin && auth.user?.companyId == null;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SenderIdProvider>().load(allAdmin: _isPlatformAdmin);
    });
  }

  Future<void> _review(String id, String status) async {
    setState(() => _reviewingId = id);
    final error = await context.read<SenderIdProvider>().review(
      id,
      status,
      allAdmin: _isPlatformAdmin,
    );
    if (!mounted) return;
    setState(() => _reviewingId = null);
    if (error == null) {
      Notice.success(context, 'Sender ID request $status');
    } else {
      Notice.error(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SenderIdProvider>();
    final auth = context.watch<AuthProvider>();
    final isPlatformAdmin = auth.isAdmin && auth.user?.companyId == null;
    return Scaffold(
      appBar: AppBar(
        title: Text(isPlatformAdmin ? 'Sender ID approvals' : 'Sender IDs'),
      ),
      floatingActionButton: isPlatformAdmin
          ? null
          : FloatingActionButton.extended(
              onPressed: () =>
                  Navigator.of(context).pushNamed(AppRoutes.senderIdRequest),
              icon: const Icon(Icons.add),
              label: const Text('Request'),
            ),
      body: RefreshIndicator(
        onRefresh: () => provider.load(allAdmin: isPlatformAdmin),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.softRed,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.info_outline,
                    color: AppColors.primary,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      isPlatformAdmin
                          ? 'Review sender IDs requested by companies. Approval makes the ID available only to that company.'
                          : 'Your company submits sender ID requests. They stay pending until approved by the platform administrator.',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: provider.loading
                  ? const Padding(
                      padding: EdgeInsets.only(top: 80),
                      child: Loader(),
                    )
                  : provider.error != null
                  ? ErrorView(
                      message: provider.error!,
                      onRetry: () => provider.load(allAdmin: isPlatformAdmin),
                    )
                  : provider.requests.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.only(top: 60),
                      child: EmptyState(
                        icon: Icons.badge_outlined,
                        title: 'No sender ID requests',
                        subtitle: isPlatformAdmin
                            ? 'There are no company requests waiting for review.'
                            : 'Request a sender ID to brand your messages.',
                      ),
                    )
                  : Column(
                      children: [
                        for (var i = 0; i < provider.requests.length; i++)
                          AnimatedEntry(
                            index: i,
                            child: Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: isPlatformAdmin
                                  ? Card(
                                      child: Padding(
                                        padding: const EdgeInsets.all(12),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            ListTile(
                                              contentPadding: EdgeInsets.zero,
                                              leading: const Icon(
                                                Icons.badge_outlined,
                                              ),
                                              title: Text(
                                                provider.requests[i].senderId,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                              subtitle: const Text(
                                                'Review request details below',
                                              ),
                                            ),
                                            SenderIdDetailsCard(
                                              request: provider.requests[i],
                                            ),
                                            const SizedBox(height: 10),
                                            if (provider.requests[i].status ==
                                                'pending')
                                              Row(
                                                children: [
                                                  Expanded(
                                                    child: OutlinedButton(
                                                      onPressed:
                                                          _reviewingId == null
                                                          ? () => _review(
                                                              provider
                                                                  .requests[i]
                                                                  .id,
                                                              'rejected',
                                                            )
                                                          : null,
                                                      child: const Text(
                                                        'Reject',
                                                      ),
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Expanded(
                                                    child: FilledButton.icon(
                                                      onPressed:
                                                          _reviewingId == null
                                                          ? () => _review(
                                                              provider
                                                                  .requests[i]
                                                                  .id,
                                                              'approved',
                                                            )
                                                          : null,
                                                      icon:
                                                          _reviewingId ==
                                                              provider
                                                                  .requests[i]
                                                                  .id
                                                          ? const SizedBox.square(
                                                              dimension: 16,
                                                              child:
                                                                  CircularProgressIndicator(
                                                                    strokeWidth:
                                                                        2,
                                                                  ),
                                                            )
                                                          : const Icon(
                                                              Icons.check,
                                                              size: 18,
                                                            ),
                                                      label: const Text(
                                                        'Approve',
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                          ],
                                        ),
                                      ),
                                    )
                                  : SenderIdTile(
                                      request: provider.requests[i],
                                      onDelete: () => provider.remove(
                                        provider.requests[i].senderId,
                                      ),
                                    ),
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
