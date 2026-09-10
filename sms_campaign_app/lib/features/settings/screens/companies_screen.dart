import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/services/api_service.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/validators.dart';
import '../../../data/models/user.dart';
import '../../../data/models/company.dart';
import '../../../data/repositories/admin_repository.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/entity_detail_sheet.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';
import '../../reports/widgets/status_chip.dart';

const _permissionOptions = <String>[
  'campaign.manage',
  'campaign.send',
  'contact.manage',
  'contact.send',
  'group.manage',
  'group.send',
  'user.manage',
  'sms.send',
  'delivery.view',
  'appointment.view',
  'appointment.manage',
  'inbox.assign',
  'inbox.status',
  'geo.send',
  'billing.send',
  'company.manage',
];

bool _companyPermissionVisible(String permission, Set<String> selected) {
  if (permission == 'appointment.manage') {
    return selected.contains('appointment.view');
  }
  if (permission == 'sms.send') {
    return const {'campaign.send', 'contact.send', 'group.send'}
        .any(selected.contains);
  }
  return true;
}

void _toggleCompanyPermission(Set<String> selected, String permission, bool enabled) {
  if (enabled) {
    selected.add(permission);
  } else {
    selected.remove(permission);
    if (permission == 'appointment.view') selected.remove('appointment.manage');
    if (!const {'campaign.send', 'contact.send', 'group.send'}
        .any(selected.contains)) {
      selected.remove('sms.send');
    }
  }
}

/// Admin company management: list and create companies.
class CompaniesScreen extends StatefulWidget {
  const CompaniesScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<CompaniesScreen> createState() => _CompaniesScreenState();
}

class _CompaniesScreenState extends State<CompaniesScreen> {
  List<Company> _companies = <Company>[];
  final _search = TextEditingController();
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final companies = await context.read<AdminRepository>().companies();
      if (!mounted) return;
      setState(() => _companies = companies);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = errorMessage(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openCreate() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => const _CreateCompanySheet(),
    );
    if (created ?? false) await _load();
  }

  Future<void> _openPermissions(Company company) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _CompanyPermissionsSheet(company: company),
    );
    if (changed ?? false) await _load();
  }

  Future<void> _openCompanyUser(Company company) async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _CreateCompanyUserSheet(company: company),
    );
    if (created ?? false) await _load();
  }

  Future<void> _openCompanyUsers(Company company) async {
    try {
      final users = await context.read<AdminRepository>().companyUsers(
        company.id,
        companyName: company.name,
      );
      if (!mounted) return;
      await showEntityDetailSheet(
        context,
        title: 'Users · ${company.name}',
        icon: Icons.people_outline,
        details: [
          DetailItem(Icons.people_outline, 'Total users', '${users.length}'),
          for (final user in users)
            DetailItem(
              Icons.person_outline,
              user.name,
              '${user.email} · ${company.name} · ${user.role}'
              '${user.phoneNumber?.isNotEmpty == true ? ' · ${user.phoneNumber}' : ''}'
              '${user.companyJoinedAt != null ? ' · Joined ${Formatters.date(user.companyJoinedAt)}' : ''}'
              ' · ${user.permissions.length} permissions',
              trailing: IconButton(
                tooltip: 'Edit ${user.name}',
                icon: const Icon(Icons.edit_outlined),
                onPressed: () async {
                  Navigator.of(context).pop();
                  final changed = await showModalBottomSheet<bool>(
                    context: context,
                    isScrollControlled: true,
                    showDragHandle: true,
                    builder: (_) =>
                        _CreateCompanyUserSheet(company: company, user: user),
                  );
                  if ((changed ?? false) && context.mounted) {
                    await _openCompanyUsers(company);
                  }
                },
              ),
            ),
        ],
        actions: [
          PrimaryButton(
            label: 'Add another company user',
            icon: Icons.person_add_outlined,
            onPressed: () {
              Navigator.of(context).pop();
              _openCompanyUser(company);
            },
          ),
        ],
      );
    } catch (e) {
      if (mounted) Notice.error(context, errorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.text.trim().toLowerCase();
    final companies = query.isEmpty
        ? _companies
        : _companies.where((company) {
            return <String>[
              company.name,
              company.slug ?? '',
              company.plan,
              company.status,
              company.contactEmail ?? '',
              company.contactPhone ?? '',
              company.timezone ?? '',
            ].any((value) => value.toLowerCase().contains(query));
          }).toList();
    return Scaffold(
      appBar: widget.embedded ? null : AppBar(title: const Text('Companies')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        icon: const Icon(Icons.add_business_outlined),
        label: const Text('New company'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: _loading
              ? const Loader()
              : _error != null
              ? ErrorView(message: _error!, onRetry: _load)
              : _companies.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: const [
                    SizedBox(height: 100),
                    EmptyState(
                      icon: Icons.business_outlined,
                      title: 'No companies yet',
                    ),
                  ],
                )
              : ListView.builder(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                  itemCount: companies.length + 1,
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
                                hintText: 'Search companies',
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
                              '${companies.length} ${companies.length == 1 ? 'company' : 'companies'}',
                              style: const TextStyle(
                                color: Color(0xff989EA9),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      );
                    }
                    if (companies.isEmpty) {
                      return const EmptyState(
                        icon: Icons.search_off_outlined,
                        title: 'No companies found',
                        subtitle: 'Try a different search term.',
                      );
                    }
                    final company = companies[i - 1];
                    final configurablePermissions = company.permissions
                        .where(_permissionOptions.contains)
                        .toList();
                    return AnimatedEntry(
                      index: i,
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Card(
                          child: ListTile(
                            onTap: () => showEntityDetailSheet(
                              context,
                              title: company.name,
                              icon: Icons.business_outlined,
                              status: StatusChip(status: company.status),
                              details: [
                                DetailItem(
                                  Icons.workspace_premium_outlined,
                                  'Plan',
                                  company.plan,
                                ),
                                DetailItem(
                                  Icons.link_outlined,
                                  'Slug',
                                  '/${company.slug ?? 'no-slug'}',
                                ),
                                DetailItem(
                                  Icons.email_outlined,
                                  'Email',
                                  company.contactEmail ?? '',
                                ),
                                DetailItem(
                                  Icons.phone_outlined,
                                  'Phone',
                                  company.contactPhone ?? '',
                                ),
                                DetailItem(
                                  Icons.schedule_outlined,
                                  'Timezone',
                                  company.timezone ?? '',
                                ),
                                DetailItem(
                                  Icons.security_outlined,
                                  'Permissions',
                                  '${configurablePermissions.length}',
                                ),
                                DetailItem(
                                  Icons.people_outline,
                                  'Company users',
                                  '${company.membersCount}',
                                ),
                                DetailItem(
                                  Icons.person_add_alt_outlined,
                                  'Created by',
                                  company.creatorName?.trim().isNotEmpty == true
                                      ? company.creatorName!
                                      : 'Unavailable for older records',
                                ),
                                DetailItem(
                                  Icons.calendar_today_outlined,
                                  'Created',
                                  Formatters.dateTime(company.createdAt),
                                ),
                                DetailItem(
                                  Icons.update_outlined,
                                  'Updated',
                                  Formatters.dateTime(company.updatedAt),
                                ),
                              ],
                              bodyLabel: 'Enabled permissions',
                              body: configurablePermissions.isEmpty
                                  ? 'No permissions enabled'
                                  : configurablePermissions.join('\n'),
                              actions: [
                                PrimaryButton(
                                  label: 'Edit permissions',
                                  icon: Icons.security_outlined,
                                  onPressed: () {
                                    Navigator.of(context).pop();
                                    _openPermissions(company);
                                  },
                                ),
                                PrimaryButton(
                                  label: 'Add company user',
                                  icon: Icons.person_add_outlined,
                                  outlined: true,
                                  onPressed: () {
                                    Navigator.of(context).pop();
                                    _openCompanyUser(company);
                                  },
                                ),
                              ],
                            ),
                            leading: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: const Color(0xffFEE2E2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                Icons.business_outlined,
                                size: 21,
                                color: Color(0xffDF0A0A),
                              ),
                            ),
                            title: Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    company.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                _PlanBadge(plan: company.plan),
                              ],
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  company.contactEmail ?? 'No email',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xff989EA9),
                                  ),
                                ),
                                Text(
                                  'Slug: /${company.slug ?? 'no-slug'} · Created ${Formatters.date(company.createdAt)}',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Color(0xff989EA9),
                                  ),
                                ),
                              ],
                            ),
                            trailing: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                StatusChip(status: company.status),
                                const SizedBox(height: 3),
                                TextButton(
                                  onPressed: () => _openCompanyUsers(company),
                                  style: TextButton.styleFrom(
                                    foregroundColor: const Color(0xff2563EB),
                                    padding: EdgeInsets.zero,
                                    minimumSize: Size.zero,
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                    visualDensity: VisualDensity.compact,
                                  ),
                                  child: Text(
                                    company.membersCount == 1
                                        ? '1 user'
                                        : '${company.membersCount} users',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            isThreeLine: true,
                          ),
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

class _PlanBadge extends StatelessWidget {
  const _PlanBadge({required this.plan});

  final String plan;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (plan.toLowerCase()) {
      'enterprise' => (const Color(0xffEDE9FE), const Color(0xff6D28D9)),
      'growth' => (const Color(0xffDBEAFE), const Color(0xff1D4ED8)),
      _ => (const Color(0xffF3F4F6), const Color(0xff4B5563)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        plan,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _CompanyPermissionsSheet extends StatefulWidget {
  const _CompanyPermissionsSheet({required this.company});

  final Company company;

  @override
  State<_CompanyPermissionsSheet> createState() =>
      _CompanyPermissionsSheetState();
}

class _CompanyPermissionsSheetState extends State<_CompanyPermissionsSheet> {
  late final Set<String> _selected = widget.company.permissions
      .where(_permissionOptions.contains)
      .toSet();
  bool _busy = false;

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await context.read<AdminRepository>().updateCompanyPermissions(
        widget.company.id,
        _selected.toList(),
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
      Notice.success(context, 'Company permissions updated');
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      Notice.error(context, errorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.72,
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Permissions · ${widget.company.name}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ListView(
                children: [
                  for (final permission in _permissionOptions.where(
                    (permission) => _companyPermissionVisible(permission, _selected),
                  ))
                    CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      value: _selected.contains(permission),
                      title: Text(permission),
                      onChanged: (checked) => setState(
                        () => _toggleCompanyPermission(
                          _selected,
                          permission,
                          checked == true,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            PrimaryButton(
              label: 'Save permissions',
              icon: Icons.save_outlined,
              loading: _busy,
              onPressed: _save,
            ),
          ],
        ),
      ),
    ),
  );
}

class _CreateCompanyUserSheet extends StatefulWidget {
  const _CreateCompanyUserSheet({required this.company, this.user});

  final Company company;
  final User? user;

  @override
  State<_CreateCompanyUserSheet> createState() =>
      _CreateCompanyUserSheetState();
}

class _CreateCompanyUserSheetState extends State<_CreateCompanyUserSheet> {
  final _key = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _email;
  final _password = TextEditingController();
  late final TextEditingController _phone;
  final Set<String> _permissions = <String>{};
  String _role = 'staff';
  bool _busy = false;
  bool get _editing => widget.user != null;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.user?.name ?? '');
    _email = TextEditingController(text: widget.user?.email ?? '');
    _phone = TextEditingController(text: widget.user?.phoneNumber ?? '');
    _role = widget.user?.role ?? 'staff';
    _permissions.addAll(widget.user?.permissions ?? const <String>[]);
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
    if (!(_key.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      if (_editing) {
        await context
            .read<AdminRepository>()
            .updateCompanyUser(widget.company.id, widget.user!.membershipId!, {
              'name': _name.text.trim(),
              'email': _email.text.trim(),
              'phoneNumber': _phone.text.trim(),
              'role': _role,
              'permissions': _permissions.toList(),
              if (_password.text.isNotEmpty) 'password': _password.text,
            });
      } else {
        await context.read<AdminRepository>().addCompanyUser(
          widget.company.id,
          name: _name.text.trim(),
          email: _email.text.trim(),
          password: _password.text,
          phoneNumber: _phone.text.trim(),
          role: _role,
          permissions: _permissions.toList(),
        );
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
      Notice.success(
        context,
        _editing ? 'Company user updated' : 'Company user created',
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      Notice.error(context, errorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: ConstrainedBox(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.82,
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          MediaQuery.viewInsetsOf(context).bottom + 20,
        ),
        child: Form(
          key: _key,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '${_editing ? 'Edit user' : 'Add user'} · ${widget.company.name}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView(
                  children: [
                    AppTextField(
                      label: 'Full name',
                      controller: _name,
                      validator: (v) => Validators.required(v, 'Name'),
                    ),
                    const SizedBox(height: 12),
                    AppTextField(
                      label: 'Email',
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      validator: Validators.email,
                    ),
                    const SizedBox(height: 12),
                    AppTextField(
                      label: 'Password',
                      controller: _password,
                      hint: _editing
                          ? 'Leave blank to keep current password'
                          : null,
                      obscureText: true,
                      validator: _editing
                          ? (value) => value == null || value.isEmpty
                                ? null
                                : Validators.password(value)
                          : Validators.password,
                    ),
                    const SizedBox(height: 12),
                    AppTextField(
                      label: 'Phone number',
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _role,
                      decoration: const InputDecoration(labelText: 'Role'),
                      items: const [
                        DropdownMenuItem(value: 'admin', child: Text('admin')),
                        DropdownMenuItem(value: 'staff', child: Text('staff')),
                        DropdownMenuItem(
                          value: 'viewer',
                          child: Text('viewer'),
                        ),
                      ],
                      onChanged: (value) =>
                          setState(() => _role = value ?? 'staff'),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'User permissions',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                    for (final permission in _permissionOptions.where(
                      (permission) => _companyPermissionVisible(permission, _permissions),
                    ))
                      CheckboxListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        value: _permissions.contains(permission),
                        title: Text(permission),
                        onChanged: (checked) => setState(
                          () => _toggleCompanyPermission(
                            _permissions,
                            permission,
                            checked == true,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              PrimaryButton(
                label: _editing ? 'Save changes' : 'Create company user',
                icon: _editing
                    ? Icons.save_outlined
                    : Icons.person_add_outlined,
                loading: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _CreateCompanySheet extends StatefulWidget {
  const _CreateCompanySheet();

  @override
  State<_CreateCompanySheet> createState() => _CreateCompanySheetState();
}

class _CreateCompanySheetState extends State<_CreateCompanySheet> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _slug = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _timezone = TextEditingController(text: 'Africa/Addis_Ababa');
  String _plan = 'starter';
  String _status = 'trial';
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _slug.dispose();
    _email.dispose();
    _phone.dispose();
    _timezone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      await context.read<AdminRepository>().createCompany(
        name: _name.text.trim(),
        slug: _slug.text.trim(),
        plan: _plan,
        status: _status,
        contactEmail: _email.text.trim(),
        contactPhone: _phone.text.trim(),
        timezone: _timezone.text.trim(),
        permissions: const ['campaign.view', 'contact.view'],
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
      Notice.success(context, 'Company created');
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      Notice.error(context, errorMessage(e));
    }
  }

  @override
  Widget build(BuildContext context) {
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
              const Text(
                'New company',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Company name',
                controller: _name,
                validator: (v) => Validators.required(v, 'Name'),
                prefixIcon: Icons.business_outlined,
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Slug (optional)',
                controller: _slug,
                hint: 'company-name',
                prefixIcon: Icons.link_outlined,
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Contact email',
                controller: _email,
                validator: Validators.email,
                keyboardType: TextInputType.emailAddress,
                prefixIcon: Icons.mail_outline,
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Contact phone',
                controller: _phone,
                validator: Validators.phone,
                keyboardType: TextInputType.phone,
                prefixIcon: Icons.phone_outlined,
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Timezone',
                controller: _timezone,
                validator: (v) => Validators.required(v, 'Timezone'),
                prefixIcon: Icons.schedule_outlined,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _plan,
                decoration: const InputDecoration(labelText: 'Plan'),
                items: const [
                  DropdownMenuItem(value: 'starter', child: Text('starter')),
                  DropdownMenuItem(value: 'growth', child: Text('growth')),
                  DropdownMenuItem(
                    value: 'enterprise',
                    child: Text('enterprise'),
                  ),
                ],
                onChanged: (v) => setState(() => _plan = v ?? 'starter'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _status,
                decoration: const InputDecoration(labelText: 'Status'),
                items: const [
                  DropdownMenuItem(value: 'trial', child: Text('trial')),
                  DropdownMenuItem(value: 'active', child: Text('active')),
                  DropdownMenuItem(
                    value: 'suspended',
                    child: Text('suspended'),
                  ),
                ],
                onChanged: (v) => setState(() => _status = v ?? 'trial'),
              ),
              const SizedBox(height: 20),
              PrimaryButton(
                label: 'Create company',
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
