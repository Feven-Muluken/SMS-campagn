import 'package:flutter/foundation.dart';

import '../../core/services/api_service.dart';
import '../models/group.dart';
import '../models/message.dart';
import '../models/sms_send_result.dart';
import '../repositories/group_repository.dart';

class GroupsProvider extends ChangeNotifier {
  GroupsProvider(this._repo);

  final GroupRepository _repo;

  List<Group> groups = <Group>[];
  bool loading = false;
  bool sending = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      groups = await _repo.list();
    } catch (e) {
      error = errorMessage(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<String?> create(String name, List<String> memberIds) async {
    try {
      await _repo.create(name, memberIds);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<String?> remove(String id) async {
    try {
      await _repo.delete(id);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<String?> update(String id, String name, List<String> memberIds) async {
    try {
      await _repo.update(id, name, memberIds);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<List<Message>> deliveries(String id) => _repo.deliveries(id);

  Future<String?> addMembers(String id, List<String> memberIds) async {
    try {
      await _repo.addMembers(id, memberIds);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  /// Returns a human-readable result string, or throws an error string.
  Future<SmsSendResult> sendToGroup(String id, String content,
      {String? senderId}) async {
    sending = true;
    notifyListeners();
    try {
      final result = await _repo.sendToGroup(id, content, senderId: senderId);
      return result;
    } catch (e) {
      throw errorMessage(e);
    } finally {
      sending = false;
      notifyListeners();
    }
  }

  Group? byId(String id) {
    for (final g in groups) {
      if (g.id == id) return g;
    }
    return null;
  }
}
