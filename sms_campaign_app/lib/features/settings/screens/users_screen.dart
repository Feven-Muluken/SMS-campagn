import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/services/api_service.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/validators.dart';
import '../../../data/models/user.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/repositories/admin_repository.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/entity_detail_sheet.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';

const _userPermissionOptions = <String>[
  'dashboard.view', 'campaign.view', 'campaign.create', 'campaign.manage',
  'campaign.schedule', 'campaign.send', 'contact.view', 'contact.create',
  'contact.manage', 'contact.send', 'group.view', 'group.create',
  'group.manage', 'group.send', 'user.manage', 'sms.send', 'delivery.view',
  'appointment.view', 'appointment.manage',
  'inbox.assign', 'inbox.status', 'geo.send', 'billing.send', 'company.manage',
];

const _rolePermissionDefaults = <String, Set<String>>{
  'admin': {..._userPermissionOptions},
  'company_admin': {..._userPermissionOptions},
  'staff': {
    'dashboard.view', 'campaign.view', 'campaign.create', 'campaign.manage',
    'campaign.schedule', 'campaign.send', 'contact.view', 'contact.create',
    'contact.manage', 'contact.send', 'group.view', 'group.create',
    'group.manage', 'group.send', 'sms.send', 'delivery.view',
    'appointment.view', 'appointment.manage',
    'inbox.status', 'geo.send', 'billing.send',
  },
  'viewer': {'dashboard.view', 'campaign.view', 'contact.view', 'group.view', 'delivery.view', 'appointment.view'},
};

const _permissionDependencies = <String, Set<String>>{
  'campaign.create': {'campaign.view'},
  'campaign.manage': {'campaign.view'},
  'campaign.schedule': {'campaign.view'},
  'campaign.send': {'campaign.view'},
  'contact.create': {'contact.view'},
  'contact.manage': {'contact.view'},
  'contact.send': {'contact.view'},
  'group.create': {'group.view', 'contact.view'},
  'group.manage': {'group.view'},
  'group.send': {'group.view'},
  'appointment.manage': {'appointment.view'},
};

const _permissionAnyDependencies = <String, Set<String>>{
  'sms.send': {'campaign.send', 'contact.send', 'group.send'},
};

bool _permissionVisible(String permission, Set<String> selected) {
  final allSatisfied = (_permissionDependencies[permission] ?? const <String>{})
      .every(selected.contains);
  final anyRequired = _permissionAnyDependencies[permission] ?? const <String>{};
  return allSatisfied &&
      (anyRequired.isEmpty || anyRequired.any(selected.contains));
}

void _togglePermission(Set<String> selected, String permission, bool enabled) {
  if (enabled) {
    selected.add(permission);
    return;
  }
  selected.remove(permission);
  var changed = true;
  while (changed) {
    final before = selected.length;
    selected.removeWhere((item) => !_permissionVisible(item, selected));
    changed = selected.length != before;
  }
}

/// Admin user management: list, create (via /auth/admin/register), delete.
class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  List<User> _users = <User>[];
  bool _loading = true;
  String? _error;
  String _search = '';
  String _sort = 'created_at:DESC';

  String? get _companyId => context.read<AuthProvider>().user?.companyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final sortParts = _sort.split(':');
      final companyId = _companyId;
      final adminRepository = context.read<AdminRepository>();
      final companyName =
          context.read<AuthProvider>().user?.companyName ?? 'Company';
      var users = companyId == null
          ? await adminRepository.users(
              search: _search.isEmpty ? null : _search,
              sortBy: sortParts.first,
              sortDir: sortParts.last,
            )
          : await adminRepository.companyUsers(
              companyId,
              companyName: companyName,
            );
      if (companyId != null) {
        final query = _search.trim().toLowerCase();
        if (query.isNotEmpty) {
          users = users
              .where(
                (user) =>
                    user.name.toLowerCase().contains(query) ||
                    user.email.toLowerCase().contains(query) ||
                    user.role.toLowerCase().contains(query),
              )
              .toList();
        }
        users.sort((a, b) {
          final result = switch (sortParts.first) {
            'name' => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
            'role' => a.role.toLowerCase().compareTo(b.role.toLowerCase()),
            _ => (a.companyJoinedAt ?? a.createdAt ?? DateTime(1970)).compareTo(
              b.companyJoinedAt ?? b.createdAt ?? DateTime(1970),
            ),
          };
          return sortParts.last == 'ASC' ? result : -result;
        });
      }
      if (!mounted) return;
      setState(() => _users = users);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete(User user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete user?'),
        content: Text('"${user.name}" will lose access immediately.'),
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
    try {
      final companyId = _companyId;
      if (companyId != null) {
        final membershipId = user.membershipId;
        if (membershipId == null || membershipId.isEmpty) {
          throw const ApiException('Company membership was not found.');
        }
        await context.read<AdminRepository>().deleteCompanyUser(
          companyId,
          membershipId,
        );
      } else {
        await context.read<AdminRepository>().deleteUser(user.id);
      }
      if (!mounted) return;
      Notice.success(context, 'User deleted');
      await _load();
    } catch (e) {
      if (!mounted) return;
      Notice.error(context, errorMessage(e));
    }
  }

  Future<void> _openCreate() async {
    final result = await showModalBottomSheet<_UserFormResult>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => _CreateUserSheet(companyId: _companyId),
    );
    if (!mounted || result == null) return;
    if (result.success) {
      Notice.success(context, result.message);
      await _load();
    } else {
      Notice.error(context, result.message);
    }
  }

  Future<void> _openEdit(User user) async {
    final result = await showModalBottomSheet<_UserFormResult>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _CreateUserSheet(user: user, companyId: _companyId),
    );
    if (!mounted || result == null) return;
    if (result.success) {
      Notice.success(context, result.message);
      await _load();
    } else {
      Notice.error(context, result.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: widget.embedded ? null : AppBar(title: const Text('Users')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        icon: const Icon(Icons.person_add_outlined),
        label: const Text('New user'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search users',
                prefixIcon: Icon(Icons.search, size: 20),
              ),
              onChanged: (v) {
                _search = v;
                _load();
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 10),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '${_users.length} ${_users.length == 1 ? 'user' : 'users'}',
                    style: const TextStyle(
                      color: Color(0xff989EA9),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                PopupMenuButton<String>(
                  tooltip: 'Sort users',
                  padding: EdgeInsets.zero,
                  initialValue: _sort,
                  onSelected: (value) {
                    if (value == _sort) return;
                    setState(() => _sort = value);
                    _load();
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(
                      value: 'created_at:DESC',
                      child: Text('Newest'),
                    ),
                    PopupMenuItem(
                      value: 'created_at:ASC',
                      child: Text('Oldest'),
                    ),
                    PopupMenuItem(value: 'name:ASC', child: Text('Name A–Z')),
                    PopupMenuItem(value: 'name:DESC', child: Text('Name Z–A')),
                    PopupMenuItem(value: 'role:ASC', child: Text('Role A–Z')),
                  ],
                  child: Container(
                    constraints: const BoxConstraints(
                      minWidth: 92,
                      maxWidth: 122,
                      minHeight: 36,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 9),
                    decoration: BoxDecoration(
                      color: const Color(0xffF8FAFC),
                      border: Border.all(color: const Color(0xffD1D5DB)),
                      borderRadius: BorderRadius.circular(9),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.sort, size: 16),
                        const SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            _shortSortLabel(_sort),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 2),
                        const Icon(Icons.arrow_drop_down, size: 17),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                child: _loading
                    ? const Loader()
                    : _error != null
                    ? ErrorView(message: _error!, onRetry: _load)
                    : _users.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [
                          SizedBox(height: 100),
                          EmptyState(
                            icon: Icons.people_outline,
                            title: 'No users found',
                          ),
                        ],
                      )
                    : ListView.builder(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                        itemCount: _users.length,
                        itemBuilder: (context, i) => AnimatedEntry(
                          index: i,
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Card(
                              child: ListTile(
                                onTap: () => showEntityDetailSheet(
                                  context,
                                  title: _users[i].name,
                                  icon: Icons.person_outline,
                                  details: [
                                    DetailItem(
                                      Icons.email_outlined,
                                      'Email',
                                      _users[i].email,
                                    ),
                                    DetailItem(
                                      Icons.badge_outlined,
                                      'Role',
                                      _users[i].role,
                                    ),
                                    DetailItem(
                                      Icons.phone_outlined,
                                      'Phone',
                                      _users[i].phoneNumber ?? '',
                                    ),
                                    if (_users[i].companyId?.isNotEmpty == true)
                                      DetailItem(
                                        Icons.business_outlined,
                                        'Company',
                                        _users[i].companyName ?? '',
                                      ),
                                    if (_users[i].companyId?.isNotEmpty == true)
                                      DetailItem(
                                        Icons.badge_outlined,
                                        'Company user',
                                        _users[i].companyName == null
                                            ? 'No'
                                            : 'Yes · ${_users[i].companyName}',
                                      ),
                                    if (_users[i].companyId?.isNotEmpty == true)
                                      DetailItem(
                                        Icons.login_outlined,
                                        'Joined company',
                                        Formatters.dateTime(
                                          _users[i].companyJoinedAt,
                                        ),
                                      ),
                                    if (_users[i].companyId?.isNotEmpty == true)
                                      DetailItem(
                                        Icons.security_outlined,
                                        'Permissions',
                                        '${_users[i].permissions.length}',
                                      ),
                                    DetailItem(
                                      Icons.person_add_alt_outlined,
                                      'Created by',
                                      _users[i].creatorName
                                                  ?.trim()
                                                  .isNotEmpty ==
                                              true
                                          ? _users[i].creatorName!
                                          : 'Self-registered or legacy account',
                                    ),
                                    DetailItem(
                                      Icons.calendar_today_outlined,
                                      'Created',
                                      Formatters.dateTime(_users[i].createdAt),
                                    ),
                                    DetailItem(
                                      Icons.update_outlined,
                                      'Updated',
                                      Formatters.dateTime(_users[i].updatedAt),
                                    ),
                                  ],
                                  bodyLabel:
                                      _users[i].companyId?.isNotEmpty == true
                                      ? 'Permissions'
                                      : null,
                                  body: _users[i].companyId?.isNotEmpty == true
                                      ? (_users[i].permissions.isEmpty
                                            ? 'No permissions assigned'
                                            : _users[i].permissions.join('\n'))
                                      : null,
                                ),
                                leading: CircleAvatar(
                                  backgroundColor: const Color(0xffFEE2E2),
                                  foregroundColor: const Color(0xffDF0A0A),
                                  child: Text(
                                    _users[i].name.characters.first
                                        .toUpperCase(),
                                  ),
                                ),
                                title: Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        _users[i].name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    _RoleBadge(role: _users[i].role),
                                  ],
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _users[i].email,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xff989EA9),
                                      ),
                                    ),
                                    Text(
                                      'Created ${Formatters.date(_users[i].createdAt)}'
                                      '${_users[i].companyName == null ? '' : ' · ${_users[i].companyName}'}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xff989EA9),
                                      ),
                                    ),
                                  ],
                                ),
                                isThreeLine: true,
                                trailing: PopupMenuButton<String>(
                                  tooltip: 'User actions',
                                  onSelected: (value) {
                                    if (value == 'edit') {
                                      _openEdit(_users[i]);
                                    }
                                    if (value == 'delete') {
                                      _delete(_users[i]);
                                    }
                                  },
                                  itemBuilder: (_) => const [
                                    PopupMenuItem(
                                      value: 'edit',
                                      child: Text('Edit'),
                                    ),
                                    PopupMenuItem(
                                      value: 'delete',
                                      child: Text('Delete'),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _shortSortLabel(String value) => switch (value) {
    'created_at:ASC' => 'Oldest',
    'name:ASC' => 'A–Z',
    'name:DESC' => 'Z–A',
    'role:ASC' => 'Role',
    _ => 'Newest',
  };
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.role});

  final String role;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (role.toLowerCase()) {
      'admin' => (const Color(0xffFEE2E2), const Color(0xffDF0A0A)),
      'staff' => (const Color(0xffDBEAFE), const Color(0xff1E40AF)),
      _ => (const Color(0xffF3F4F6), const Color(0xff6B7280)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        role,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _UserFormResult {
  const _UserFormResult.success(this.message) : success = true;
  const _UserFormResult.failure(this.message) : success = false;

  final bool success;
  final String message;
}

class _CreateUserSheet extends StatefulWidget {
  const _CreateUserSheet({this.user, this.companyId});

  final User? user;
  final String? companyId;

  @override
  State<_CreateUserSheet> createState() => _CreateUserSheetState();
}

class _CreateUserSheetState extends State<_CreateUserSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  final _password = TextEditingController();
  late final TextEditingController _phone;
  late String _role;
  late Set<String> _permissions;
  bool _busy = false;

  bool get _editing => widget.user != null;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.user?.name ?? '');
    _email = TextEditingController(text: widget.user?.email ?? '');
    _phone = TextEditingController(text: widget.user?.phoneNumber ?? '');
    _role = widget.user?.role == 'company_admin'
        ? 'admin'
        : widget.user?.role ?? 'viewer';
    _permissions = widget.user == null
        ? Set<String>.from(_rolePermissionDefaults[_role] ?? const {})
        : Set<String>.from(widget.user!.permissions);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      if (_editing) {
        final changes = <String, dynamic>{
          'name': _name.text.trim(),
          'email': _email.text.trim(),
          'phoneNumber': _phone.text.trim(),
          'role': _role,
          'permissions': _permissions.toList(),
          if (_password.text.isNotEmpty) 'password': _password.text,
        };
        if (widget.companyId != null) {
          final membershipId = widget.user!.membershipId;
          if (membershipId == null || membershipId.isEmpty) {
            throw const ApiException(
              'Company membership was not found. Refresh the user list and try again.',
            );
          }
          await context.read<AdminRepository>().updateCompanyUser(
            widget.companyId!,
            membershipId,
            changes,
          );
        } else {
          await context.read<AdminRepository>().updateUser(
            widget.user!.id,
            changes,
          );
        }
      } else {
        if (widget.companyId != null) {
          await context.read<AdminRepository>().addCompanyUser(
            widget.companyId!,
            name: _name.text.trim(),
            email: _email.text.trim(),
            password: _password.text,
            phoneNumber: _phone.text.trim(),
            role: _role,
            permissions: _permissions.toList(),
          );
        } else {
          await context.read<AuthRepository>().registerUser(
            name: _name.text.trim(),
            email: _email.text.trim(),
            password: _password.text,
            phoneNumber: _phone.text.trim(),
            role: _role,
            permissions: _permissions.toList(),
          );
        }
      }
      if (!mounted) return;
      Navigator.of(context).pop(
        _UserFormResult.success(
          _editing ? 'User updated successfully' : 'User created successfully',
        ),
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(_UserFormResult.failure(errorMessage(e)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_busy,
      child: SafeArea(
        top: false,
        child: AnimatedPadding(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding: EdgeInsets.only(
            bottom: MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: .9,
            minChildSize: .55,
            maxChildSize: .96,
            builder: (context, scrollController) => Form(
              key: _formKey,
              child: ListView(
                controller: scrollController,
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        child: Icon(
                          _editing
                              ? Icons.manage_accounts_outlined
                              : Icons.person_add_outlined,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _editing ? 'Edit company user' : 'New company user',
                              style: const TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              _editing
                                  ? 'Update account details and access.'
                                  : 'Create an account and choose its access.',
                              style: const TextStyle(color: Color(0xff989EA9)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Account details',
                            style: TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 14),
                AppTextField(
                  label: 'Name',
                  controller: _name,
                  validator: (v) => Validators.required(v, 'Name'),
                  prefixIcon: Icons.person_outline,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Email',
                  controller: _email,
                  validator: Validators.email,
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon: Icons.mail_outline,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Phone number',
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  prefixIcon: Icons.phone_outlined,
                ),
                const SizedBox(height: 12),
                AppTextField(
                  label: 'Password',
                  controller: _password,
                  hint: _editing
                      ? 'Leave blank to keep current password'
                      : null,
                  validator: _editing
                      ? (value) => value == null || value.isEmpty
                            ? null
                            : Validators.password(value)
                      : Validators.password,
                  obscureText: true,
                  prefixIcon: Icons.lock_outline,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _role,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: const [
                    DropdownMenuItem(value: 'admin', child: Text('admin')),
                    DropdownMenuItem(value: 'staff', child: Text('staff')),
                    DropdownMenuItem(value: 'viewer', child: Text('viewer')),
                  ],
                  onChanged: (v) => setState(() {
                    _role = v ?? 'viewer';
                    _permissions = Set<String>.from(
                      _rolePermissionDefaults[_role] ?? const {},
                    );
                  }),
                ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              const Expanded(
                                child: Text(
                                  'Permissions',
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                              ),
                              Text(
                                '${_permissions.length} selected',
                                style: const TextStyle(
                                  color: Color(0xff989EA9),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Only selected sections and actions will be available.',
                            style: TextStyle(color: Color(0xff989EA9)),
                          ),
                          const Divider(height: 24),
                          ..._userPermissionOptions.where(
                            (permission) => _permissionVisible(permission, _permissions),
                          ).map(
                            (permission) => CheckboxListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              controlAffinity: ListTileControlAffinity.trailing,
                              value: _permissions.contains(permission),
                              title: Text(_permissionLabel(permission)),
                              onChanged: _busy
                                  ? null
                                  : (enabled) => setState(
                                      () => _togglePermission(
                                        _permissions,
                                        permission,
                                        enabled == true,
                                      ),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  PrimaryButton(
                    label: _editing ? 'Save changes' : 'Create user',
                    icon: _editing ? Icons.save_outlined : Icons.check,
                    loading: _busy,
                    onPressed: _submit,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _permissionLabel(String permission) {
    final words = permission.replaceAll('.', ' ').split(' ');
    return words
        .map((word) => word.isEmpty
            ? word
            : '${word[0].toUpperCase()}${word.substring(1)}')
        .join(' ');
  }
}
