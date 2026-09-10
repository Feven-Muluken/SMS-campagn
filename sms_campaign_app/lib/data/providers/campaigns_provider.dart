import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/services/api_service.dart';
import '../models/campaign.dart';
import '../models/message.dart';
import '../models/sms_send_result.dart';
import '../repositories/campaign_repository.dart';
import '../repositories/sms_repository.dart';

class CampaignsProvider extends ChangeNotifier {
  CampaignsProvider(this._campaigns, this._sms);

  final CampaignRepository _campaigns;
  final SmsRepository _sms;

  List<Campaign> campaigns = <Campaign>[];
  List<Campaign> sendCampaigns = <Campaign>[];
  bool loading = false;
  bool sending = false;
  String? error;
  String search = '';
  String filter = 'all';
  SmsSendResult? lastSendResult;
  Timer? _searchDebounce;
  int _loadGeneration = 0;

  static const statuses = <String>[
    'all',
    'scheduled',
    'recurring',
    'sent',
    'failed',
  ];

  Future<void> load() async {
    final generation = ++_loadGeneration;
    loading = true;
    error = null;
    notifyListeners();
    try {
      final result = await _campaigns.list(
        search: search,
        status: filter == 'all' ? null : filter,
      );
      if (generation != _loadGeneration) return;
      campaigns = result;
    } catch (e) {
      if (generation != _loadGeneration) return;
      error = errorMessage(e);
    } finally {
      if (generation == _loadGeneration) {
        loading = false;
        notifyListeners();
      }
    }
  }

  /// Loads the complete campaign list for the Send SMS picker without
  /// inheriting the Campaigns screen's search or status filters.
  Future<void> loadForSending() async {
    try {
      final result = <Campaign>[];
      var page = 1;
      while (true) {
        final batch = await _campaigns.list(page: page);
        result.addAll(batch);
        if (batch.length < 500) break;
        page += 1;
      }
      sendCampaigns = result;
      notifyListeners();
    } catch (e) {
      error = errorMessage(e);
      notifyListeners();
    }
  }

  void setSearch(String value) {
    search = value;
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), load);
  }

  void setFilter(String value) {
    if (filter == value) return;
    _searchDebounce?.cancel();
    filter = value;
    load();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    super.dispose();
  }

  Future<Campaign> getById(String id) => _campaigns.getById(id);

  Future<List<Message>> sendingHistory(String id) async {
    final records = <Message>[];
    var pageNumber = 1;
    while (true) {
      final page = await _sms.status(
        campaignId: id,
        page: pageNumber,
        pageSize: 500,
      );
      records.addAll(page.messages);
      if (records.length >= page.total || page.messages.isEmpty) break;
      pageNumber += 1;
    }
    return records;
  }

  Future<String?> create({
    required String name,
    required String message,
    required String type,
    List<String> recipients = const <String>[],
    String? group,
    DateTime? schedule,
    bool recurring = false,
    String recurringInterval = 'daily',
    DateTime? recurrenceEndAt,
    bool sendNow = false,
  }) async {
    lastSendResult = null;
    try {
      final campaign = await _campaigns.create(
        name: name,
        message: message,
        type: type,
        recipients: recipients,
        group: group,
        schedule: schedule,
        recurring: recurring,
        recurringInterval: recurringInterval,
        recurrenceEndAt: recurrenceEndAt,
      );
      if (sendNow) lastSendResult = await _sms.sendCampaign(campaign.id);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<String?> remove(String id) async {
    try {
      await _campaigns.delete(id);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<String?> changeStatus(String id, String action) async {
    try {
      await _campaigns.changeStatus(id, action);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<String?> update({
    required String id,
    required String message,
    required String type,
    required List<String> recipients,
    String? group,
    DateTime? schedule,
    bool recurring = false,
    String recurringInterval = 'daily',
    DateTime? recurrenceEndAt,
  }) async {
    try {
      await _campaigns.update(id, {
        'message': message,
        'type': type,
        'recipientType': 'Contact',
        'recipients': recipients,
        'group': group,
        'schedule': schedule?.toUtc().toIso8601String(),
        'recurring': {
          'active': recurring,
          if (recurring) 'interval': recurringInterval,
          if (recurring && recurrenceEndAt != null)
            'endAt': recurrenceEndAt.toUtc().toIso8601String(),
        },
      });
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<String?> sendNow(String id, {String? senderId}) async {
    sending = true;
    lastSendResult = null;
    notifyListeners();
    try {
      lastSendResult = await _sms.sendCampaign(id, senderId: senderId);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    } finally {
      sending = false;
      notifyListeners();
    }
  }
}
