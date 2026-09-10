import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/services/storage_service.dart';
import '../core/services/api_service.dart';
import 'notice.dart';
import 'primary_button.dart';

/// Bottom sheet to view/edit the persisted backend base URL.
/// Reachable from the login screen and from settings.
Future<void> showServerUrlSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => const _ServerUrlSheet(),
  );
}

class _ServerUrlSheet extends StatefulWidget {
  const _ServerUrlSheet();

  @override
  State<_ServerUrlSheet> createState() => _ServerUrlSheetState();
}

class _ServerUrlSheetState extends State<_ServerUrlSheet> {
  late final TextEditingController _controller;
  bool _testing = false;

  @override
  void initState() {
    super.initState();
    _controller =
        TextEditingController(text: context.read<StorageService>().serverUrl);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final url = _controller.text.trim();
    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme || !uri.hasAuthority ||
        (uri.scheme != 'http' && uri.scheme != 'https')) {
      Notice.error(context, 'Enter a complete http:// or https:// server address.');
      return;
    }
    await context.read<StorageService>().setServerUrl(url);
    if (!mounted) return;
    setState(() => _testing = true);
    try {
      await context.read<ApiService>().health();
      if (!mounted) return;
      Navigator.of(context).pop();
      Notice.success(context, 'Server connected and saved');
    } catch (error) {
      if (!mounted) return;
      Notice.error(context, 'Address saved, but connection failed: ${errorMessage(error)}');
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 4,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Server URL',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          const Text(
              'Use localhost on desktop/web, 10.0.2.2 on an Android emulator, or your computer LAN IP on a physical phone.'),
          const SizedBox(height: 16),
          TextFormField(
            controller: _controller,
            keyboardType: TextInputType.url,
            decoration: InputDecoration(
              hintText: context.read<StorageService>().serverUrl,
              prefixIcon: Icon(Icons.dns_outlined, size: 20),
            ),
          ),
          const SizedBox(height: 20),
          PrimaryButton(label: 'Test & save', icon: Icons.dns_outlined, loading: _testing, onPressed: _save),
        ],
      ),
    );
  }
}
