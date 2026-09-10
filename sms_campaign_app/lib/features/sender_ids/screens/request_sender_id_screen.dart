import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/utils/validators.dart';
import '../../../data/providers/sender_id_provider.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';

/// Form to request a new sender ID (1-11 alphanumeric, stored as pending).
class RequestSenderIdScreen extends StatefulWidget {
  const RequestSenderIdScreen({super.key});

  @override
  State<RequestSenderIdScreen> createState() => _RequestSenderIdScreenState();
}

class _RequestSenderIdScreenState extends State<RequestSenderIdScreen> {
  final _formKey = GlobalKey<FormState>();
  final _senderId = TextEditingController();
  final _reason = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _senderId.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    final error = await context
        .read<SenderIdProvider>()
        .request(_senderId.text.trim().toUpperCase(), reason: _reason.text.trim());
    if (!mounted) return;
    setState(() => _busy = false);
    if (error != null) {
      Notice.error(context, error);
    } else {
      Notice.success(context, 'Request submitted for review');
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Request sender ID')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'A sender ID is the name recipients see instead of a phone '
                'number. Use 1-11 letters or digits, no spaces. Letters are '
                'saved in uppercase and the name must be unique across the platform.',
              ),
              const SizedBox(height: 20),
              AppTextField(
                label: 'Sender ID',
                controller: _senderId,
                validator: Validators.senderId,
                hint: 'e.g. AFROEL',
                prefixIcon: Icons.badge_outlined,
              ),
              const SizedBox(height: 14),
              AppTextField(
                label: 'Reason (optional)',
                controller: _reason,
                hint: 'How your company will use this sender ID',
                prefixIcon: Icons.notes_outlined,
                maxLines: 3,
                maxLength: 255,
              ),
              const SizedBox(height: 24),
              PrimaryButton(
                label: 'Submit request',
                icon: Icons.send_outlined,
                loading: _busy,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
