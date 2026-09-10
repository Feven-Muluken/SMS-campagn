import 'package:flutter/foundation.dart';

import '../../core/services/api_service.dart';
import '../models/contact.dart';
import '../repositories/contact_repository.dart';

class ContactsProvider extends ChangeNotifier {
  ContactsProvider(this._repo);

  final ContactRepository _repo;

  List<Contact> contacts = <Contact>[];
  bool loading = false;
  String? error;
  String search = '';

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      contacts = await _repo.list(search: search);
    } catch (e) {
      error = errorMessage(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void setSearch(String value) {
    search = value;
    load();
  }

  /// Returns `null` on success, else the error to display.
  Future<String?> save(Contact contact, {required bool isEdit}) async {
    try {
      if (isEdit) {
        await _repo.update(contact);
      } else {
        await _repo.create(contact);
      }
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

  Contact? byId(String id) {
    for (final c in contacts) {
      if (c.id == id) return c;
    }
    return null;
  }
}
