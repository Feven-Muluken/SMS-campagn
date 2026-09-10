import '../../core/services/api_service.dart';
import '../models/appointment.dart';

/// Appointment endpoints: GET/POST /appointments, PUT/:id, POST/:id/cancel.
class AppointmentRepository {
  AppointmentRepository(this._api);

  final ApiService _api;

  Future<List<Appointment>> list() async {
    final data = await _api.get('/appointments');
    return unwrapList(data).map(Appointment.fromJson).toList();
  }

  Future<Appointment> create({
    required String businessName,
    required DateTime scheduledAt,
    required String phoneNumber,
    String? customerName,
    String? serviceName,
    String? notes,
  }) async {
    final data = await _api.post('/appointments', {
      'businessName': businessName,
      'scheduledAt': scheduledAt.toIso8601String(),
      'phoneNumber': phoneNumber,
      if (customerName != null && customerName.isNotEmpty)
        'customerName': customerName,
      if (serviceName != null && serviceName.isNotEmpty)
        'serviceName': serviceName,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    final json = (data as Map)['appointment'] ?? data['data'] ?? data;
    return Appointment.fromJson(
        json is Map ? Map<String, dynamic>.from(json) : const {});
  }

  Future<void> update(String id, Map<String, dynamic> changes) =>
      _api.put('/appointments/$id', changes);

  Future<void> cancel(String id) =>
      _api.post('/appointments/$id/cancel', const {});
}
