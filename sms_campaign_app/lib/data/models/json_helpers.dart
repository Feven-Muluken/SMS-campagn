/// Shared JSON helpers for models.
String pickId(Map<String, dynamic> json) => '${json['_id'] ?? json['id'] ?? ''}';

DateTime? pickDate(dynamic value) =>
    value == null ? null : DateTime.tryParse('$value');

List<String> pickStringList(dynamic value) {
  if (value is! List) return <String>[];
  return value
      .map((e) => e is Map ? '${e['_id'] ?? e['id'] ?? ''}' : '$e')
      .where((e) => e.isNotEmpty)
      .toList();
}
