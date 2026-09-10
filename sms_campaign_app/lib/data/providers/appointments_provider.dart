import 'package:flutter/foundation.dart';

import '../../core/services/api_service.dart';
import '../models/appointment.dart';
import '../repositories/appointment_repository.dart';

class AppointmentsProvider extends ChangeNotifier {
  AppointmentsProvider(this._repo);

  final AppointmentRepository _repo;

  List<Appointment> appointments = <Appointment>[];
  bool loading = false;
  String? error;

  Future<void> load() async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      appointments = await _repo.list();
    } catch (e) {
      error = errorMessage(e);
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<String?> create({
    required String businessName,
    required DateTime scheduledAt,
    required String phoneNumber,
    String? customerName,
    String? serviceName,
    String? notes,
  }) async {
    try {
      await _repo.create(
        businessName: businessName,
        scheduledAt: scheduledAt,
        phoneNumber: phoneNumber,
        customerName: customerName,
        serviceName: serviceName,
        notes: notes,
      );
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<String?> cancel(String id) async {
    try {
      await _repo.cancel(id);
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  Future<String?> complete(String id) async {
    try {
      await _repo.update(id, {'status': 'completed'});
      await load();
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  }
}
