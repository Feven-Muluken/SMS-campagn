import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Red gradient welcome header matching the React frontend auth panel
/// (linear-gradient 135deg #DF0A0A → #B91C1C → #991B1B → #7F1D1D with
/// faint decorative circles).
class AuthHeader extends StatelessWidget {
  const AuthHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.brandRed,
            AppColors.brandRedMid,
            AppColors.darkRed,
            AppColors.brandRedDeep,
          ],
          stops: [0.0, 0.4, 0.7, 1.0],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: 40,
            right: 30,
            child: _circle(140),
          ),
          Positioned(
            bottom: 30,
            left: 24,
            child: _circle(100),
          ),
          Positioned(
            top: 120,
            left: 150,
            child: _circle(64),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(
              24,
              MediaQuery.paddingOf(context).top + 44,
              24,
              44,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  'Welcome Back',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 34,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                    shadows: [
                      Shadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        offset: const Offset(2, 2),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Afroel',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.brandRedSoft,
                    fontSize: 22,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  "We're delighted to have you back. Sign in to continue "
                  'managing your SMS campaigns.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.brandRedSoft,
                    fontSize: 15,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _circle(double size) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          shape: BoxShape.circle,
        ),
      );
}
