import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/services/api_service.dart';
import '../../../data/providers/campaigns_provider.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/models/campaign.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';
import '../controllers/campaign_controller.dart';
import '../widgets/campaign_form.dart';

/// Creates drafts for all company members; sending remains permission-gated.
class CreateCampaignScreen extends StatefulWidget {
  const CreateCampaignScreen({
    super.key,
    this.campaign,
    this.embedded = false,
    this.onDone,
  });

  final Campaign? campaign;
  final bool embedded;
  final VoidCallback? onDone;

  @override
  State<CreateCampaignScreen> createState() => _CreateCampaignScreenState();
}

class _CreateCampaignScreenState extends State<CreateCampaignScreen> {
  late final CampaignController _controller;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _controller = CampaignController(campaign: widget.campaign);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_controller.formKey.currentState?.validate() ?? false)) return;
    final canSend = context.read<AuthProvider>().can('campaign.send');
    final canSchedule = context.read<AuthProvider>().can('campaign.schedule');
    final selectionError = _controller.validateSelection(
      allowDraft: !canSend && !canSchedule,
    );
    if (selectionError != null) {
      Notice.error(context, selectionError);
      return;
    }
    setState(() => _busy = true);
    final provider = context.read<CampaignsProvider>();
    String? error;
    try {
      error = widget.campaign == null
          ? await provider.create(
              name: _controller.nameController.text.trim(),
              message: _controller.messageController.text.trim(),
              type: _controller.type,
              recipients: _controller.selectedContactIds.toList(),
              group: _controller.groupId,
              schedule: _controller.scheduledAt,
              recurring: _controller.recurring,
              recurringInterval: _controller.recurringInterval,
              recurrenceEndAt: _controller.recurrenceEndAt,
              sendNow: _controller.sendNow,
            )
          : await provider.update(
              id: widget.campaign!.id,
              message: _controller.messageController.text.trim(),
              type: _controller.type,
              recipients: _controller.selectedContactIds.toList(),
              group: _controller.groupId,
              schedule: _controller.scheduledAt,
              recurring: _controller.recurring,
              recurringInterval: _controller.recurringInterval,
              recurrenceEndAt: _controller.recurrenceEndAt,
            );
    } catch (exception) {
      error = errorMessage(exception);
    }
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      Notice.error(context, error);
    } else {
      final sendResult = provider.lastSendResult;
      if (widget.campaign == null &&
          _controller.sendNow &&
          sendResult != null) {
        Notice.smsResult(context, sendResult);
      } else {
        Notice.success(
          context,
          widget.campaign == null ? 'Campaign created' : 'Campaign updated',
        );
      }
      if (widget.embedded) {
        widget.onDone?.call();
      } else {
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSend = context.watch<AuthProvider>().can('campaign.send');
    final canSchedule = context.watch<AuthProvider>().can('campaign.schedule');
    final form = SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CampaignForm(
            controller: _controller,
            isEditing: widget.campaign != null,
            allowSendNow: canSend,
            allowScheduling: canSchedule,
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            label: widget.campaign == null ? 'Create campaign' : 'Save changes',
            icon: Icons.check,
            loading: _busy,
            onPressed: _submit,
          ),
        ],
      ),
    );
    if (!widget.embedded) {
      return Scaffold(
        appBar: AppBar(
          title: Text(
            widget.campaign == null ? 'New campaign' : 'Edit campaign',
          ),
        ),
        body: form,
      );
    }
    return Column(
      children: [
        Material(
          color: Theme.of(context).colorScheme.surface,
          child: SafeArea(
            top: false,
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(4, 4, 16, 4),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Back to campaigns',
                    onPressed: widget.onDone,
                    icon: const Icon(Icons.arrow_back),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    widget.campaign == null
                        ? 'Create campaign'
                        : 'Edit campaign',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(child: form),
      ],
    );
  }
}
