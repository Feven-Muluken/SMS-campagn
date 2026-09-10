import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/utils/formatters.dart';
import '../../../data/providers/appointments_provider.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/empty_state.dart';
import '../../../widgets/error_view.dart';
import '../../../widgets/entity_detail_sheet.dart';
import '../../../widgets/loader.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';
import '../../reports/widgets/status_chip.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => context.read<AppointmentsProvider>().load(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppointmentsProvider>();
    final canManage = context.watch<AuthProvider>().can('appointment.manage');
    return Scaffold(
      appBar: widget.embedded
          ? null
          : AppBar(title: const Text('Appointments')),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                showDragHandle: true,
                builder: (_) => const _AppointmentForm(),
              ),
              icon: const Icon(Icons.add),
              label: const Text('Schedule'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: provider.load,
        child: provider.loading
            ? const Loader()
            : provider.error != null
            ? ErrorView(message: provider.error!, onRetry: provider.load)
            : provider.appointments.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 100),
                  EmptyState(
                    icon: Icons.event_available_outlined,
                    title: 'No appointments',
                    subtitle: 'Schedule an appointment and SMS reminder.',
                  ),
                ],
              )
            : ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                itemCount: provider.appointments.length + 1,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (_, index) {
                  if (index == 0) {
                    final count = provider.appointments.length;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        '$count ${count == 1 ? 'appointment' : 'appointments'}',
                        style: const TextStyle(
                          color: Color(0xff989EA9),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    );
                  }
                  final item = provider.appointments[index - 1];
                  return Card(
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: () => showEntityDetailSheet(
                        context,
                        title: item.businessName,
                        icon: Icons.event_outlined,
                        status: StatusChip(status: item.status),
                        details: [
                          DetailItem(
                            Icons.person_outline,
                            'Customer',
                            item.customerName ?? '',
                          ),
                          DetailItem(
                            Icons.design_services_outlined,
                            'Service',
                            item.serviceName ?? '',
                          ),
                          DetailItem(
                            Icons.schedule_outlined,
                            'Scheduled',
                            Formatters.dateTime(item.scheduledAt),
                          ),
                          DetailItem(
                            Icons.phone_outlined,
                            'Phone',
                            item.phoneNumber,
                          ),
                          DetailItem(
                            Icons.person_add_alt_outlined,
                            'Created by',
                            item.creatorName?.trim().isNotEmpty == true
                                ? item.creatorName!
                                : 'Unavailable for older records',
                          ),
                          DetailItem(
                            Icons.calendar_today_outlined,
                            'Created',
                            Formatters.dateTime(item.createdAt),
                          ),
                          DetailItem(
                            Icons.update_outlined,
                            'Updated',
                            Formatters.dateTime(item.updatedAt),
                          ),
                        ],
                        bodyLabel: 'Notes',
                        body: item.notes,
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    item.businessName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                                StatusChip(status: item.status),
                              ],
                            ),
                            if (item.customerName?.isNotEmpty ?? false)
                              Text(item.customerName!),
                            if (item.serviceName?.isNotEmpty ?? false)
                              Text(
                                item.serviceName!,
                                style: const TextStyle(color: Colors.grey),
                              ),
                            const SizedBox(height: 8),
                            Text(Formatters.dateTime(item.scheduledAt)),
                            Text(item.phoneNumber),
                            if (canManage && item.status == 'booked')
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  TextButton.icon(
                                    icon: const Icon(
                                      Icons.check_circle_outline,
                                    ),
                                    label: const Text('Complete'),
                                    onPressed: () async {
                                      final error = await provider.complete(
                                        item.id,
                                      );
                                      if (!context.mounted) return;
                                      error == null
                                          ? Notice.success(
                                              context,
                                              'Appointment completed',
                                            )
                                          : Notice.error(context, error);
                                    },
                                  ),
                                  TextButton.icon(
                                    icon: const Icon(Icons.cancel_outlined),
                                    label: const Text('Cancel'),
                                    onPressed: () async {
                                      final error = await provider.cancel(
                                        item.id,
                                      );
                                      if (!context.mounted) return;
                                      error == null
                                          ? Notice.success(
                                              context,
                                              'Appointment cancelled',
                                            )
                                          : Notice.error(context, error);
                                    },
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _AppointmentForm extends StatefulWidget {
  const _AppointmentForm();

  @override
  State<_AppointmentForm> createState() => _AppointmentFormState();
}

class _AppointmentFormState extends State<_AppointmentForm> {
  final _key = GlobalKey<FormState>();
  final _business = TextEditingController();
  final _customer = TextEditingController();
  final _service = TextEditingController();
  final _phone = TextEditingController();
  final _notes = TextEditingController();
  DateTime? _when;
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_business, _customer, _service, _phone, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDateTime() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: now,
      lastDate: DateTime(now.year + 3),
      initialDate: _when ?? now,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_when ?? now),
    );
    if (time == null) return;
    setState(
      () => _when = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _submit() async {
    if (!(_key.currentState?.validate() ?? false)) return;
    if (_when == null) {
      Notice.error(context, 'Choose the appointment date and time.');
      return;
    }
    setState(() => _busy = true);
    final error = await context.read<AppointmentsProvider>().create(
      businessName: _business.text.trim(),
      scheduledAt: _when!,
      phoneNumber: _phone.text.trim(),
      customerName: _customer.text.trim(),
      serviceName: _service.text.trim(),
      notes: _notes.text.trim(),
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) return Notice.error(context, error);
    Navigator.pop(context);
    Notice.success(context, 'Appointment scheduled');
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      0,
      20,
      MediaQuery.viewInsetsOf(context).bottom + 24,
    ),
    child: SingleChildScrollView(
      child: Form(
        key: _key,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Schedule appointment',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            AppTextField(
              label: 'Business name',
              controller: _business,
              validator: (v) => v == null || v.trim().isEmpty
                  ? 'Business name is required'
                  : null,
            ),
            const SizedBox(height: 12),
            AppTextField(label: 'Customer name', controller: _customer),
            const SizedBox(height: 12),
            AppTextField(label: 'Service', controller: _service),
            const SizedBox(height: 12),
            AppTextField(
              label: 'Phone number',
              hint: '+254...',
              controller: _phone,
              keyboardType: TextInputType.phone,
              validator: (v) =>
                  RegExp(r'^\+[1-9]\d{1,14}$').hasMatch(v?.trim() ?? '')
                  ? null
                  : 'Use international format, for example +254700000000',
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _pickDateTime,
              icon: const Icon(Icons.schedule),
              label: Text(
                _when == null
                    ? 'Choose date and time'
                    : Formatters.dateTime(_when),
              ),
            ),
            const SizedBox(height: 12),
            AppTextField(label: 'Notes', controller: _notes, maxLines: 3),
            const SizedBox(height: 20),
            PrimaryButton(
              label: 'Schedule appointment',
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
