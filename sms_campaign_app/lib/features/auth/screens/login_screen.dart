import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/server_url_sheet.dart';
import '../widgets/auth_header.dart';
import '../widgets/login_form.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
          final wide = constraints.maxWidth >= 760;
          final form = SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: wide ? 48 : 24,
              vertical: wide ? 56 : 32,
            ),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Login',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Afroel SMS Campaign Platform',
                      style: TextStyle(fontSize: 14, color: AppColors.muted),
                    ),
                    const SizedBox(height: 32),
                    const LoginForm(),
                    const SizedBox(height: 24),
                    Center(
                      child: TextButton.icon(
                        onPressed: () => showServerUrlSheet(context),
                        icon: const Icon(Icons.settings_ethernet, size: 18),
                        label: const Text('Configure server URL'),
                        style: TextButton.styleFrom(
                          foregroundColor: AppColors.muted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
          if (wide) {
            return Row(children: [
              const Expanded(
                child: AnimatedEntry(
                  index: 0,
                  child: SizedBox.expand(child: AuthHeader()),
                ),
              ),
              Expanded(child: AnimatedEntry(index: 1, child: form)),
            ]);
          }
          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const AnimatedEntry(index: 0, child: AuthHeader()),
                AnimatedEntry(index: 1, child: form),
              ],
            ),
          );
          },
        ),
      ),
    );
  }
}
