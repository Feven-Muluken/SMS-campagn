import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/utils/validators.dart';
import '../../../data/models/contact.dart';
import '../../../data/providers/contacts_provider.dart';
import '../../../data/providers/groups_provider.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';

/// Add/edit contact form. Pass an existing [Contact] as a route argument to
/// edit; no argument means "add".
class ContactFormScreen extends StatefulWidget {
  const ContactFormScreen({super.key, this.contact, this.sheet = false});

  final Contact? contact;
  final bool sheet;

  @override
  State<ContactFormScreen> createState() => _ContactFormScreenState();
}

class _ContactFormScreenState extends State<ContactFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _phone;
  late final TextEditingController _locationName;
  late final TextEditingController _latitude;
  late final TextEditingController _longitude;
  String? _groupId;
  bool _busy = false;

  bool get isEdit => widget.contact != null;

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.contact?.name ?? '');
    _phone = TextEditingController(text: widget.contact?.phoneNumber ?? '');
    _locationName =
        TextEditingController(text: widget.contact?.locationName ?? '');
    _latitude = TextEditingController(
        text: widget.contact?.latitude?.toString() ?? '');
    _longitude = TextEditingController(
        text: widget.contact?.longitude?.toString() ?? '');
    _groupId = widget.contact?.groups.isNotEmpty == true
        ? widget.contact!.groups.first
        : null;
    WidgetsBinding.instance.addPostFrameCallback(
        (_) => context.read<GroupsProvider>().load());
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _locationName.dispose();
    _latitude.dispose();
    _longitude.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final latitude = double.tryParse(_latitude.text.trim());
    final longitude = double.tryParse(_longitude.text.trim());
    if ((_latitude.text.trim().isNotEmpty || _longitude.text.trim().isNotEmpty) &&
        (latitude == null || longitude == null)) {
      Notice.error(context, 'Enter both a valid latitude and longitude.');
      return;
    }
    setState(() => _busy = true);
    final contact = Contact(
      id: widget.contact?.id ?? '',
      name: _name.text.trim(),
      phoneNumber: _phone.text.trim(),
      groups: _groupId == null ? const <String>[] : <String>[_groupId!],
      locationName: _locationName.text.trim(),
      latitude: latitude,
      longitude: longitude,
      createdAt: widget.contact?.createdAt,
      updatedAt: widget.contact?.updatedAt,
    );
    final error = await context
        .read<ContactsProvider>()
        .save(contact, isEdit: isEdit);
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      Notice.error(context, error);
    } else {
      Notice.success(context, isEdit ? 'Contact updated' : 'Contact added');
      Navigator.of(context).pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final groups = context.watch<GroupsProvider>().groups;
    final form = SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(isEdit ? 'Edit contact' : 'Add contact',
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Full name',
                controller: _name,
                validator: (v) => Validators.required(v, 'Name'),
                prefixIcon: Icons.person_outline,
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Phone number',
                controller: _phone,
                validator: Validators.phone,
                keyboardType: TextInputType.phone,
                prefixIcon: Icons.phone_outlined,
                hint: '+251911234567',
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String?>(
                initialValue: _groupId,
                decoration: const InputDecoration(
                  labelText: 'Group (optional)',
                  prefixIcon: Icon(Icons.groups_outlined, size: 20),
                ),
                items: [
                  const DropdownMenuItem<String?>(
                      value: null, child: Text('No group')),
                  for (final group in groups)
                    DropdownMenuItem<String?>(
                        value: group.id, child: Text(group.name)),
                ],
                onChanged: (value) => setState(() => _groupId = value),
              ),
              const SizedBox(height: 16),
              AppTextField(
                label: 'Location name (optional)',
                controller: _locationName,
                hint: 'Bole, Addis Ababa',
                prefixIcon: Icons.place_outlined,
              ),
              const SizedBox(height: 16),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: AppTextField(
                      label: 'Latitude',
                      controller: _latitude,
                      hint: '9.0120',
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true, signed: true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: AppTextField(
                      label: 'Longitude',
                      controller: _longitude,
                      hint: '38.7613',
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true, signed: true),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              PrimaryButton(
                label: isEdit ? 'Save changes' : 'Add contact',
                icon: Icons.check,
                loading: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
    );
    if (widget.sheet) {
      return SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(context).height * 0.72),
          child: form,
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(isEdit ? 'Edit contact' : 'Add contact')),
      body: form,
    );
  }
}
