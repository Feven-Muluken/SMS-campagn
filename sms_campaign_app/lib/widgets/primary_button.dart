import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Primary red action button with a subtle press-scale state and optional
/// loading spinner.
class PrimaryButton extends StatefulWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.loading = false,
    this.icon,
    this.outlined = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;
  final bool outlined;

  @override
  State<PrimaryButton> createState() => _PrimaryButtonState();
}

class _PrimaryButtonState extends State<PrimaryButton> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null && !widget.loading;
    return GestureDetector(
      onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
      onTapCancel: enabled ? () => setState(() => _pressed = false) : null,
      onTapUp: enabled ? (_) => setState(() => _pressed = false) : null,
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1,
        duration: const Duration(milliseconds: 120),
        child: SizedBox(
          width: double.infinity,
          height: 50,
          child: widget.outlined
              ? OutlinedButton.icon(
                  onPressed: enabled ? widget.onPressed : null,
                  icon: _leading(AppColors.primary),
                  label: _label(AppColors.primary),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                )
              : FilledButton.icon(
                  onPressed: enabled ? widget.onPressed : null,
                  icon: _leading(Colors.white),
                  label: _label(Colors.white),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.4),
                    shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
        ),
      ),
    );
  }

  Widget _leading(Color color) {
    if (widget.loading) {
      return SizedBox(
        width: 18,
        height: 18,
        child: CircularProgressIndicator(strokeWidth: 2, color: color),
      );
    }
    return Icon(widget.icon, size: 18);
  }

  Widget _label(Color color) => Text(
        widget.label,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          color: widget.loading ? color : null,
        ),
      );
}
