import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/models/sender_id.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/providers/sender_id_provider.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/notice.dart';
import '../../sender_ids/widgets/sender_id_tile.dart';

/// Mobile profile based on the desktop My Profile page.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String? _reviewingId;

  bool _isPlatformAdmin(AuthProvider auth) =>
      auth.isAdmin && auth.user?.companyId == null;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSenderIds());
  }

  Future<void> _loadSenderIds() {
    final auth = context.read<AuthProvider>();
    return context.read<SenderIdProvider>().load(
      allAdmin: _isPlatformAdmin(auth),
    );
  }

  Future<void> _review(SenderId request, String status) async {
    setState(() => _reviewingId = request.id);
    final error = await context.read<SenderIdProvider>().review(
      request.id,
      status,
      allAdmin: true,
    );
    if (!mounted) return;
    setState(() => _reviewingId = null);
    if (error == null) {
      Notice.success(context, 'Sender ID request $status');
    } else {
      Notice.error(context, error);
    }
  }

  Future<void> _remove(SenderId request) async {
    try {
      await context.read<SenderIdProvider>().remove(request.senderId);
      if (mounted) Notice.success(context, 'Sender ID removed');
    } catch (error) {
      if (mounted) Notice.error(context, error.toString());
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Log out?'),
        content: const Text('Your session will be cleared on this device.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Log out'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await context.read<AuthProvider>().logout();
    if (!mounted) return;
    Navigator.of(
      context,
    ).pushNamedAndRemoveUntil(AppRoutes.login, (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final senderIds = context.watch<SenderIdProvider>();
    final user = auth.user;
    final platformAdmin = _isPlatformAdmin(auth);
    final effectiveRole = platformAdmin
        ? 'Platform admin'
        : user?.role == 'admin'
        ? 'Company admin'
        : user?.role ?? 'Viewer';

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _loadSenderIds,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 30,
                          backgroundColor: AppColors.softRed,
                          child: Text(
                            (user?.name.isNotEmpty ?? false)
                                ? user!.name.characters.first.toUpperCase()
                                : '?',
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w800,
                              fontSize: 22,
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.name ?? 'User',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                user?.email ?? 'No email',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onSurfaceVariant,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.softRed,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  effectiveRole,
                                  style: const TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 30),
                    _ProfileRow(
                      icon: Icons.phone_outlined,
                      label: 'Phone',
                      value: user?.phoneNumber ?? '—',
                    ),
                    if (!platformAdmin) ...[
                      const Divider(height: 24),
                      _ProfileRow(
                        icon: Icons.business_outlined,
                        label: 'Company',
                        value: user?.companyName ?? 'No active company',
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (!platformAdmin) ...[
              const SizedBox(height: 16),
              _PermissionsCard(permissions: user?.permissions ?? const []),
            ],
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: Text(
                    platformAdmin
                        ? 'Pending Sender ID Requests'
                        : 'Company Sender IDs',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (!platformAdmin && user?.companyId != null)
                  FilledButton.icon(
                    onPressed: () async {
                      await Navigator.of(
                        context,
                      ).pushNamed(AppRoutes.senderIdRequest);
                      if (mounted) await _loadSenderIds();
                    },
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Request'),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            if (senderIds.loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Loader(),
              )
            else if (senderIds.error != null)
              ErrorView(message: senderIds.error!, onRetry: _loadSenderIds)
            else if (platformAdmin) ...[
              _PendingReviewList(
                requests: senderIds.requests
                    .where((item) => item.status == 'pending')
                    .toList(),
                reviewingId: _reviewingId,
                onReview: _review,
              ),
              const SizedBox(height: 14),
              _StatusSection(
                title: 'Approved',
                requests: senderIds.requests
                    .where((item) => item.status == 'approved')
                    .toList(),
              ),
              _StatusSection(
                title: 'Rejected',
                requests: senderIds.requests
                    .where((item) => item.status == 'rejected')
                    .toList(),
              ),
            ] else ...[
              _StatusSection(
                title: 'Pending',
                requests: senderIds.requests
                    .where((item) => item.status == 'pending')
                    .toList(),
                onRemove: _remove,
              ),
              _StatusSection(
                title: 'Approved',
                requests: senderIds.requests
                    .where((item) => item.status == 'approved')
                    .toList(),
                onRemove: _remove,
              ),
              _StatusSection(
                title: 'Rejected',
                requests: senderIds.requests
                    .where((item) => item.status == 'rejected')
                    .toList(),
              ),
            ],
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout),
              label: const Text('Log out'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(icon, size: 20, color: AppColors.primary),
      const SizedBox(width: 12),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: AppColors.muted),
            ),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    ],
  );
}

class _PermissionsCard extends StatelessWidget {
  const _PermissionsCard({required this.permissions});

  final List<String> permissions;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Company Permissions',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          if (permissions.isEmpty)
            const Text(
              'No company permissions assigned.',
              style: TextStyle(color: AppColors.muted),
            )
          else
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: permissions
                  .map(
                    (permission) => Chip(
                      visualDensity: VisualDensity.compact,
                      label: Text(permission.replaceAll('.', ' ')),
                    ),
                  )
                  .toList(),
            ),
        ],
      ),
    ),
  );
}

class _StatusSection extends StatelessWidget {
  const _StatusSection({
    required this.title,
    required this.requests,
    this.onRemove,
  });

  final String title;
  final List<SenderId> requests;
  final Future<void> Function(SenderId request)? onRemove;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$title (${requests.length})',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        if (requests.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Text(
                'No ${title.toLowerCase()} sender IDs.',
                style: const TextStyle(color: AppColors.muted),
              ),
            ),
          )
        else
          for (final request in requests)
            SenderIdTile(
              request: request,
              onDelete: onRemove == null ? null : () => onRemove!(request),
            ),
      ],
    ),
  );
}

class _PendingReviewList extends StatelessWidget {
  const _PendingReviewList({
    required this.requests,
    required this.reviewingId,
    required this.onReview,
  });

  final List<SenderId> requests;
  final String? reviewingId;
  final Future<void> Function(SenderId request, String status) onReview;

  @override
  Widget build(BuildContext context) {
    if (requests.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('No company sender ID requests are waiting for review.'),
        ),
      );
    }
    return Column(
      children: [
        for (final request in requests)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    request.senderId,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(request.companyName ?? 'Unknown company'),
                  Text(
                    'Requested by ${request.requesterName ?? 'Unknown user'}',
                    style: const TextStyle(color: AppColors.muted),
                  ),
                  if (request.reason?.isNotEmpty == true) ...[
                    const SizedBox(height: 6),
                    Text('Reason: ${request.reason}'),
                  ],
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: reviewingId == null
                              ? () => onReview(request, 'rejected')
                              : null,
                          child: const Text('Reject'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: reviewingId == null
                              ? () => onReview(request, 'approved')
                              : null,
                          icon: reviewingId == request.id
                              ? const SizedBox.square(
                                  dimension: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.check, size: 18),
                          label: const Text('Approve'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
