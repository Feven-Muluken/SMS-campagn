import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/config/app_constants.dart';
import '../../../data/providers/contacts_provider.dart';
import '../../../data/providers/groups_provider.dart';
import '../../../widgets/app_text_field.dart';
import '../controllers/campaign_controller.dart';

/// Name/message/type/contact-picker form used by the create screen.
class CampaignForm extends StatefulWidget {
  const CampaignForm({
    super.key,
    required this.controller,
    this.isEditing = false,
    this.allowSendNow = true,
    this.allowScheduling = true,
  });

  final CampaignController controller;
  final bool isEditing;
  final bool allowSendNow;
  final bool allowScheduling;

  @override
  State<CampaignForm> createState() => _CampaignFormState();
}

class _CampaignFormState extends State<CampaignForm> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<ContactsProvider>().load();
      context.read<GroupsProvider>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    final contacts = context.watch<ContactsProvider>();
    final groups = context.watch<GroupsProvider>();
    return Form(
      key: controller.formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppTextField(
            label: 'Campaign name',
            controller: controller.nameController,
            validator: controller.validateName,
            prefixIcon: Icons.campaign_outlined,
            hint: widget.isEditing ? 'Update the campaign name' : null,
          ),
          AppTextField(
            label: 'Message',
            controller: controller.messageController,
            validator: controller.validateMessage,
            maxLines: 4,
            maxLength: 480,
            onChanged: (_) => setState(() {}),
            hint: 'Text sent to the selected recipients',
          ),
          Text(
            '${controller.messageController.text.length}/480 characters · '
            '${(controller.messageController.text.length / 160).ceil().clamp(1, 3)} SMS',
            textAlign: TextAlign.right,
            style: const TextStyle(fontSize: 12, color: Color(0xff989EA9)),
          ),
          const SizedBox(height: 16),
          const Text(
            'Campaign type',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            initialValue: controller.type,
            items: [
              for (final type in AppConstants.campaignTypes)
                DropdownMenuItem(
                  value: type,
                  child: Text(switch (type) {
                    'individual' => 'Selected contacts',
                    'group' => 'Contact group',
                    _ => 'Broadcast',
                  }),
                ),
            ],
            onChanged: (v) => setState(() {
              controller.type = v ?? controller.type;
              controller.groupId = null;
              controller.selectedContactIds.clear();
            }),
          ),
          const SizedBox(height: 16),
          const Text('Audience', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(switch (controller.type) {
            'individual' => 'Choose one or more contacts for this campaign.',
            'group' =>
              'Choose the contact group that will receive this campaign.',
            _ => 'This broadcast will be sent to all available contacts.',
          }, style: const TextStyle(fontSize: 12, color: Color(0xff989EA9))),
          if (controller.type == 'group') ...[
            const SizedBox(height: 10),
            const Text(
              'Target group',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              initialValue: controller.groupId,
              hint: const Text('Select a group'),
              items: [
                for (final group in groups.groups)
                  DropdownMenuItem(
                    value: group.id,
                    child: Text('${group.name} (${group.memberCount})'),
                  ),
              ],
              onChanged: (value) => setState(() => controller.groupId = value),
            ),
          ],
          if (controller.type == 'individual') ...[
            const SizedBox(height: 10),
            Text(
              'Recipients (${controller.selectedContactIds.length} selected)',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            Container(
              constraints: const BoxConstraints(maxHeight: 260),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: const Color(0xffE5E7EB)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: contacts.loading
                  ? const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : contacts.contacts.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('No contacts available.'),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: contacts.contacts.length,
                      itemBuilder: (context, i) {
                        final contact = contacts.contacts[i];
                        final selected = controller.selectedContactIds.contains(
                          contact.id,
                        );
                        return CheckboxListTile(
                          dense: true,
                          value: selected,
                          onChanged: (_) => setState(
                            () => controller.toggleContact(contact.id),
                          ),
                          title: Text(contact.name),
                          subtitle: Text(contact.phoneNumber),
                        );
                      },
                    ),
            ),
          ],
          const SizedBox(height: 18),
          if (widget.allowSendNow && !controller.editing)
            _CampaignToggle(
              title: const Text('Send now'),
              subtitle: const Text('Send immediately after creation'),
              value: controller.sendNow,
              onChanged: (value) => setState(() {
                controller.sendNow = value;
                if (value) {
                  controller.scheduledAt = null;
                  controller.recurring = false;
                  controller.recurrenceEndAt = null;
                }
              }),
            ),
          if (widget.allowScheduling && !controller.sendNow) ...[
            const SizedBox(height: 8),
            Material(
              color: const Color(0xffF3F4F6),
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () => _pickSchedule(controller),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 12,
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.schedule_outlined,
                        size: 19,
                        color: Color(0xff667085),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Schedule date and time',
                              style: TextStyle(fontWeight: FontWeight.w500),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              controller.scheduledAt == null
                                  ? 'Not selected'
                                  : controller.scheduledAt!
                                        .toLocal()
                                        .toString()
                                        .substring(0, 16),
                              style: const TextStyle(
                                fontSize: 12,
                                color: Color(0xff667085),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right,
                        size: 19,
                        color: Color(0xff667085),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            _CampaignToggle(
              title: const Text('Recurring campaign'),
              value: controller.recurring,
              onChanged: (value) => setState(() {
                controller.recurring = value;
                if (!value) controller.recurrenceEndAt = null;
              }),
            ),
            if (controller.recurring) ...[
              DropdownButtonFormField<String>(
                initialValue: controller.recurringInterval,
                decoration: const InputDecoration(labelText: 'Repeat'),
                items: const [
                  DropdownMenuItem(value: 'daily', child: Text('Daily')),
                  DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                  DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                ],
                onChanged: (value) => setState(
                  () => controller.recurringInterval = value ?? 'daily',
                ),
              ),
              const SizedBox(height: 8),
              Material(
                color: const Color(0xffF5F1FF),
                borderRadius: BorderRadius.circular(10),
                child: InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () => _pickRecurrenceEnd(controller),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 11,
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.event_busy_outlined,
                          size: 19,
                          color: Color(0xff7C3AED),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Recurrence ends',
                                style: TextStyle(fontWeight: FontWeight.w500),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                controller.recurrenceEndAt == null
                                    ? 'Never'
                                    : controller.recurrenceEndAt!
                                          .toLocal()
                                          .toString()
                                          .substring(0, 10),
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xff667085),
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (controller.recurrenceEndAt != null)
                          IconButton(
                            tooltip: 'No end date',
                            visualDensity: VisualDensity.compact,
                            onPressed: () => setState(
                              () => controller.recurrenceEndAt = null,
                            ),
                            icon: const Icon(Icons.close, size: 17),
                          )
                        else
                          const Icon(Icons.chevron_right, size: 19),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Future<void> _pickSchedule(CampaignController controller) async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      firstDate: now,
      lastDate: now.add(const Duration(days: 730)),
      initialDate: controller.scheduledAt ?? now,
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(controller.scheduledAt ?? now),
    );
    if (time == null) return;
    setState(
      () => controller.scheduledAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  Future<void> _pickRecurrenceEnd(CampaignController controller) async {
    final now = DateTime.now();
    final first = controller.scheduledAt?.isAfter(now) == true
        ? controller.scheduledAt!
        : now;
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime(first.year, first.month, first.day),
      lastDate: DateTime(now.year + 10, now.month, now.day),
      initialDate:
          controller.recurrenceEndAt != null &&
              !controller.recurrenceEndAt!.isBefore(first)
          ? controller.recurrenceEndAt!
          : first,
    );
    if (date == null || !mounted) return;
    setState(
      () => controller.recurrenceEndAt = DateTime(
        date.year,
        date.month,
        date.day,
        23,
        59,
        59,
      ),
    );
  }
}

class _CampaignToggle extends StatelessWidget {
  const _CampaignToggle({
    required this.title,
    this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final Widget title;
  final Widget? subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: DefaultTextStyle.merge(
              style: const TextStyle(fontSize: 13, color: Color(0xff111827)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  title,
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    DefaultTextStyle.merge(
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xff667085),
                      ),
                      child: subtitle!,
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 46,
            height: 28,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(16)),
            child: FittedBox(
              fit: BoxFit.fill,
              child: Switch(
                value: value,
                onChanged: onChanged,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                trackOutlineColor: const WidgetStatePropertyAll(
                  Color(0xff111827),
                ),
                trackOutlineWidth: const WidgetStatePropertyAll(1.2),
                inactiveTrackColor: const Color(0xffE5E7EB),
                inactiveThumbColor: Colors.white,
                activeTrackColor: const Color(0xffDF0A0A),
                activeThumbColor: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
