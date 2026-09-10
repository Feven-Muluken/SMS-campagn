import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Accessible status filter with explicit contrast in both visual states.
class StatusFilterChip extends StatelessWidget {
  const StatusFilterChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      showCheckmark: false,
      backgroundColor: AppColors.white,
      selectedColor: AppColors.primary,
      side: BorderSide(
        color: selected ? AppColors.primary : AppColors.fieldBorder,
      ),
      labelStyle: TextStyle(
        color: selected ? AppColors.white : AppColors.ink,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}
