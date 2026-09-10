import 'package:flutter/material.dart';

import '../../../core/utils/formatters.dart';
import '../../../data/models/contact.dart';

/// Row widget for a contact with edit/delete actions.
class ContactTile extends StatelessWidget {
  const ContactTile({
    super.key,
    required this.contact,
    this.onTap,
    this.onEdit,
    this.onDelete,
  });

  final Contact contact;
  final VoidCallback? onTap;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: CircleAvatar(
          backgroundColor: const Color(0xffFEE2E2),
          foregroundColor: const Color(0xffDF0A0A),
          child: Text(contact.name.isEmpty
              ? '?'
              : contact.name.characters.first.toUpperCase()),
        ),
        title: Text(
          contact.name.isEmpty ? 'Unnamed' : contact.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.phone_outlined,
                    size: 14, color: Color(0xff989EA9)),
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    Formatters.phone(contact.phoneNumber),
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xff989EA9)),
                  ),
                ),
              ],
            ),
            Text(
              '${contact.groupNames.isEmpty ? '' : '${contact.groupNames.first} · '}Created ${Formatters.date(contact.createdAt)}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: Color(0xff989EA9)),
            ),
          ],
        ),
        isThreeLine: true,
        trailing: onEdit == null && onDelete == null
            ? null
            : PopupMenuButton<String>(
                tooltip: 'Contact actions',
                onSelected: (value) {
                  if (value == 'edit') onEdit?.call();
                  if (value == 'delete') onDelete?.call();
                },
                itemBuilder: (_) => [
                  if (onEdit != null)
                    const PopupMenuItem(value: 'edit', child: Text('Edit')),
                  if (onDelete != null)
                    const PopupMenuItem(value: 'delete', child: Text('Delete')),
                ],
              ),
      ),
    );
  }
}
