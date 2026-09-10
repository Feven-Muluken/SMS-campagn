import 'package:flutter/foundation.dart';

import '../../core/services/api_service.dart';
import '../models/sender_id.dart';
import '../repositories/sender_id_repository.dart';

/// Backend-persisted sender ID requests for the active company.
class SenderIdProvider extends ChangeNotifier {
  SenderIdProvider(this._repo);

  final SenderIdRepository _repo;

  List<SenderId> requests = <SenderId>[];
  List<SenderId> approved = <SenderId>[];
  bool loading = false;
  String? error;

  Future<void> load({bool reviewQueue = false, bool allAdmin = false}) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      requests = allAdmin
          ? await _repo.listAllAdmin()
          : reviewQueue
              ? await _repo.listPending()
              : await _repo.list();
    } catch (e) {
      error = errorMessage(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> loadApproved() async {
    try {
      approved = await _repo.listApproved();
      notifyListeners();
    } catch (e) {
      error = errorMessage(e);
      notifyListeners();
    }
  }

  Future<String?> review(String id, String status, {bool allAdmin = false}) async {
    try {
      await _repo.review(id, status);
      await load(reviewQueue: !allAdmin, allAdmin: allAdmin);
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<String?> request(String senderId, {String? reason}) async {
    try {
      await _repo.request(senderId, reason: reason);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<void> remove(String senderId) async {
    await _repo.remove(senderId);
    await load();
  }
}
