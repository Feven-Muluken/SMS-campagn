import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/validators.dart';
import '../../../data/models/contact.dart';
import '../../../data/models/message.dart';
import '../../../data/providers/contacts_provider.dart';
import '../../../data/providers/groups_provider.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';

/// Group detail: member list plus a send-group-SMS form.
class GroupDetailScreen extends StatefulWidget {
  const GroupDetailScreen({super.key, required this.groupId});

  final String groupId;

  @override
  State<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends State<GroupDetailScreen> {
  final _formKey = GlobalKey<FormState>();
  final _message = TextEditingController();
  final _senderId = TextEditingController();
  late Future<List<Message>> _deliveries;

  @override
  void initState() {
    super.initState();
    _deliveries = context.read<GroupsProvider>().deliveries(widget.groupId);
  }

  void _reloadDeliveries() {
    setState(() => _deliveries =
        context.read<GroupsProvider>().deliveries(widget.groupId));
  }

  @override
  void dispose() {
    _message.dispose();
    _senderId.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final provider = context.read<GroupsProvider>();
    try {
      final result = await provider.sendToGroup(
        widget.groupId,
        _message.text.trim(),
        senderId: _senderId.text.trim(),
      );
      if (!mounted) return;
      Notice.smsResult(context, result);
      _message.clear();
      _reloadDeliveries();
    } catch (e) {
      if (!mounted) return;
      Notice.error(context, '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final group = context.watch<GroupsProvider>().byId(widget.groupId);
    final contacts = context.watch<ContactsProvider>();
    if (group == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Group')),
        body: const EmptyState(
          icon: Icons.groups_outlined,
          title: 'Group not found',
          subtitle: 'It may have been deleted.',
        ),
      );
    }
    final members = group.members.map(contacts.byId).whereType<Contact>().toList();
    final sending = context.watch<GroupsProvider>().sending;
    final canSend = context.watch<AuthProvider>().can('group.send');

    return Scaffold(
      appBar: AppBar(title: Text(group.name)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('${group.memberCount} members',
                style: const TextStyle(
                    fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            if (members.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('No resolved members to show.',
                    style: TextStyle(color: AppColors.muted)),
              )
            else
              for (final member in members)
                Card(
                  child: ListTile(
                    dense: true,
                    leading: const Icon(Icons.person_outline),
                    title: Text(member.name),
                    subtitle: Text(member.phoneNumber),
                  ),
                ),
            const SizedBox(height: 24),
            const Text('Group delivery history',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            const Text(
                'Each card is one group send. Open it for every recipient result.',
                style: TextStyle(color: AppColors.muted, fontSize: 13)),
            const SizedBox(height: 8),
            FutureBuilder<List<Message>>(
              future: _deliveries,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.all(20),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                if (snapshot.hasError) {
                  return Card(child: ListTile(
                    leading: const Icon(Icons.error_outline),
                    title: const Text('Could not load delivery history'),
                    subtitle: Text('${snapshot.error}'),
                    trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: _reloadDeliveries),
                  ));
                }
                final rows = snapshot.data ?? const <Message>[];
                if (rows.isEmpty) {
                  return const Card(child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No messages have been sent to this group yet.'),
                  ));
                }
                final grouped = <String, List<Message>>{};
                for (final row in rows) {
                  final key = row.dispatchId?.isNotEmpty == true
                      ? row.dispatchId!
                      : 'legacy-${row.id}';
                  grouped.putIfAbsent(key, () => <Message>[]).add(row);
                }
                return Column(children: grouped.values.map((batch) {
                  final first = batch.first;
                  final sent = batch.where((m) => m.status.toLowerCase() == 'sent').length;
                  final failed = batch.where((m) => m.status.toLowerCase() == 'failed').length;
                  return Card(
                    elevation: 0,
                    child: ExpansionTile(
                      leading: const Icon(Icons.mark_chat_read_outlined, color: AppColors.primary),
                      title: Text(first.content, maxLines: 2, overflow: TextOverflow.ellipsis),
                      subtitle: Text(
                          '${Formatters.dateTime(first.sentAt ?? first.createdAt)} | ${batch.length} recipients | $sent sent${failed > 0 ? ' | $failed failed' : ''}'),
                      children: batch.map((message) => ListTile(
                        dense: true,
                        leading: Icon(
                          message.status.toLowerCase() == 'failed' ? Icons.error_outline : Icons.check_circle_outline,
                          color: message.status.toLowerCase() == 'failed' ? Colors.orange.shade800 : Colors.green.shade700,
                        ),
                        title: Text(message.recipientName?.isNotEmpty == true ? message.recipientName! : 'Recipient'),
                        subtitle: Text(message.phoneNumber),
                        trailing: Text(message.status.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                      )).toList(),
                    ),
                  );
                }).toList());
              },
            ),
            if (canSend) ...[
            const SizedBox(height: 24),
            const Text('Send SMS to this group',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AppTextField(
                    label: 'Message',
                    controller: _message,
                    validator: (v) => Validators.required(v, 'Message'),
                    maxLines: 4,
                  ),
                  const SizedBox(height: 12),
                  AppTextField(
                    label: 'Sender ID (optional)',
                    controller: _senderId,
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? null
                        : Validators.senderId(v),
                    hint: 'e.g. AFROEL',
                  ),
                  const SizedBox(height: 16),
                  PrimaryButton(
                    label: 'Send to group',
                    icon: Icons.send_outlined,
                    loading: sending,
                    onPressed: _send,
                  ),
                ],
              ),
            ),
            ],
          ],
        ),
      ),
    );
  }
}
