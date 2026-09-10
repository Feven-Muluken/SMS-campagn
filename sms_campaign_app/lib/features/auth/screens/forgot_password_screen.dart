import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/utils/validators.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';
import '../widgets/auth_header.dart';
import 'reset_otp_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    final challenge = await context.read<AuthProvider>().forgotPassword(
      _email.text.trim(),
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (challenge == null) {
      Notice.error(
        context,
        context.read<AuthProvider>().error ??
            'Could not send verification code',
      );
      return;
    }
    Notice.info(context, challenge.message);
    Navigator.of(context).pushReplacementNamed(
      AppRoutes.verifyResetOtp,
      arguments: ResetOtpArguments(
        email: _email.text.trim(),
        verificationToken: challenge.verificationToken,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const AuthHeader(),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Enter your account email and we will send you a six-digit verification code.',
                      ),
                      const SizedBox(height: 24),
                      AppTextField(
                        label: 'Email',
                        hint: 'Enter your account email',
                        controller: _email,
                        validator: Validators.email,
                        keyboardType: TextInputType.emailAddress,
                        prefixIcon: Icons.mail_outline,
                      ),
                      const SizedBox(height: 24),
                      PrimaryButton(
                        label: 'Send verification code',
                        icon: Icons.send_outlined,
                        loading: _busy,
                        onPressed: _submit,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
