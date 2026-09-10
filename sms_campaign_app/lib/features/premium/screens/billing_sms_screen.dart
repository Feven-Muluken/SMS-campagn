import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/providers/contacts_provider.dart';
import '../../../data/providers/groups_provider.dart';
import '../../../data/repositories/sms_repository.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/notice.dart';

class BillingSmsScreen extends StatefulWidget {
  const BillingSmsScreen({super.key});

  @override
  State<BillingSmsScreen> createState() => _BillingSmsScreenState();
}

class _BillingSmsScreenState extends State<BillingSmsScreen> {
  final _invoice = TextEditingController(text: 'INV-001');
  final _amount = TextEditingController();
  final _senderId = TextEditingController();
  final _selected = <String>{};
  String _template = 'invoice_due';
  bool _groupMode = false;
  String? _groupId;
  DateTime? _dueDate;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ContactsProvider>().load();
      context.read<GroupsProvider>().load();
    });
  }

  @override
  void dispose() {
    _invoice.dispose();
    _amount.dispose();
    _senderId.dispose();
    super.dispose();
  }

  String get _date => _dueDate == null
      ? 'the due date'
      : '${_dueDate!.year}-${_dueDate!.month.toString().padLeft(2, '0')}-${_dueDate!.day.toString().padLeft(2, '0')}';

  String get _message => switch (_template) {
        'payment_received' =>
          'Payment received for invoice ${_invoice.text.trim()}. Amount ETB ${_amount.text.trim()}. Thank you.',
        'overdue_notice' =>
          'Reminder: Invoice ${_invoice.text.trim()} has an outstanding amount ETB ${_amount.text.trim()}. Please settle by $_date.',
        _ =>
          'Invoice ${_invoice.text.trim()}: Amount ETB ${_amount.text.trim()} is due on $_date. Reply if you need support.',
      };

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
      initialDate: _dueDate ?? now,
    );
    if (date != null) setState(() => _dueDate = date);
  }

  Future<void> _send() async {
    if (_invoice.text.trim().isEmpty || _amount.text.trim().isEmpty) {
      return Notice.error(context, 'Invoice number and amount are required.');
    }
    if (_groupMode && _groupId == null) {
      return Notice.error(context, 'Select a billing group.');
    }
    if (!_groupMode && _selected.isEmpty) {
      return Notice.error(context, 'Select at least one contact.');
    }
    setState(() => _sending = true);
    try {
      final repo = context.read<SmsRepository>();
      final result = _groupMode
          ? await repo.sendGroup(_groupId!, _message,
              senderId: _senderId.text.trim())
          : await repo.sendContacts(_selected.toList(), _message,
              senderId: _senderId.text.trim());
      if (mounted) Notice.smsResult(context, result);
    } catch (error) {
      if (mounted) Notice.error(context, '$error');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final contacts = context.watch<ContactsProvider>().contacts;
    final groups = context.watch<GroupsProvider>().groups;
    return RefreshIndicator(
      onRefresh: () => Future.wait([
        context.read<ContactsProvider>().load(),
        context.read<GroupsProvider>().load(),
      ]),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
        children: [
          const Text('Billing alert details',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _template,
            decoration: const InputDecoration(labelText: 'Billing message type'),
            items: const [
              DropdownMenuItem(value: 'invoice_due', child: Text('Invoice due')),
              DropdownMenuItem(
                  value: 'payment_received', child: Text('Payment received')),
              DropdownMenuItem(
                  value: 'overdue_notice', child: Text('Overdue notice')),
            ],
            onChanged: (value) => setState(() => _template = value!),
          ),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
              child: AppTextField(
                label: 'Invoice number',
                controller: _invoice,
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: AppTextField(
                label: 'Amount (ETB)',
                controller: _amount,
                keyboardType: TextInputType.number,
                onChanged: (_) => setState(() {}),
              ),
            ),
          ]),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.event_outlined),
            label: Text(_dueDate == null ? 'Choose due date' : _date),
          ),
          const SizedBox(height: 12),
          AppTextField(
            label: 'Sender ID (optional)',
            controller: _senderId,
            maxLength: 11,
          ),
          const SizedBox(height: 14),
          const Text('Message preview',
              style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.gray100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Text(_message),
          ),
          const SizedBox(height: 16),
          SegmentedButton<bool>(
            segments: const [
              ButtonSegment(value: false, label: Text('Contacts'),
                  icon: Icon(Icons.contacts_outlined)),
              ButtonSegment(value: true, label: Text('Group'),
                  icon: Icon(Icons.groups_outlined)),
            ],
            selected: {_groupMode},
            onSelectionChanged: (value) =>
                setState(() => _groupMode = value.first),
          ),
          const SizedBox(height: 12),
          if (_groupMode)
            DropdownButtonFormField<String>(
              initialValue: _groupId,
              decoration: const InputDecoration(labelText: 'Billing group'),
              items: [
                for (final group in groups)
                  DropdownMenuItem(
                    value: group.id,
                    child: Text('${group.name} (${group.memberCount})'),
                  ),
              ],
              onChanged: (value) => setState(() => _groupId = value),
            )
          else
            Container(
              constraints: const BoxConstraints(maxHeight: 260),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.border),
                borderRadius: BorderRadius.circular(12),
              ),
              child: contacts.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('No contacts available.'),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: contacts.length,
                      itemBuilder: (_, index) {
                        final contact = contacts[index];
                        return CheckboxListTile(
                          dense: true,
                          value: _selected.contains(contact.id),
                          title: Text(contact.name),
                          subtitle: Text(contact.phoneNumber),
                          onChanged: (checked) => setState(() => checked == true
                              ? _selected.add(contact.id)
                              : _selected.remove(contact.id)),
                        );
                      },
                    ),
            ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: _sending ? null : _send,
            icon: _sending
                ? const SizedBox.square(
                    dimension: 17,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.receipt_long_outlined),
            label: const Text('Send billing alert'),
          ),
        ],
      ),
    );
  }
}
