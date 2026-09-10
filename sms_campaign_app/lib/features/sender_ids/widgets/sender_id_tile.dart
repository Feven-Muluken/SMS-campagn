import 'package:flutter/material.dart';

import '../../../core/utils/formatters.dart';
import '../../../data/models/sender_id.dart';
import '../../reports/widgets/status_chip.dart';

/// Row for a locally-tracked sender ID request.
class SenderIdTile extends StatelessWidget {
  const SenderIdTile({super.key, required this.request, this.onDelete});

  final SenderId request;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.badge_outlined),
        title: Text(request.senderId,
            style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('Requested ${Formatters.dateTime(request.requestedAt)}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            StatusChip(status: request.status),
            if (onDelete != null)
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 20),
                onPressed: onDelete,
              ),
          ],
        ),
      ),
    );
  }
}
