import 'package:flutter/material.dart';

import '../../../data/models/sender_id.dart';
import 'sender_id_details_card.dart';

/// Row for a locally-tracked sender ID request.
class SenderIdTile extends StatelessWidget {
  const SenderIdTile({super.key, required this.request, this.onDelete});

  final SenderId request;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Card(
          child: ListTile(
            leading: const Icon(Icons.badge_outlined),
            title: Text(request.senderId,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: const Text('View request details below'),
            trailing: onDelete == null
                ? null
                : IconButton(
                    tooltip: 'Delete sender ID',
                    icon: const Icon(Icons.delete_outline, size: 20),
                    onPressed: onDelete,
                  ),
          ),
        ),
        SenderIdDetailsCard(request: request),
      ],
    );
  }
}
