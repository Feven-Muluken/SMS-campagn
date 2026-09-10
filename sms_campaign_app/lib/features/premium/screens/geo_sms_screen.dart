import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/providers/contacts_provider.dart';
import '../../../data/repositories/sms_repository.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/notice.dart';

class GeoSmsScreen extends StatefulWidget {
  const GeoSmsScreen({super.key});

  @override
  State<GeoSmsScreen> createState() => _GeoSmsScreenState();
}

class _GeoSmsScreenState extends State<GeoSmsScreen> {
  final _place = TextEditingController();
  final _latitude = TextEditingController();
  final _longitude = TextEditingController();
  final _message = TextEditingController();
  final _senderId = TextEditingController();
  double _radius = 5;
  Map<String, dynamic>? _preview;
  bool _loading = false;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback(
      (_) => context.read<ContactsProvider>().load(),
    );
  }

  @override
  void dispose() {
    for (final controller
        in [_place, _latitude, _longitude, _message, _senderId]) {
      controller.dispose();
    }
    super.dispose();
  }

  (double, double)? _coordinates() {
    final lat = double.tryParse(_latitude.text.trim());
    final lng = double.tryParse(_longitude.text.trim());
    if (lat == null || lng == null || lat < -90 || lat > 90 ||
        lng < -180 || lng > 180) {
      Notice.error(context, 'Enter valid latitude and longitude.');
      return null;
    }
    return (lat, lng);
  }

  Future<void> _previewAudience() async {
    final point = _coordinates();
    if (point == null) return;
    setState(() => _loading = true);
    try {
      final result = await context.read<SmsRepository>().previewGeo(
            latitude: point.$1,
            longitude: point.$2,
            radiusKm: _radius,
            placeName: _place.text.trim(),
          );
      if (!mounted) return;
      setState(() => _preview = result);
      Notice.success(context, '${result['count'] ?? 0} contacts in radius');
    } catch (error) {
      if (mounted) Notice.error(context, '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final point = _coordinates();
    if (point == null) return;
    if (_message.text.trim().isEmpty) {
      return Notice.error(context, 'Enter the Geo SMS message.');
    }
    if ((_preview?['count'] as num?)?.toInt() == 0) {
      return Notice.error(context, 'No contacts are inside this radius.');
    }
    setState(() => _sending = true);
    try {
      final result = await context.read<SmsRepository>().sendGeo(
            latitude: point.$1,
            longitude: point.$2,
            radiusKm: _radius,
            placeName: _place.text.trim(),
            message: _message.text.trim(),
            senderId: _senderId.text.trim(),
          );
      if (!mounted) return;
      Notice.smsResult(context, result);
      await _previewAudience();
    } catch (error) {
      if (mounted) Notice.error(context, '$error');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final located = context
        .watch<ContactsProvider>()
        .contacts
        .where((contact) =>
            contact.latitude != null && contact.longitude != null)
        .toList();
    final audience = (_preview?['contacts'] as List?) ?? const [];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
      children: [
        const Text('Target a geographic area',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const Text(
          'Choose a saved contact location or enter the center coordinates, then select a radius.',
          style: TextStyle(color: AppColors.muted, fontSize: 12),
        ),
        if (located.isNotEmpty) ...[
          const SizedBox(height: 14),
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(
              labelText: 'Use a saved location as center',
              prefixIcon: Icon(Icons.location_on_outlined),
            ),
            items: [
              for (final contact in located)
                DropdownMenuItem(
                  value: contact.id,
                  child: Text(contact.locationName?.isNotEmpty == true
                      ? '${contact.locationName} (${contact.name})'
                      : contact.name),
                ),
            ],
            onChanged: (id) {
              final contact = located.firstWhere((item) => item.id == id);
              setState(() {
                _place.text = contact.locationName ?? contact.name;
                _latitude.text = '${contact.latitude}';
                _longitude.text = '${contact.longitude}';
                _preview = null;
              });
            },
          ),
        ],
        const SizedBox(height: 12),
        AppTextField(label: 'Area name', controller: _place,
            hint: 'e.g. Bole, Addis Ababa'),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: AppTextField(
              label: 'Latitude',
              controller: _latitude,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true, signed: true),
              onChanged: (_) => setState(() => _preview = null),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: AppTextField(
              label: 'Longitude',
              controller: _longitude,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true, signed: true),
              onChanged: (_) => setState(() => _preview = null),
            ),
          ),
        ]),
        const SizedBox(height: 14),
        Text('Radius: ${_radius.round()} km',
            style: const TextStyle(fontWeight: FontWeight.w700)),
        Slider(
          value: _radius,
          min: 1,
          max: 100,
          divisions: 99,
          label: '${_radius.round()} km',
          onChanged: (value) => setState(() {
            _radius = value;
            _preview = null;
          }),
        ),
        OutlinedButton.icon(
          onPressed: _loading ? null : _previewAudience,
          icon: _loading
              ? const SizedBox.square(
                  dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.radar),
          label: const Text('Preview audience'),
        ),
        if (_preview != null) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.gray100,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${_preview!['count'] ?? 0} contacts in radius',
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                for (final raw in audience.take(20))
                  if (raw is Map)
                    ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text('${raw['name'] ?? raw['phoneNumber']}'),
                      subtitle: Text('${raw['phoneNumber'] ?? ''}'),
                      trailing: Text('${raw['distanceKm']} km'),
                    ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 14),
        AppTextField(
          label: 'Sender ID (optional)',
          controller: _senderId,
          maxLength: 11,
        ),
        const SizedBox(height: 12),
        AppTextField(
          label: 'Geo SMS message',
          controller: _message,
          maxLines: 4,
          maxLength: 480,
        ),
        const SizedBox(height: 18),
        FilledButton.icon(
          onPressed: _sending ? null : _send,
          icon: _sending
              ? const SizedBox.square(
                  dimension: 17,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.send_outlined),
          label: const Text('Send Geo SMS'),
        ),
      ],
    );
  }
}
