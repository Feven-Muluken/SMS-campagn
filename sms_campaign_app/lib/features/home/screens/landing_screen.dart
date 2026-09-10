import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../widgets/animated_entry.dart';
import '../../../widgets/interactive_card.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key, required this.onOpen});

  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final actions = <({String label, String description, IconData icon})>[
      if (auth.can('dashboard.view'))
        (label: 'Dashboard', description: 'View analytics, stats, and manage the platform', icon: Icons.bar_chart_outlined),
      if (auth.can('campaign.view'))
        (label: 'Campaigns', description: 'Create and manage your SMS campaigns', icon: Icons.send_outlined),
      if (auth.can('campaign.send') ||
          auth.can('group.send') ||
          auth.can('contact.send'))
        (label: 'Send SMS', description: 'Send messages to contacts or groups', icon: Icons.chat_bubble_outline),
      if (auth.can('contact.view'))
        (label: 'Contacts', description: 'Manage your contact list', icon: Icons.people_outline),
      if (auth.can('group.view'))
        (label: 'Groups', description: 'Organize contacts into groups', icon: Icons.people_outline),
      if (auth.can('user.manage'))
        (label: 'Users', description: 'Manage platform users', icon: Icons.person_outline),
      if (auth.can('company.manage'))
        (label: 'Companies', description: 'Create companies and configure access', icon: Icons.business_center_outlined),
      if (auth.can('appointment.view'))
        (label: 'Appointments', description: 'Create appointments and automate SMS reminders', icon: Icons.event_outlined),
      (label: 'Inbox Chat', description: 'Read customer replies and continue conversations', icon: Icons.forum_outlined),
      if (auth.can('geo.send'))
        (label: 'Geo SMS', description: 'Send SMS to contacts inside a geographic radius', icon: Icons.location_on_outlined),
      if (auth.can('billing.send'))
        (label: 'Billing SMS', description: 'Send invoice, payment, and overdue alerts', icon: Icons.receipt_long_outlined),
    ];

    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 28, 16, 32),
        children: [
          AnimatedEntry(
            index: 0,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome back, ${auth.user?.name ?? 'User'}!',
                  style: const TextStyle(
                    color: AppColors.heading,
                    fontSize: 24,
                    height: 1.15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Manage your SMS campaigns efficiently with Afroel',
                  style: TextStyle(color: AppColors.fieldLabel, fontSize: 16),
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),
          LayoutBuilder(builder: (context, constraints) {
            final columns = constraints.maxWidth >= 900 ? 3 : constraints.maxWidth >= 560 ? 2 : 1;
            final width = (constraints.maxWidth - 16 * (columns - 1)) / columns;
            return Wrap(
              spacing: 16,
              runSpacing: 16,
              children: [
                for (var i = 0; i < actions.length; i++)
                  AnimatedEntry(
                    index: i + 1,
                    delayStep: const Duration(milliseconds: 90),
                    child: SizedBox(
                      width: width,
                      child: InteractiveCard(
                        onTap: () => onOpen(actions[i].label),
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppColors.softRed,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(actions[i].icon,
                                        color: AppColors.fieldLabel, size: 20),
                                  ),
                                  const Icon(Icons.arrow_forward, color: AppColors.gray400, size: 21),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Text(actions[i].label,
                                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 6),
                              Text(actions[i].description,
                                  style: const TextStyle(color: AppColors.fieldLabel, fontSize: 14)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            );
          }),
        ],
      ),
    );
  }
}
