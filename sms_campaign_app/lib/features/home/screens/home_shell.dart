import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../routes/app_routes.dart';
import '../../appointments/screens/appointments_screen.dart';
import '../../campaigns/screens/campaign_list_screen.dart';
import '../../contacts/screens/contact_list_screen.dart';
import '../../contacts/screens/group_list_screen.dart';
import '../../reports/screens/reports_screen.dart';
import '../../premium/screens/billing_sms_screen.dart';
import '../../premium/screens/geo_sms_screen.dart';
import '../../premium/screens/inbox_chat_screen.dart';
import '../../settings/screens/companies_screen.dart';
import '../../settings/screens/settings_screen.dart';
import '../../settings/screens/users_screen.dart';
import '../../sms/screens/send_sms_screen.dart';
import 'dashboard_screen.dart';
import 'landing_screen.dart';

class _Destination {
  const _Destination(this.label, this.icon, this.body);

  final String label;
  final IconData icon;
  final Widget body;
}

/// Responsive application shell. Phones get a compact bottom bar plus a
/// complete drawer; wider layouts keep every available destination visible.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  int _index = 0;
  bool _sidebarCollapsed = false;

  List<_Destination> _destinations(AuthProvider auth) => [
    _Destination(
      'Home',
      Icons.home_outlined,
      LandingScreen(onOpen: _selectDestination),
    ),
    if (auth.can('dashboard.view'))
      const _Destination(
        'Dashboard',
        Icons.bar_chart_outlined,
        DashboardScreen(),
      ),
    if (auth.can('campaign.view'))
      const _Destination(
        'Campaigns',
        Icons.send_outlined,
        CampaignListScreen(),
      ),
    if (auth.can('contact.view'))
      const _Destination('Contacts', Icons.phone_outlined, ContactListScreen()),
    if (auth.can('group.view'))
      const _Destination('Groups', Icons.people_outline, GroupListScreen()),
    if (auth.can('user.manage'))
      const _Destination(
        'Users',
        Icons.person_outline,
        UsersScreen(embedded: true),
      ),
    if (auth.can('company.manage'))
      const _Destination(
        'Companies',
        Icons.business_center_outlined,
        CompaniesScreen(embedded: true),
      ),
    if (auth.can('campaign.send') ||
        auth.can('group.send') ||
        auth.can('contact.send'))
      const _Destination(
        'Send SMS',
        Icons.chat_bubble_outline,
        SendSmsScreen(),
      ),
    if (auth.can('delivery.view'))
      const _Destination('Delivery', Icons.bar_chart_outlined, ReportsScreen()),
    if (auth.can('appointment.view'))
      const _Destination(
        'Appointments',
        Icons.event_outlined,
        AppointmentsScreen(embedded: true),
      ),
    const _Destination(
      'Inbox Chat',
      Icons.forum_outlined,
      InboxChatScreen(),
    ),
    if (auth.can('geo.send'))
      const _Destination(
        'Geo SMS',
        Icons.location_on_outlined,
        GeoSmsScreen(),
      ),
    if (auth.can('billing.send'))
      const _Destination(
        'Billing SMS',
        Icons.receipt_long_outlined,
        BillingSmsScreen(),
      ),
    const _Destination('Profile', Icons.person_outline, SettingsScreen()),
  ];

  Future<void> _logout(AuthProvider auth) async {
    await auth.logout();
    if (!mounted) return;
    Navigator.of(
      context,
    ).pushNamedAndRemoveUntil(AppRoutes.login, (_) => false);
  }

  void _select(int index) => setState(() => _index = index);

  void _selectDestination(String label) {
    final destinations = _destinations(context.read<AuthProvider>());
    final destinationIndex = destinations.indexWhere(
      (item) => item.label == label,
    );
    if (destinationIndex >= 0) _select(destinationIndex);
  }

  IconData _filledIcon(IconData icon) => switch (icon) {
    Icons.bar_chart_outlined => Icons.bar_chart,
    Icons.send_outlined => Icons.send,
    Icons.phone_outlined => Icons.phone,
    Icons.chat_bubble_outline => Icons.chat_bubble,
    _ => icon,
  };

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final destinations = _destinations(auth);
    final index = _index.clamp(0, destinations.length - 1);
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final isLanding = destinations[index].label == 'Home';
    final primary = <int>[
      for (var i = 0; i < destinations.length; i++)
        if ({
          'Dashboard',
          'Campaigns',
          'Contacts',
          'Send SMS',
        }.contains(destinations[i].label))
          i,
    ].take(4).toList();

    final content = ColoredBox(
      color: AppColors.background,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1280),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (child, animation) => FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0.025, 0),
                  end: Offset.zero,
                ).animate(animation),
                child: child,
              ),
            ),
            child: KeyedSubtree(
              key: ValueKey(destinations[index].label),
              child: destinations[index].body,
            ),
          ),
        ),
      ),
    );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (index != 0) {
          setState(() => _index = 0);
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
      key: _scaffoldKey,
      appBar: isLanding
          ? null
          : AppBar(
              automaticallyImplyLeading: !wide,
              leading: wide
                  ? IconButton(
                      tooltip: _sidebarCollapsed
                          ? 'Expand menu'
                          : 'Collapse menu',
                      icon: Icon(
                        _sidebarCollapsed
                            ? Icons.menu_open_rounded
                            : Icons.menu_rounded,
                      ),
                      onPressed: () => setState(
                        () => _sidebarCollapsed = !_sidebarCollapsed,
                      ),
                    )
                  : null,
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    destinations[index].label,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const Text(
                    'Afroel SMS Campaign Platform',
                    style: TextStyle(fontSize: 11, color: AppColors.muted),
                  ),
                ],
              ),
              actions: [
                PopupMenuButton<String>(
                  tooltip: 'Account',
                  onSelected: (value) {
                    if (value == 'logout') _logout(auth);
                    if (value == 'settings') {
                      _select(
                        destinations.indexWhere((d) => d.label == 'Profile'),
                      );
                    }
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(
                      value: 'settings',
                      child: Text('My profile'),
                    ),
                    PopupMenuItem(value: 'logout', child: Text('Log out')),
                  ],
                  child: Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 17,
                          backgroundColor: AppColors.softRed,
                          child: const Icon(
                            Icons.person_outline,
                            color: AppColors.primary,
                            size: 20,
                          ),
                        ),
                        if (MediaQuery.sizeOf(context).width >= 430) ...[
                          const SizedBox(width: 8),
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 120),
                            child: Text(
                              auth.user?.name ?? 'User',
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
      drawer: wide || isLanding
          ? null
          : Drawer(
              width: 210,
              child: _drawer(auth, destinations, index),
            ),
      body: isLanding
          ? SafeArea(child: content)
          : wide
          ? Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeOut,
                  width: _sidebarCollapsed ? 64 : 200,
                  child: _drawer(
                    auth,
                    destinations,
                    index,
                    closeDrawer: false,
                    collapsed: _sidebarCollapsed,
                  ),
                ),
                const VerticalDivider(width: 1),
                Expanded(child: content),
              ],
            )
          : content,
      bottomNavigationBar: isLanding || wide || !primary.contains(index)
          ? null
          : NavigationBar(
              selectedIndex: primary.indexOf(index),
              onDestinationSelected: (value) {
                _select(primary[value]);
              },
              destinations: [
                for (final i in primary)
                  NavigationDestination(
                    icon: Icon(destinations[i].icon),
                    selectedIcon: Icon(_filledIcon(destinations[i].icon)),
                    label: destinations[i].label,
                  ),
              ],
            ),
      ),
    );
  }

  Widget _drawer(
    AuthProvider auth,
    List<_Destination> destinations,
    int index, {
    bool closeDrawer = true,
    bool collapsed = false,
  }) {
    return SafeArea(
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.symmetric(
              horizontal: collapsed ? 8 : 20,
              vertical: 20,
            ),
            color: AppColors.softRed,
            child: collapsed
                ? const Center(
                    child: Text(
                      'A',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontSize: 23,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  )
                : const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'AFROEL',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontSize: 23,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        'SMS Campaign Platform',
                        style: TextStyle(color: AppColors.muted),
                      ),
                    ],
                  ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: destinations.length,
              itemBuilder: (_, i) => Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: collapsed ? 6 : 10,
                  vertical: 2,
                ),
                child: Tooltip(
                  message: collapsed ? destinations[i].label : '',
                  child: ListTile(
                    selected: i == index,
                    selectedColor: AppColors.white,
                    selectedTileColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    contentPadding: EdgeInsets.symmetric(
                      horizontal: collapsed ? 16 : 12,
                      vertical: 2,
                    ),
                    leading: Icon(destinations[i].icon, size: 21),
                    title: collapsed ? null : Text(destinations[i].label),
                    onTap: () {
                      if (closeDrawer) Navigator.of(context).pop();
                      _select(i);
                    },
                  ),
                ),
              ),
            ),
          ),
          const Divider(height: 1),
          ColoredBox(
            color: AppColors.white,
            child: Tooltip(
              message: collapsed ? 'Log out' : '',
              child: ListTile(
                contentPadding: EdgeInsets.symmetric(
                  horizontal: collapsed ? 24 : 16,
                  vertical: 4,
                ),
                leading: const Icon(Icons.logout, color: AppColors.primary),
                title: collapsed
                    ? null
                    : const Text(
                        'Log out',
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                onTap: () => _logout(auth),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
