import 'package:flutter/material.dart';

/// Color tokens used by the React frontend's Tailwind theme.
abstract final class AppColors {
  static const Color primary = Color(0xffDF0A0A);
  static const Color primaryHover = Color(0xffB91C1C);
  static const Color darkRed = Color(0xff991B1B);
  static const Color primaryDeep = Color(0xff7F1D1D);
  static const Color softRed = Color(0xffFEE2E2);

  static const Color white = Color(0xffFFFFFF);
  static const Color background = Color(0xffF9FAFB);
  static const Color gray100 = Color(0xffF3F4F6);
  static const Color border = Color(0xffE5E7EB);
  static const Color fieldBorder = Color(0xffD1D5DB);
  static const Color gray400 = Color(0xff9CA3AF);
  static const Color muted = Color(0xff6B7280);
  static const Color fieldLabel = Color(0xff4B5563);
  static const Color ink = Color(0xff1F2937);
  static const Color heading = Color(0xff111827);
  static const Color fieldText = Color(0xff0F0D1D);

  static const Color success = Color(0xff15803D);
  static const Color successSoft = Color(0xffDCFCE7);
  static const Color warning = Color(0xffB45309);
  static const Color warningSoft = Color(0xffFEF3C7);

  // Auth palette matching the React frontend (frontend/src/pages/Auth.jsx).
  static const Color brandRed = Color(0xffDF0A0A);
  static const Color brandRedMid = primaryHover;
  static const Color brandRedDeep = primaryDeep;
  static const Color brandRedSoft = Color(0xffFEE2E2);
  static const Color errorBorder = Color(0xffFCA5A5);
  static const Color errorText = Color(0xff991B1B);
}
