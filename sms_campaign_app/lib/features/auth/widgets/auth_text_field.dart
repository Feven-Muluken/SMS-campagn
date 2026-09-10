import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Underline-style auth field matching the React frontend inputs:
/// label above, transparent background, 2px bottom border, right icon.
class AuthTextField extends StatelessWidget {
  const AuthTextField({
    super.key,
    required this.label,
    required this.placeholder,
    this.controller,
    this.validator,
    this.keyboardType,
    this.obscureText = false,
    this.suffix,
    this.onSubmitted,
  });

  final String label;
  final String placeholder;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final bool obscureText;
  final Widget? suffix;
  final ValueChanged<String>? onSubmitted;

  static const _border = UnderlineInputBorder(
    borderSide: BorderSide(color: AppColors.fieldBorder, width: 2),
  );

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.fieldLabel,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 4),
        TextFormField(
          controller: controller,
          validator: validator,
          keyboardType: keyboardType,
          obscureText: obscureText,
          onFieldSubmitted: onSubmitted,
          style: const TextStyle(color: AppColors.fieldText, fontSize: 14),
          decoration: InputDecoration(
            hintText: placeholder,
            hintStyle: const TextStyle(color: AppColors.muted, fontSize: 14),
            suffixIcon: suffix,
            isDense: true,
            contentPadding: const EdgeInsets.only(left: 8, top: 8, bottom: 8),
            filled: false,
            enabledBorder: _border,
            focusedBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: AppColors.brandRed, width: 2),
            ),
            errorBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: AppColors.errorText, width: 2),
            ),
            focusedErrorBorder: const UnderlineInputBorder(
              borderSide: BorderSide(color: AppColors.errorText, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}
