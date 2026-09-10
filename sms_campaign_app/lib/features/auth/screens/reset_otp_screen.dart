import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../data/providers/auth_provider.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/app_text_field.dart';
import '../../../widgets/notice.dart';
import '../../../widgets/primary_button.dart';
import '../widgets/auth_header.dart';

class ResetOtpArguments {
  const ResetOtpArguments({
    required this.email,
    required this.verificationToken,
  });

  final String email;
  final String verificationToken;
}

class ResetOtpScreen extends StatefulWidget {
  const ResetOtpScreen({super.key, required this.arguments});

  final ResetOtpArguments arguments;

  @override
  State<ResetOtpScreen> createState() => _ResetOtpScreenState();
}

class _ResetOtpScreenState extends State<ResetOtpScreen> {
  final _otpKey = GlobalKey<FormState>();
  final _passwordKey = GlobalKey<FormState>();
  final _otp = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  bool _busy = false;
  String? _resetToken;
  late String _verificationToken;
  Timer? _resendTimer;
  int _resendSeconds = 60;
  bool _hidePassword = true;
  bool _hideConfirmation = true;

  @override
  void initState() {
    super.initState();
    _verificationToken = widget.arguments.verificationToken;
    _startResendTimer();
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    _otp.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  void _startResendTimer({bool reset = false}) {
    _resendTimer?.cancel();
    if (reset) setState(() => _resendSeconds = 60);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return timer.cancel();
      if (_resendSeconds <= 1) {
        timer.cancel();
        setState(() => _resendSeconds = 0);
      } else {
        setState(() => _resendSeconds -= 1);
      }
    });
  }

  Future<void> _resend() async {
    if (_busy || _resendSeconds > 0) return;
    setState(() => _busy = true);
    final provider = context.read<AuthProvider>();
    final challenge = await provider.forgotPassword(widget.arguments.email);
    if (!mounted) return;
    setState(() => _busy = false);
    if (challenge == null) {
      Notice.error(context, provider.error ?? 'Could not resend the code');
      return;
    }
    _verificationToken = challenge.verificationToken;
    _otp.clear();
    _startResendTimer(reset: true);
    Notice.success(context, 'A new verification code was sent.');
  }

  Future<void> _verify() async {
    if (!(_otpKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    final provider = context.read<AuthProvider>();
    final token = await provider.verifyResetOtp(
      _verificationToken,
      _otp.text.trim(),
    );
    if (!mounted) return;
    setState(() {
      _busy = false;
      _resetToken = token;
    });
    if (token != null) _resendTimer?.cancel();
    if (token == null) {
      Notice.error(context, provider.error ?? 'Code verification failed');
    }
  }

  Future<void> _reset() async {
    if (!(_passwordKey.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    final provider = context.read<AuthProvider>();
    final ok = await provider.resetPassword(_resetToken!, _password.text);
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      Notice.error(context, provider.error ?? 'Password reset failed');
      return;
    }
    Notice.success(context, 'Password changed. You can now sign in.');
    Navigator.of(
      context,
    ).pushNamedAndRemoveUntil(AppRoutes.login, (_) => false);
  }

  String? _validateOtp(String? value) =>
      RegExp(r'^\d{6}$').hasMatch(value?.trim() ?? '')
      ? null
      : 'Enter the six-digit code';

  String? _validatePassword(String? value) => (value?.length ?? 0) >= 6
      ? null
      : 'Password must be at least 6 characters';

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AuthHeader(),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
              child: _resetToken == null ? _otpForm() : _passwordForm(),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _otpForm() => Form(
    key: _otpKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Enter the verification code sent to ${widget.arguments.email}.'),
        const SizedBox(height: 24),
        AppTextField(
          label: 'Verification code',
          hint: 'Enter the 6-digit code',
          controller: _otp,
          validator: _validateOtp,
          keyboardType: TextInputType.number,
          maxLength: 6,
          prefixIcon: Icons.password_outlined,
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: _resendSeconds == 0 && !_busy ? _resend : null,
            child: Text(
              _resendSeconds > 0
                  ? 'Resend code in ${_resendSeconds}s'
                  : 'Resend code',
            ),
          ),
        ),
        const SizedBox(height: 20),
        PrimaryButton(label: 'Verify code', loading: _busy, onPressed: _verify),
      ],
    ),
  );

  Widget _passwordForm() => Form(
    key: _passwordKey,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Code verified. Create a new password.'),
        const SizedBox(height: 24),
        AppTextField(
          label: 'New password',
          hint: 'Enter at least 6 characters',
          controller: _password,
          validator: _validatePassword,
          obscureText: _hidePassword,
          prefixIcon: Icons.lock_outline,
          suffix: IconButton(
            tooltip: _hidePassword ? 'Show password' : 'Hide password',
            onPressed: () => setState(() => _hidePassword = !_hidePassword),
            icon: Icon(
              _hidePassword
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
          ),
        ),
        const SizedBox(height: 16),
        AppTextField(
          label: 'Confirm password',
          hint: 'Enter the password again',
          controller: _confirmPassword,
          obscureText: _hideConfirmation,
          validator: (value) =>
              value == _password.text ? null : 'Passwords do not match',
          prefixIcon: Icons.lock_reset_outlined,
          suffix: IconButton(
            tooltip: _hideConfirmation ? 'Show password' : 'Hide password',
            onPressed: () =>
                setState(() => _hideConfirmation = !_hideConfirmation),
            icon: Icon(
              _hideConfirmation
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
            ),
          ),
        ),
        const SizedBox(height: 20),
        PrimaryButton(
          label: 'Change password',
          loading: _busy,
          onPressed: _reset,
        ),
      ],
    ),
  );
}
