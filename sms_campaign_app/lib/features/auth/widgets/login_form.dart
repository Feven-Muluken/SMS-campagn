import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/notice.dart';
import '../controllers/auth_controller.dart';
import '../widgets/auth_text_field.dart';

/// Email/password form styled after the React frontend (Auth.jsx):
/// underline inputs with placeholders, remember-me, red gradient-shadow
/// login button and an inline error box.
class LoginForm extends StatefulWidget {
  const LoginForm({super.key});

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _controller = AuthController();
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!_controller.validate()) return;
    final auth = context.read<AuthProvider>();
    final ok = await auth.login(
      email: _controller.emailController.text.trim(),
      password: _controller.passwordController.text,
      rememberMe: _controller.rememberMe,
    );
    if (!mounted) return;
    if (ok) {
      Navigator.of(context).pushReplacementNamed(AppRoutes.home);
    } else {
      setState(() => _error = auth.error ?? 'Invalid credentials');
    }
  }

  @override
  Widget build(BuildContext context) {
    final busy = context.watch<AuthProvider>().busy;
    return Form(
      key: _controller.formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.brandRedSoft,
                border: Border.all(color: AppColors.errorBorder),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                _error!,
                style: const TextStyle(color: AppColors.errorText, fontSize: 14),
              ),
            ),
            const SizedBox(height: 24),
          ],
          AuthTextField(
            label: 'Email',
            placeholder: 'Email',
            controller: _controller.emailController,
            validator: _controller.validateEmail,
            keyboardType: TextInputType.emailAddress,
            suffix: const Icon(Icons.mail_outline,
                color: AppColors.muted, size: 20),
          ),
          const SizedBox(height: 24),
          AuthTextField(
            label: 'Password',
            placeholder: 'Password',
            controller: _controller.passwordController,
            validator: _controller.validatePassword,
            obscureText: _obscure,
            onSubmitted: (_) => _submit(),
            suffix: IconButton(
              icon: Icon(
                _obscure
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                color: AppColors.muted,
                size: 20,
              ),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: Checkbox(
                  value: _controller.rememberMe,
                  activeColor: AppColors.brandRed,
                  side: const BorderSide(color: AppColors.fieldBorder),
                  onChanged: (v) =>
                      setState(() => _controller.rememberMe = v ?? false),
                ),
              ),
              const SizedBox(width: 8),
              const Text('Remember me',
                  style: TextStyle(color: AppColors.muted, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: () =>
                  Navigator.of(context).pushNamed(AppRoutes.forgotPassword),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.brandRed,
                padding: const EdgeInsets.symmetric(horizontal: 4),
              ),
              child: const Text('Forget Password',
                  style: TextStyle(fontSize: 14)),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: busy ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.brandRed,
              foregroundColor: Colors.white,
              disabledBackgroundColor:
                  AppColors.brandRed.withValues(alpha: 0.6),
              padding: const EdgeInsets.symmetric(vertical: 16),
              elevation: 8,
              shadowColor: AppColors.brandRed.withValues(alpha: 0.3),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: busy
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2),
                  )
                : const Text('Login',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 16),
          Center(
            child: GestureDetector(
              onTap: () => Notice.info(
                  context, 'Accounts are created by your administrator.'),
              child: const Text.rich(
                TextSpan(
                  style: TextStyle(color: AppColors.muted, fontSize: 14),
                  children: [
                    TextSpan(text: "Don't have an account? "),
                    TextSpan(
                      text: 'Register',
                      style: TextStyle(
                        color: AppColors.brandRed,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
