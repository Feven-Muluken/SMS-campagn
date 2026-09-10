import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../data/models/contact.dart';
import '../../../core/utils/formatters.dart';
import '../../../data/providers/contacts_provider.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/entity_detail_sheet.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/notice.dart';
import '../widgets/contact_tile.dart';
import 'contact_form_screen.dart';

/// Contact management. Groups have their own navigation destination.
class ContactListScreen extends StatefulWidget {
  const ContactListScreen({super.key});

  @override
  State<ContactListScreen> createState() => _ContactListScreenState();
}

class _ContactListScreenState extends State<ContactListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ContactsProvider>().load();
    });
  }

  Future<void> _confirmDelete(Contact contact) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete contact?'),
        content: Text('"${contact.name}" will be permanently removed.'),
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
    final error = await context.read<ContactsProvider>().remove(contact.id);
    if (!mounted) return;
    if (error != null) {
      Notice.error(context, error);
    } else {
      Notice.success(context, 'Contact deleted');
    }
  }

  Future<void> _openContactForm([Contact? contact]) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => ContactFormScreen(contact: contact, sheet: true),
    );
    if ((changed ?? false) && mounted) {
      await context.read<ContactsProvider>().load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final canCreate = auth.can('contact.create');
    final canManage = auth.can('contact.manage');
    return Scaffold(
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: () => _openContactForm(),
              icon: const Icon(Icons.person_add_outlined),
              label: const Text('Add contact'),
            )
          : null,
      body: _ContactsTab(
        onEdit: canManage ? _openContactForm : null,
        onDelete: canManage ? _confirmDelete : null,
      ),
    );
  }
}

class _ContactsTab extends StatelessWidget {
  const _ContactsTab({required this.onEdit, required this.onDelete});

  final ValueChanged<Contact>? onEdit;
  final ValueChanged<Contact>? onDelete;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ContactsProvider>();
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            decoration: const InputDecoration(
              hintText: 'Search contacts',
              prefixIcon: Icon(Icons.search, size: 20),
            ),
            onChanged: provider.setSearch,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(18, 0, 18, 10),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              '${provider.contacts.length} ${provider.contacts.length == 1 ? 'contact' : 'contacts'}',
              style: const TextStyle(
                color: Color(0xff989EA9),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: provider.load,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: provider.loading
                  ? const Loader()
                  : provider.error != null
                  ? ErrorView(message: provider.error!, onRetry: provider.load)
                  : provider.contacts.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: const [
                        SizedBox(height: 100),
                        EmptyState(
                          icon: Icons.contacts_outlined,
                          title: 'No contacts found',
                          subtitle: 'Add a contact to get started.',
                        ),
                      ],
                    )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                      itemCount: provider.contacts.length,
                      itemBuilder: (context, i) => AnimatedEntry(
                        index: i,
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: ContactTile(
                            contact: provider.contacts[i],
                            onTap: () {
                              final contact = provider.contacts[i];
                              showEntityDetailSheet(
                                context,
                                title: contact.name.isEmpty
                                    ? 'Unnamed contact'
                                    : contact.name,
                                icon: Icons.person_outline,
                                details: [
                                  DetailItem(
                                    Icons.phone_outlined,
                                    'Phone',
                                    contact.phoneNumber,
                                  ),
                                  DetailItem(
                                    Icons.groups_outlined,
                                    'Group',
                                    contact.groupNames.join(', '),
                                  ),
                                  DetailItem(
                                    Icons.place_outlined,
                                    'Location',
                                    contact.locationName ?? '',
                                  ),
                                  DetailItem(
                                    Icons.map_outlined,
                                    'Coordinates',
                                    contact.latitude != null &&
                                            contact.longitude != null
                                        ? '${contact.latitude}, ${contact.longitude}'
                                        : '',
                                  ),
                                  DetailItem(
                                    Icons.person_add_alt_outlined,
                                    'Created by',
                                    contact.creatorName?.trim().isNotEmpty ==
                                            true
                                        ? contact.creatorName!
                                        : 'Unavailable for older records',
                                  ),
                                  DetailItem(
                                    Icons.calendar_today_outlined,
                                    'Created',
                                    Formatters.dateTime(contact.createdAt),
                                  ),
                                  DetailItem(
                                    Icons.update_outlined,
                                    'Updated',
                                    Formatters.dateTime(contact.updatedAt),
                                  ),
                                ],
                              );
                            },
                            onEdit: onEdit == null
                                ? null
                                : () => onEdit!(provider.contacts[i]),
                            onDelete: onDelete == null
                                ? null
                                : () => onDelete!(provider.contacts[i]),
                          ),
                        ),
                      ),
                    ),
            ),
          ),
        ),
      ],
    );
  }
}
