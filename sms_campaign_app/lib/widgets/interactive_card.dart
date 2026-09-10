import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

/// Simple shared interactive surface with a clear border and ink feedback.
class InteractiveCard extends StatefulWidget {
  const InteractiveCard({
    super.key,
    required this.child,
    this.onTap,
    this.borderRadius = 12,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double borderRadius;

  @override
  State<InteractiveCard> createState() => _InteractiveCardState();
}

class _InteractiveCardState extends State<InteractiveCard> {
  bool _hovered = false;
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final active = _hovered && !_pressed;
    return MouseRegion(
      cursor: widget.onTap == null ? MouseCursor.defer : SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedScale(
        scale: _pressed ? 0.985 : 1,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOutCubic,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            border: Border.all(
              color: active ? AppColors.fieldBorder : AppColors.border,
            ),
          ),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: widget.onTap,
              onHighlightChanged: (value) => setState(() => _pressed = value),
              overlayColor: WidgetStateProperty.resolveWith((states) =>
                  states.contains(WidgetState.pressed)
                      ? AppColors.softRed.withValues(alpha: 0.42)
                      : null),
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}
