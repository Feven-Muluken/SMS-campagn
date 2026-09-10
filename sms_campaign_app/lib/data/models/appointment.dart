import 'json_helpers.dart';

class Appointment {
  const Appointment({
    required this.id,
    required this.businessName,
    required this.phoneNumber,
    this.scheduledAt,
    this.customerName,
    this.serviceName,
    this.notes,
    this.status = 'scheduled',
    this.creatorName,
    this.creatorEmail,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String businessName;
  final String phoneNumber;
  final DateTime? scheduledAt;
  final String? customerName;
  final String? serviceName;
  final String? notes;
  final String status;
  final String? creatorName;
  final String? creatorEmail;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory Appointment.fromJson(Map<String, dynamic> json) {
    final creator = json['creator'];
    return Appointment(
      id: pickId(json),
      businessName: '${json['businessName'] ?? ''}',
      phoneNumber: '${json['phoneNumber'] ?? ''}',
      scheduledAt: pickDate(json['scheduledAt']),
      customerName: json['customerName']?.toString(),
      serviceName: json['serviceName']?.toString(),
      notes: json['notes']?.toString(),
      status: '${json['status'] ?? 'scheduled'}',
      creatorName: creator is Map ? creator['name']?.toString() : null,
      creatorEmail: creator is Map ? creator['email']?.toString() : null,
      createdAt: pickDate(json['createdAt']),
      updatedAt: pickDate(json['updatedAt']),
    );
  }
}
