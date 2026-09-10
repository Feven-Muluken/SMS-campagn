import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/models/group.dart';
import '../../../widgets/interactive_card.dart';

/// Card for a group with member count and delete action.
class GroupCard extends StatelessWidget {
  const GroupCard({super.key, required this.group, this.onTap, this.onEdit, this.onSend, this.onDelete});

  final Group group;
  final VoidCallback? onTap;
  final VoidCallback? onEdit;
  final VoidCallback? onSend;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return InteractiveCard(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppColors.softRed,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.groups_outlined,
                      size: 21, color: AppColors.primary),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    group.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w700),
                  ),
                ),
                PopupMenuButton<String>(
                  tooltip: 'Group actions',
                  onSelected: (value) {
                    if (value == 'send') onSend?.call();
                    if (value == 'edit') onEdit?.call();
                    if (value == 'delete') onDelete?.call();
                  },
                  itemBuilder: (_) => [
                    if (onSend != null)
                      const PopupMenuItem(
                        value: 'send',
                        child: Row(children: [
                          Icon(Icons.send_outlined, size: 19),
                          SizedBox(width: 10),
                          Text('Send message'),
                        ]),
                      ),
                    if (onEdit != null)
                      const PopupMenuItem(
                        value: 'edit',
                        child: Row(children: [
                          Icon(Icons.edit_outlined, size: 19),
                          SizedBox(width: 10),
                          Text('Edit'),
                        ]),
                      ),
                    if (onDelete != null)
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(children: [
                          Icon(Icons.delete_outline, size: 19),
                          SizedBox(width: 10),
                          Text('Delete'),
                        ]),
                      ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 9),
            Padding(
              padding: const EdgeInsets.only(left: 48),
              child: Wrap(
                spacing: 14,
                runSpacing: 5,
                children: [
                  _GroupMeta(
                    Icons.people_outline,
                    '${group.memberCount} ${group.memberCount == 1 ? 'member' : 'members'}',
                  ),
                  if (group.ownerName?.trim().isNotEmpty == true)
                    _GroupMeta(Icons.person_outline,
                        'Owner: ${group.ownerName}'),
                  if (group.createdAt != null)
                    _GroupMeta(Icons.calendar_today_outlined,
                        'Created: ${Formatters.dateTime(group.createdAt)}'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GroupMeta extends StatelessWidget {
  const _GroupMeta(this.icon, this.text);

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xff989EA9)),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(fontSize: 12, color: Color(0xff989EA9)),
          ),
        ],
      );
}
