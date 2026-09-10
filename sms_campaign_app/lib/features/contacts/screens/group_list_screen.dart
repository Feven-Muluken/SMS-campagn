import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../data/providers/contacts_provider.dart';
import '../../../data/models/group.dart';
import '../../../data/models/contact.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/providers/groups_provider.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/entity_detail_sheet.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';
import '../widgets/group_card.dart';

/// Groups list (embedded as a tab inside the contacts screen).
class GroupListScreen extends StatefulWidget {
  const GroupListScreen({super.key});

  @override
  State<GroupListScreen> createState() => _GroupListScreenState();
}

class _GroupListScreenState extends State<GroupListScreen> {
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GroupsProvider>().load();
      context.read<ContactsProvider>().load();
    });
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _confirmDelete(String id, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete group?'),
        content: Text('"$name" will be permanently removed.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final error = await context.read<GroupsProvider>().remove(id);
    if (!mounted) return;
    if (error != null) {
      Notice.error(context, error);
    } else {
      Notice.success(context, 'Group deleted');
    }
  }

  Future<void> _openCreate() {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => const _GroupFormSheet(),
    );
  }

  Future<void> _openEdit(Group group) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _GroupFormSheet(group: group),
  );

  Future<void> _openSend(Group group) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _SendGroupSheet(group: group),
  );

  Future<void> _openDetails(Group group, bool canSend) {
    final contacts = context.read<ContactsProvider>();
    final members = group.members
        .map(contacts.byId)
        .whereType<Contact>()
        .map((contact) => '${contact.name}\n${contact.phoneNumber}')
        .join('\n\n');
    return showEntityDetailSheet(
      context,
      title: group.name,
      icon: Icons.groups_outlined,
      details: [
        DetailItem(
          Icons.person_outline,
          'Created by',
          group.ownerName?.trim().isNotEmpty == true
              ? group.ownerName!
              : 'Unknown',
        ),
        DetailItem(
          Icons.email_outlined,
          'Creator email',
          group.ownerEmail ?? '',
        ),
        DetailItem(Icons.people_outline, 'Members', '${group.memberCount}'),
        DetailItem(
          Icons.calendar_today_outlined,
          'Created',
          Formatters.dateTime(group.createdAt),
        ),
        DetailItem(
          Icons.update_outlined,
          'Updated',
          Formatters.dateTime(group.updatedAt),
        ),
      ],
      bodyLabel: 'Members',
      body: members.isEmpty ? 'No members in this group.' : members,
      actions: canSend
          ? [
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _openSend(group);
                  },
                  icon: const Icon(Icons.send_outlined, size: 18),
                  label: const Text('Send SMS'),
                ),
              ),
            ]
          : const [],
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GroupsProvider>();
    final auth = context.watch<AuthProvider>();
    final canCreate = auth.can('group.create');
    final canManage = auth.can('group.manage');
    final canSend = auth.can('group.send');
    final query = _search.text.trim().toLowerCase();
    final groups = query.isEmpty
        ? provider.groups
        : provider.groups.where((group) {
            return <String>[
              group.name,
              group.ownerName ?? '',
              group.ownerEmail ?? '',
              '${group.memberCount}',
            ].any((value) => value.toLowerCase().contains(query));
          }).toList();
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              heroTag: 'groupsFab',
              onPressed: _openCreate,
              icon: const Icon(Icons.group_add_outlined),
              label: const Text('New group'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: provider.load,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: provider.loading
              ? const Loader()
              : provider.error != null
              ? ErrorView(message: provider.error!, onRetry: provider.load)
              : provider.groups.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 100),
                    EmptyState(
                      icon: Icons.groups_outlined,
                      title: 'No groups yet',
                      subtitle:
                          'Create a group to message many contacts at once.',
                    ),
                  ],
                )
              : ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                  itemCount: groups.length + 1,
                  itemBuilder: (context, i) {
                    if (i == 0) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            TextField(
                              controller: _search,
                              onChanged: (_) => setState(() {}),
                              decoration: InputDecoration(
                                hintText: 'Search groups',
                                prefixIcon: const Icon(Icons.search),
                                suffixIcon: query.isEmpty
                                    ? null
                                    : IconButton(
                                        tooltip: 'Clear search',
                                        onPressed: () {
                                          _search.clear();
                                          setState(() {});
                                        },
                                        icon: const Icon(Icons.close),
                                      ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              '${groups.length} ${groups.length == 1 ? 'group' : 'groups'}',
                              style: const TextStyle(
                                color: Color(0xff989EA9),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      );
                    }
                    if (groups.isEmpty) {
                      return const EmptyState(
                        icon: Icons.search_off_outlined,
                        title: 'No groups found',
                        subtitle: 'Try a different search term.',
                      );
                    }
                    final group = groups[i - 1];
                    return AnimatedEntry(
                      index: i - 1,
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: GroupCard(
                          group: group,
                          onTap: () => _openDetails(group, canSend),
                          onSend: canSend ? () => _openSend(group) : null,
                          onEdit: canManage ? () => _openEdit(group) : null,
                          onDelete: canManage
                              ? () => _confirmDelete(group.id, group.name)
                              : null,
                        ),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

class _GroupFormSheet extends StatefulWidget {
  const _GroupFormSheet({this.group});
  final Group? group;

  @override
  State<_GroupFormSheet> createState() => _GroupFormSheetState();
}

class _GroupFormSheetState extends State<_GroupFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final Set<String> _members = <String>{};
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _name.text = widget.group?.name ?? '';
    _members.addAll(widget.group?.members ?? const []);
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    final groups = context.read<GroupsProvider>();
    final error = widget.group == null
        ? await groups.create(_name.text.trim(), _members.toList())
        : await groups.update(
            widget.group!.id,
            _name.text.trim(),
            _members.toList(),
          );
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      Notice.error(context, error);
    } else {
      Navigator.of(context).pop();
      Notice.success(
        context,
        widget.group == null ? 'Group created' : 'Group updated',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final contacts = context.watch<ContactsProvider>().contacts;
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 4,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.group == null ? 'New group' : 'Edit group',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Group name',
                controller: _name,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                prefixIcon: Icons.groups_outlined,
              ),
              const SizedBox(height: 16),
              Text(
                'Members (${_members.length} selected)',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              Container(
                constraints: const BoxConstraints(maxHeight: 240),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border.all(color: const Color(0xffE5E7EB)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: contacts.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.all(24),
                        child: Text('No contacts available.'),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        itemCount: contacts.length,
                        itemBuilder: (context, i) {
                          final contact = contacts[i];
                          return CheckboxListTile(
                            dense: true,
                            value: _members.contains(contact.id),
                            onChanged: (_) => setState(() {
                              if (!_members.remove(contact.id)) {
                                _members.add(contact.id);
                              }
                            }),
                            title: Text(contact.name),
                            subtitle: Text(contact.phoneNumber),
                          );
                        },
                      ),
              ),
              const SizedBox(height: 20),
              PrimaryButton(
                label: widget.group == null ? 'Create group' : 'Save changes',
                icon: Icons.check,
                loading: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SendGroupSheet extends StatefulWidget {
  const _SendGroupSheet({required this.group});
  final Group group;
  @override
  State<_SendGroupSheet> createState() => _SendGroupSheetState();
}

class _SendGroupSheetState extends State<_SendGroupSheet> {
  final _formKey = GlobalKey<FormState>();
  final _message = TextEditingController();
  final _sender = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _message.dispose();
    _sender.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      final result = await context.read<GroupsProvider>().sendToGroup(
        widget.group.id,
        _message.text.trim(),
        senderId: _sender.text.trim(),
      );
      if (!mounted) return;
      Notice.smsResult(context, result);
      if (result.successCount > 0) Navigator.pop(context);
    } catch (e) {
      if (mounted) Notice.error(context, '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      4,
      20,
      MediaQuery.of(context).viewInsets.bottom + 24,
    ),
    child: SingleChildScrollView(
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Message ${widget.group.name}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.group.memberCount} recipients. This appears as one group send with per-recipient delivery results.',
            ),
            const SizedBox(height: 16),
            AppTextField(
              label: 'Message',
              controller: _message,
              maxLines: 4,
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Message is required' : null,
            ),
            const SizedBox(height: 12),
            AppTextField(
              label: 'Sender ID (optional)',
              controller: _sender,
              hint: 'e.g. AFROEL',
            ),
            const SizedBox(height: 18),
            PrimaryButton(
              label: 'Send to group',
              icon: Icons.send_outlined,
              loading: _busy,
              onPressed: _send,
            ),
          ],
        ),
      ),
    ),
  );
}
