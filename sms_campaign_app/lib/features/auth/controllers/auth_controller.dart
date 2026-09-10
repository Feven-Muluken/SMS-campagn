import 'package:flutter/material.dart';

import '../../../core/utils/validators.dart';

/// Form-level logic for the auth screens, kept out of the widgets.
class AuthController {
  final formKey = GlobalKey<FormState>();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  bool rememberMe = false;

  String? validateEmail(String? value) => Validators.email(value);

  String? validatePassword(String? value) =>
      Validators.required(value, 'Password');

  bool validate() => formKey.currentState?.validate() ?? false;

  void dispose() {
    emailController.dispose();
    passwordController.dispose();
  }
}
