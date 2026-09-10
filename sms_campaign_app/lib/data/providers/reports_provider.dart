import 'package:flutter/foundation.dart';

import '../../core/services/api_service.dart';
import '../models/message.dart';
import '../repositories/sms_repository.dart';

/// Delivery reporting state: the message log plus per-status counts.
class ReportsProvider extends ChangeNotifier {
  ReportsProvider(this._sms);

  final SmsRepository _sms;

  List<Message> messages = <Message>[];
  Map<String, int> counts = <String, int>{};
  bool loading = false;
  String? error;
  String filter = 'all';
  String search = '';

  static const List<String> statuses = <String>[
    'all',
    'delivered',
    'sent',
    'failed',
    'pending',
  ];

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      final summaries = await Future.wait([
        _sms.status(pageSize: 1, summary: true),
        for (final status in statuses.skip(1))
          _sms.status(status: status, pageSize: 1, summary: true),
      ]);
      final next = <String, int>{'all': summaries.first.total};
      for (var i = 1; i < statuses.length; i++) {
        next[statuses[i]] = summaries[i].total;
      }
      counts = next;

      final page = await _sms.status(
        status: filter == 'all' ? null : filter,
        search: search.isEmpty ? null : search,
        pageSize: 100,
        summary: true,
      );
      messages = page.messages;
    } catch (e) {
      error = errorMessage(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> refreshSilently() async {
    if (loading) return;
    try {
      final page = await _sms.status(
        status: filter == 'all' ? null : filter,
        search: search.isEmpty ? null : search,
        pageSize: 100,
        summary: true,
      );
      messages = page.messages;
      counts = {...counts, filter: page.total};
      notifyListeners();
    } catch (_) {
      // Keep the last useful delivery state; manual refresh surfaces errors.
    }
  }

  void setFilter(String value) {
    filter = value;
    load();
  }

  void setSearch(String value) {
    search = value;
    load();
  }
}
