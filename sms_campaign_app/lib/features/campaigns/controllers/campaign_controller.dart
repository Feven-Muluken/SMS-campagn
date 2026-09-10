import 'package:flutter/material.dart';

import '../../../core/config/app_constants.dart';
import '../../../core/utils/validators.dart';
import '../../../data/models/campaign.dart';

/// Form-level logic for creating a campaign.
class CampaignController {
  CampaignController({Campaign? campaign}) {
    if (campaign == null) return;
    editing = true;
    nameController.text = campaign.name;
    messageController.text = campaign.message;
    type = campaign.type;
    selectedContactIds.addAll(campaign.recipients);
    groupId = campaign.group;
    scheduledAt = campaign.scheduledAt;
    recurring = campaign.recurringActive;
    recurringInterval = campaign.recurringInterval ?? 'daily';
    recurrenceEndAt = campaign.recurrenceEndAt;
  }

  final formKey = GlobalKey<FormState>();
  final nameController = TextEditingController();
  final messageController = TextEditingController();
  String type = 'broadcast/everyone';
  final Set<String> selectedContactIds = <String>{};
  String? groupId;
  DateTime? scheduledAt;
  bool sendNow = false;
  bool editing = false;
  bool recurring = false;
  String recurringInterval = 'daily';
  DateTime? recurrenceEndAt;

  String? validateName(String? value) => Validators.required(value, 'Name');

  String? validateMessage(String? value) =>
      Validators.required(value, 'Message');

  /// Guards against types outside the backend enum.
  String? validateSelection({bool allowDraft = false}) {
    if (!AppConstants.campaignTypes.contains(type)) {
      return 'Unsupported campaign type';
    }
    if (type == 'individual' && selectedContactIds.isEmpty) {
      return 'Select at least one contact';
    }
    if (type == 'group' && (groupId == null || groupId!.isEmpty)) {
      return 'Select a group';
    }
    if (!editing && !allowDraft && !sendNow && scheduledAt == null) {
      return 'Choose a schedule or select Send now';
    }
    if (recurring && scheduledAt == null) {
      return 'Recurring campaigns require a schedule';
    }
    if (recurring &&
        recurrenceEndAt != null &&
        scheduledAt != null &&
        recurrenceEndAt!.isBefore(scheduledAt!)) {
      return 'Recurrence end must be after the first scheduled send';
    }
    return null;
  }

  void toggleContact(String id) {
    if (!selectedContactIds.remove(id)) selectedContactIds.add(id);
  }

  void dispose() {
    nameController.dispose();
    messageController.dispose();
  }
}
