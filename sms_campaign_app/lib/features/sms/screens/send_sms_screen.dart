import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../data/providers/auth_provider.dart';
import '../../../data/providers/campaigns_provider.dart';
import '../../../data/providers/contacts_provider.dart';
import '../../../data/providers/groups_provider.dart';
import '../../../data/providers/sender_id_provider.dart';
import '../../../data/repositories/sms_repository.dart';
import '../../../data/models/sms_send_result.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';

enum _Target { campaign, group, contacts }

class SendSmsScreen extends StatefulWidget {
  const SendSmsScreen({super.key});

  @override
  State<SendSmsScreen> createState() => _SendSmsScreenState();
}

class _SendSmsScreenState extends State<SendSmsScreen> {
  final _message = TextEditingController();
  final Set<String> _contacts = {};
  _Target _target = _Target.group;
  String? _campaignId;
  String? _groupId;
  bool _sending = false;
  bool _providerSelectable = false;
  List<String> _providers = const [];
  Map<String, bool> _configuredProviders = const {};
  String? _provider;
  String? _senderId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.can('campaign.send')) {
        _target = _Target.campaign;
        context.read<CampaignsProvider>().loadForSending();
      } else if (auth.can('group.send')) {
        _target = _Target.group;
      } else {
        _target = _Target.contacts;
      }
      context.read<GroupsProvider>().load();
      context.read<ContactsProvider>().load();
      _loadSenderIds();
      _loadProviders();
    });
  }

  Future<void> _loadSenderIds() async {
    final provider = context.read<SenderIdProvider>();
    await provider.loadApproved();
    if (!mounted || provider.approved.isEmpty) return;
    setState(() => _senderId = provider.approved.first.senderId);
  }

  Future<void> _loadProviders() async {
    try {
      final options = await context.read<SmsRepository>().providerOptions();
      if (!mounted) return;
      setState(() {
        _providers = options.available;
        _configuredProviders = options.configured;
        _providerSelectable = options.userSelectable && _providers.isNotEmpty;
        _provider = options.configured[options.defaultProvider] == true
            ? options.defaultProvider
            : _providers.cast<String?>().firstWhere(
                (provider) => options.configured[provider] == true,
                orElse: () => options.defaultProvider,
              );
      });
    } catch (_) {
      // Sending still uses the server-side default if discovery fails.
    }
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final message = _message.text.trim();
    if (_target == _Target.campaign && _campaignId == null ||
        _target == _Target.group && _groupId == null ||
        _target == _Target.contacts && _contacts.isEmpty) {
      Notice.error(context, 'Select who should receive this SMS.');
      return;
    }
    if (_target != _Target.campaign && message.isEmpty) {
      Notice.error(context, 'Enter a message.');
      return;
    }
    setState(() => _sending = true);
    try {
      final repo = context.read<SmsRepository>();
      final sender = _senderId;
      final SmsSendResult result;
      switch (_target) {
        case _Target.campaign:
          result = await repo.sendCampaign(
            _campaignId!,
            senderId: sender,
            provider: _provider,
          );
        case _Target.group:
          result = await repo.sendGroup(
            _groupId!,
            message,
            senderId: sender,
            provider: _provider,
          );
        case _Target.contacts:
          result = await repo.sendContacts(
            _contacts.toList(),
            message,
            senderId: sender,
            provider: _provider,
          );
      }
      if (!mounted) return;
      if (result.successCount > 0) {
        _message.clear();
        setState(() => _contacts.clear());
      }
      Notice.smsResult(context, result);
    } catch (error) {
      if (mounted) Notice.error(context, error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final canSendCampaign = auth.can('campaign.send');
    final canSendGroup = auth.can('group.send');
    final canSendContacts = auth.can('contact.send');
    final campaigns = context.watch<CampaignsProvider>().sendCampaigns;
    final groups = context.watch<GroupsProvider>().groups;
    final contacts = context.watch<ContactsProvider>().contacts;
    final approvedSenderIds = context.watch<SenderIdProvider>().approved;
    final count = _message.text.length;
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
        children: [
          if (_providerSelectable) ...[
            DropdownButtonFormField<String>(
              initialValue: _provider,
              decoration: const InputDecoration(labelText: 'SMS provider'),
              items: _providers.map((provider) {
                final configured = _configuredProviders[provider] == true;
                final label = provider == 'africastalking'
                    ? "Africa's Talking"
                    : 'MobileSMS.io';
                return DropdownMenuItem(
                  value: provider,
                  enabled: configured,
                  child: Text(configured ? label : '$label (not configured)'),
                );
              }).toList(),
              onChanged: _sending
                  ? null
                  : (value) => setState(() => _provider = value),
            ),
            const SizedBox(height: 18),
          ],
          DropdownButtonFormField<String?>(
            key: ValueKey(_senderId),
            initialValue: _senderId,
            decoration: const InputDecoration(labelText: 'Sender ID'),
            hint: Text(
              approvedSenderIds.isEmpty
                  ? 'No approved sender ID'
                  : 'Select sender ID',
            ),
            items: approvedSenderIds
                .map(
                  (item) => DropdownMenuItem<String?>(
                    value: item.senderId,
                    child: Text(item.senderId),
                  ),
                )
                .toList(),
            onChanged: _sending
                ? null
                : (value) => setState(() => _senderId = value),
          ),
          const SizedBox(height: 6),
          Text(
            approvedSenderIds.isEmpty
                ? 'Request a sender ID and wait for approval before selecting one.'
                : 'Only approved sender IDs for your company are available.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 18),
          SegmentedButton<_Target>(
            segments: [
              if (canSendCampaign)
                const ButtonSegment(
                  value: _Target.campaign,
                  label: Text('Campaign'),
                  icon: Icon(Icons.campaign_outlined),
                ),
              if (canSendGroup)
                const ButtonSegment(
                  value: _Target.group,
                  label: Text('Group'),
                  icon: Icon(Icons.groups_outlined),
                ),
              if (canSendContacts)
                const ButtonSegment(
                  value: _Target.contacts,
                  label: Text('Contacts'),
                  icon: Icon(Icons.people_outline),
                ),
            ],
            selected: {_target},
            onSelectionChanged: (value) =>
                setState(() => _target = value.first),
          ),
          const SizedBox(height: 18),
          if (_target == _Target.campaign)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Campaign',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 6),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 230),
                  child: campaigns.isEmpty
                      ? const Card(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Text('No campaigns available.'),
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          itemCount: campaigns.length,
                          itemBuilder: (_, index) {
                            final campaign = campaigns[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 5),
                              child: RadioListTile<String>(
                                value: campaign.id,
                                groupValue: _campaignId,
                                dense: true,
                                visualDensity: const VisualDensity(
                                  horizontal: -3,
                                  vertical: -3,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                ),
                                title: Text(
                                  campaign.name,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 13),
                                ),
                                subtitle: Text(
                                  '${campaign.visibleStatus} · ${campaign.audienceCount} recipients',
                                  style: const TextStyle(fontSize: 11),
                                ),
                                onChanged: (value) =>
                                    setState(() => _campaignId = value),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          if (_target == _Target.group)
            _CompactChoiceList(
              label: 'Group',
              emptyMessage: 'No groups available.',
              itemCount: groups.length,
              itemBuilder: (index) {
                final group = groups[index];
                return RadioListTile<String>(
                  value: group.id,
                  groupValue: _groupId,
                  dense: true,
                  visualDensity: const VisualDensity(
                    horizontal: -3,
                    vertical: -3,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 6),
                  title: Text(
                    group.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13),
                  ),
                  subtitle: Text(
                    '${group.memberCount} members',
                    style: const TextStyle(fontSize: 11),
                  ),
                  onChanged: (value) => setState(() => _groupId = value),
                );
              },
            ),
          if (_target == _Target.contacts)
            _CompactChoiceList(
              label: 'Contacts (${_contacts.length} selected)',
              emptyMessage: 'No contacts available.',
              itemCount: contacts.length,
              itemBuilder: (index) {
                final contact = contacts[index];
                return CheckboxListTile(
                  value: _contacts.contains(contact.id),
                  dense: true,
                  visualDensity: const VisualDensity(
                    horizontal: -3,
                    vertical: -3,
                  ),
                  contentPadding: const EdgeInsets.only(left: 16, right: 6),
                  title: Text(
                    contact.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13),
                  ),
                  subtitle: Text(
                    contact.phoneNumber,
                    style: const TextStyle(fontSize: 11),
                  ),
                  onChanged: (_) => setState(() {
                    if (!_contacts.remove(contact.id)) {
                      _contacts.add(contact.id);
                    }
                  }),
                );
              },
            ),
          if (_target != _Target.campaign) ...[
            const SizedBox(height: 18),
            AppTextField(
              label: 'Message',
              controller: _message,
              hint: 'Type your message here...',
              maxLines: 5,
              maxLength: 480,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 6),
            Text(
              '$count/480 characters | ${(count / 160).ceil().clamp(1, 3)} SMS',
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
          const SizedBox(height: 24),
          PrimaryButton(
            label: 'Send SMS',
            icon: Icons.send_outlined,
            loading: _sending,
            onPressed: _send,
          ),
        ],
      ),
    );
  }
}

class _CompactChoiceList extends StatelessWidget {
  const _CompactChoiceList({
    required this.label,
    required this.emptyMessage,
    required this.itemCount,
    required this.itemBuilder,
  });

  final String label;
  final String emptyMessage;
  final int itemCount;
  final Widget Function(int index) itemBuilder;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      const SizedBox(height: 6),
      ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: 230),
        child: itemCount == 0
            ? Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(emptyMessage),
                ),
              )
            : ListView.builder(
                shrinkWrap: true,
                itemCount: itemCount,
                itemBuilder: (_, index) => Card(
                  margin: const EdgeInsets.only(bottom: 5),
                  child: itemBuilder(index),
                ),
              ),
      ),
    ],
  );
}
