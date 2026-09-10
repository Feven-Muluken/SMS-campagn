import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

class DetailItem {
  const DetailItem(this.icon, this.label, this.value, {this.trailing});

  final IconData icon;
  final String label;
  final String value;
  final Widget? trailing;
}

Future<void> showEntityDetailSheet(
  BuildContext context, {
  required String title,
  required IconData icon,
  required List<DetailItem> details,
  Widget? status,
  String? bodyLabel,
  String? body,
  List<Widget> actions = const [],
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: Align(
        alignment: Alignment.bottomCenter,
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 620,
            maxHeight: MediaQuery.sizeOf(context).height * 0.72,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(title,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w700)),
                    ),
                    if (status != null) ...[const SizedBox(width: 8), status],
                  ],
                ),
                const SizedBox(height: 16),
                Flexible(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.only(bottom: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (body?.trim().isNotEmpty ?? false) ...[
                          if (bodyLabel != null) ...[
                            Text(bodyLabel,
                                style: const TextStyle(
                                    color: AppColors.muted,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600)),
                            const SizedBox(height: 6),
                          ],
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.gray100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: SelectableText(body!),
                          ),
                          const SizedBox(height: 8),
                        ],
                        for (final item in details)
                          if (item.value.trim().isNotEmpty)
                            _DetailRow(item: item),
                        if (actions.isNotEmpty) ...[
                          const SizedBox(height: 20),
                          for (var i = 0; i < actions.length; i++) ...[
                            actions[i],
                            if (i < actions.length - 1)
                              const SizedBox(height: 10),
                          ],
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.item});

  final DetailItem item;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(item.icon, size: 18, color: AppColors.muted),
            const SizedBox(width: 8),
            Text('${item.label}: ',
                style: const TextStyle(color: AppColors.muted)),
            Expanded(
              child: Text(item.value,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
            if (item.trailing != null) ...[
              const SizedBox(width: 8),
              item.trailing!,
            ],
          ],
        ),
      );
}
