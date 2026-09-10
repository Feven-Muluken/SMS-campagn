import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/services/api_service.dart';
import '../../../data/models/contact.dart';
import '../../../data/models/inbox_conversation.dart';
import '../../../data/models/internal_conversation.dart';
import '../../../data/models/message.dart';
import '../../../data/providers/auth_provider.dart';
import '../../../data/providers/sender_id_provider.dart';
import '../../../data/repositories/sms_repository.dart';
import '../../../widgets/notice.dart';

class InboxChatScreen extends StatelessWidget {
  const InboxChatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final platformUser =
        context.watch<AuthProvider>().user?.accountScope == 'platform';
    if (platformUser) return const _InternalInboxScreen();
    return const DefaultTabController(
      length: 2,
      child: Column(
        children: [
          TabBar(
            dividerColor: AppColors.border,
            dividerHeight: 0.6,
            indicatorColor: AppColors.primary,
            indicatorSize: TabBarIndicatorSize.tab,
            tabs: [
              Tab(text: 'Internal'),
              Tab(text: 'Contact Chat'),
            ],
          ),
          Expanded(
            child: TabBarView(
              children: [_InternalInboxScreen(), _ContactInboxScreen()],
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactInboxScreen extends StatefulWidget {
  const _ContactInboxScreen();

  @override
  State<_ContactInboxScreen> createState() => _ContactInboxScreenState();
}

class _ContactInboxScreenState extends State<_ContactInboxScreen> {
  final _search = TextEditingController();
  List<InboxConversation> _conversations = const [];
  Timer? _timer;
  bool _loading = true;
  String? _error;
  String _status = 'active';

  @override
  void initState() {
    super.initState();
    _load();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SenderIdProvider>().loadApproved();
    });
    _timer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent && mounted) setState(() => _loading = true);
    try {
      final rows = await context.read<SmsRepository>().inboxConversations(
        search: _search.text,
        status: _status,
      );
      if (!mounted) return;
      setState(() {
        _conversations = rows;
        _error = null;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || silent) return;
      setState(() {
        _error = 'Could not load conversations';
        _loading = false;
      });
    }
  }

  Future<void> _startConversation() async {
    final contacts = await context.read<SmsRepository>().inboxContacts();
    if (!mounted) return;
    final senderIds = context.read<SenderIdProvider>().approved;
    final selection =
        await showModalBottomSheet<({Contact contact, String? senderId})>(
          context: context,
          isScrollControlled: true,
          showDragHandle: true,
          builder: (_) => _StartConversationSheet(
            contacts: contacts,
            senderIds: senderIds.map((e) => e.senderId).toList(),
          ),
        );
    if (selection == null || !mounted) return;
    try {
      final conversation = await context
          .read<SmsRepository>()
          .startInboxConversation(
            selection.contact.id,
            senderId: selection.senderId,
          );
      if (!mounted) return;
      await _openConversation(conversation);
    } catch (_) {
      if (mounted) Notice.error(context, 'Could not start the conversation.');
    }
  }

  Future<void> _openConversation(InboxConversation conversation) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => _ConversationScreen(conversation: conversation),
      ),
    );
    if (mounted) await _load();
  }

  @override
  Widget build(BuildContext context) {
    const canReply = true;
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: canReply
          ? FloatingActionButton.extended(
              onPressed: _startConversation,
              icon: const Icon(Icons.add_comment_outlined),
              label: const Text('Start'),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _search,
                    textInputAction: TextInputAction.search,
                    onChanged: (_) => setState(() {}),
                    onSubmitted: (_) => _load(),
                    decoration: InputDecoration(
                      hintText: 'Search customer or phone',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _search.text.isEmpty
                          ? null
                          : IconButton(
                              onPressed: () {
                                _search.clear();
                                _load();
                              },
                              icon: const Icon(Icons.clear),
                            ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                PopupMenuButton<String>(
                  tooltip: 'Inbox menu',
                  initialValue: _status,
                  icon: Badge(
                    isLabelVisible: _status != 'active',
                    smallSize: 7,
                    child: const Icon(Icons.more_vert),
                  ),
                  onSelected: (value) {
                    setState(() => _status = value);
                    _load();
                  },
                  itemBuilder: (_) => [
                    for (final value in const ['active', 'archived', 'all'])
                      PopupMenuItem(
                        value: value,
                        child: Row(
                          children: [
                            Icon(
                              _status == value
                                  ? Icons.radio_button_checked
                                  : Icons.radio_button_unchecked,
                              size: 18,
                            ),
                            const SizedBox(width: 10),
                            Text(_title(value)),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: TextButton.icon(
          onPressed: _load,
          icon: const Icon(Icons.refresh),
          label: Text(_error!),
        ),
      );
    }
    final term = _search.text.trim().toLowerCase();
    final conversations = _conversations
        .where(
          (item) =>
              term.isEmpty ||
              item.title.toLowerCase().contains(term) ||
              item.customerPhone.toLowerCase().contains(term) ||
              (item.lastMessage?.content.toLowerCase().contains(term) ?? false),
        )
        .toList();
    if (conversations.isEmpty) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const SizedBox(height: 110),
            const Icon(Icons.forum_outlined, size: 42, color: AppColors.muted),
            const SizedBox(height: 12),
            Center(
              child: Text(
                term.isEmpty
                    ? 'No customer conversations yet.'
                    : 'No conversations match your search.',
              ),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: conversations.length,
        separatorBuilder: (_, _) => const Divider(
          height: 1,
          thickness: 0.6,
          indent: 72,
          endIndent: 12,
          color: AppColors.border,
        ),
        itemBuilder: (_, index) {
          final item = conversations[index];
          final unread = item.unreadCount > 0;
          return ListTile(
            leading: CircleAvatar(
              backgroundColor: unread ? AppColors.softRed : AppColors.gray100,
              child: Text(item.title.characters.first.toUpperCase()),
            ),
            title: Text(
              item.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontWeight: unread ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
            subtitle: Text(
              item.lastMessage?.content ?? item.customerPhone,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  Formatters.time(item.lastMessageAt),
                  style: const TextStyle(fontSize: 10, color: AppColors.muted),
                ),
                if (unread)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 7,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${item.unreadCount}',
                      style: const TextStyle(color: Colors.white, fontSize: 10),
                    ),
                  ),
              ],
            ),
            onTap: () => _openConversation(item),
          );
        },
      ),
    );
  }
}

class _InternalInboxScreen extends StatefulWidget {
  const _InternalInboxScreen();

  @override
  State<_InternalInboxScreen> createState() => _InternalInboxScreenState();
}

class _InternalInboxScreenState extends State<_InternalInboxScreen> {
  final _search = TextEditingController();
  List<InternalConversation> _threads = const [];
  bool _loading = true;
  String _status = 'active';
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final rows = await context.read<SmsRepository>().internalConversations(
        status: _status,
      );
      if (mounted) {
        setState(() {
          _threads = rows;
          _loading = false;
        });
      }
    } catch (error) {
      if (!silent && mounted) {
        setState(() => _loading = false);
        Notice.error(context, errorMessage(error));
      }
    }
  }

  Future<void> _start() async {
    List<InternalRecipient> recipients;
    try {
      recipients = await context.read<SmsRepository>().internalRecipients();
    } catch (error) {
      if (mounted) Notice.error(context, errorMessage(error));
      return;
    }
    if (recipients.isEmpty || !mounted) {
      if (mounted) Notice.error(context, 'No available user to chat with.');
      return;
    }
    final selection =
        await showModalBottomSheet<
          ({InternalRecipient recipient, String message})
        >(
          context: context,
          isScrollControlled: true,
          showDragHandle: true,
          builder: (_) =>
              _StartInternalConversationSheet(recipients: recipients),
        );
    if (selection != null && mounted) {
      try {
        final thread = await context
            .read<SmsRepository>()
            .startInternalConversation(
              message: selection.message,
              recipientUserId: selection.recipient.id,
              companyId: selection.recipient.companyId,
            );
        if (!mounted) return;
        await Navigator.push(
          context,
          MaterialPageRoute<void>(
            builder: (_) => _InternalConversationScreen(conversation: thread),
          ),
        );
        await _load();
      } catch (error) {
        if (mounted) {
          Notice.error(context, errorMessage(error));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final currentUserId = context.watch<AuthProvider>().user?.id;
    final term = _search.text.trim().toLowerCase();
    final threads = _threads.where((thread) {
      if (term.isEmpty) return true;
      return thread.creatorName.toLowerCase().contains(term) ||
          thread.recipientName.toLowerCase().contains(term) ||
          thread.creatorCompanyName.toLowerCase().contains(term) ||
          thread.recipientCompanyName.toLowerCase().contains(term) ||
          (thread.lastMessage?.content.toLowerCase().contains(term) ?? false);
    }).toList();
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _start,
        icon: const Icon(Icons.support_agent_outlined),
        label: const Text('Support'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _search,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      hintText: 'Search chats, people, or companies',
                      prefixIcon: const Icon(Icons.search, size: 20),
                      suffixIcon: _search.text.isEmpty
                          ? null
                          : IconButton(
                              onPressed: () {
                                _search.clear();
                                setState(() {});
                              },
                              icon: const Icon(Icons.clear),
                            ),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                PopupMenuButton<String>(
                  tooltip: 'Conversation status',
                  initialValue: _status,
                  icon: Badge(
                    isLabelVisible: _status != 'active',
                    smallSize: 7,
                    child: const Icon(Icons.more_vert),
                  ),
                  onSelected: (value) {
                    setState(() {
                      _status = value;
                      _loading = true;
                    });
                    _load();
                  },
                  itemBuilder: (_) => [
                    for (final value in const ['active', 'archived', 'all'])
                      PopupMenuItem(
                        value: value,
                        child: Row(
                          children: [
                            Icon(
                              _status == value
                                  ? Icons.radio_button_checked
                                  : Icons.radio_button_unchecked,
                              size: 18,
                            ),
                            const SizedBox(width: 10),
                            Text(_title(value)),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: threads.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        const SizedBox(height: 100),
                        const Icon(
                          Icons.support_agent,
                          size: 44,
                          color: AppColors.muted,
                        ),
                        const SizedBox(height: 12),
                        Center(
                          child: Text(
                            term.isEmpty
                                ? _status == 'archived'
                                      ? 'No archived conversations.'
                                      : 'No internal conversations yet.'
                                : 'No chats match your search.',
                          ),
                        ),
                      ],
                    )
                  : ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      itemCount: threads.length,
                      padding: const EdgeInsets.fromLTRB(0, 4, 0, 88),
                      separatorBuilder: (_, _) => const SizedBox.shrink(),
                      itemBuilder: (_, index) {
                        final thread = threads[index];
                        final createdByCurrent =
                            currentUserId == thread.creatorId;
                        final name = createdByCurrent
                            ? thread.recipientName
                            : thread.creatorName;
                        final scope = createdByCurrent
                            ? thread.recipientScope
                            : thread.creatorScope;
                        final company = createdByCurrent
                            ? thread.recipientCompanyName
                            : thread.creatorCompanyName;
                        final role = createdByCurrent
                            ? thread.recipientRole
                            : thread.creatorRole;
                        final unread = thread.unreadCount > 0;
                        return Card(
                          margin: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 5,
                          ),
                          child: ListTile(
                            leading: CircleAvatar(
                              child: Icon(
                                scope == 'platform'
                                    ? Icons.support_agent_outlined
                                    : Icons.person_outline,
                              ),
                            ),
                            title: Text(
                              name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontWeight: unread
                                    ? FontWeight.w800
                                    : FontWeight.w600,
                              ),
                            ),
                            subtitle: Text(
                              '${_identityLabel(scope, company, role)}\n'
                              '${thread.lastMessage?.content ?? ''}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  Formatters.time(thread.lastMessageAt),
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: AppColors.muted,
                                  ),
                                ),
                                if (unread)
                                  Container(
                                    margin: const EdgeInsets.only(top: 4),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 7,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      '${thread.unreadCount}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            onTap: () async {
                              await Navigator.push(
                                context,
                                MaterialPageRoute<void>(
                                  builder: (_) => _InternalConversationScreen(
                                    conversation: thread,
                                  ),
                                ),
                              );
                              if (mounted) _load();
                            },
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InternalConversationScreen extends StatefulWidget {
  const _InternalConversationScreen({required this.conversation});
  final InternalConversation conversation;

  @override
  State<_InternalConversationScreen> createState() =>
      _InternalConversationScreenState();
}

class _InternalConversationScreenState
    extends State<_InternalConversationScreen> {
  final _message = TextEditingController();
  List<InternalMessage> _messages = const [];
  Timer? _timer;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(
      const Duration(seconds: 4),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _message.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final rows = await context.read<SmsRepository>().internalMessages(
        widget.conversation.id,
      );
      if (mounted) setState(() => _messages = rows);
    } catch (error) {
      if (!silent && mounted) {
        Notice.error(context, errorMessage(error));
      }
    }
  }

  Future<void> _send() async {
    final text = _message.text.trim();
    if (text.isEmpty) return;
    final currentUser = context.read<AuthProvider>().user;
    setState(() => _sending = true);
    try {
      final sent = await context.read<SmsRepository>().sendInternalMessage(
        widget.conversation.id,
        text,
      );
      _message.clear();
      if (mounted) setState(() => _messages = [..._messages, sent]);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _messages = [
            ..._messages,
            InternalMessage(
              id: 'failed-${DateTime.now().microsecondsSinceEpoch}',
              creatorId: '',
              recipientId: '',
              senderId: currentUser?.id ?? '',
              senderName: currentUser?.name ?? 'You',
              content: text,
              createdAt: DateTime.now(),
              deliveryState: 'failed',
            ),
          ],
        );
        Notice.error(context, errorMessage(error));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _changeConversationStatus(String status) async {
    try {
      await context.read<SmsRepository>().updateInternalConversationStatus(
        widget.conversation.id,
        status,
      );
      if (mounted) Navigator.of(context).pop();
    } catch (error) {
      if (mounted) Notice.error(context, errorMessage(error));
    }
  }

  Future<void> _deleteConversation() async {
    final confirmed = await _confirmConversationDelete(context);
    if (!confirmed || !mounted) return;
    try {
      await context.read<SmsRepository>().deleteInternalConversation(
        widget.conversation.id,
      );
      if (mounted) Navigator.of(context).pop();
    } catch (error) {
      if (mounted) Notice.error(context, errorMessage(error));
    }
  }

  void _showUserDetails({
    required String name,
    required String email,
    required String scope,
    required String company,
    required String role,
  }) {
    final isPlatform = scope == 'platform';
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 30,
                child: Icon(
                  isPlatform
                      ? Icons.admin_panel_settings_outlined
                      : Icons.business_outlined,
                  size: 30,
                ),
              ),
              const SizedBox(height: 12),
              Text(name, style: Theme.of(context).textTheme.titleLarge),
              if (email.isNotEmpty) ...[
                const SizedBox(height: 4),
                SelectableText(
                  email,
                  style: const TextStyle(color: AppColors.muted),
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Chip(
                          avatar: Icon(
                            isPlatform
                                ? Icons.support_agent_outlined
                                : Icons.business_outlined,
                            size: 18,
                          ),
                          label: Text(isPlatform ? 'Platform' : company),
                        ),
                        Chip(
                          avatar: const Icon(
                            Icons.manage_accounts_outlined,
                            size: 18,
                          ),
                          label: Text(_title(role)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = context.watch<AuthProvider>().user?.id;
    final counterpart = currentUserId == widget.conversation.creatorId
        ? widget.conversation.recipientName
        : widget.conversation.creatorName;
    final counterpartEmail = currentUserId == widget.conversation.creatorId
        ? widget.conversation.recipientEmail
        : widget.conversation.creatorEmail;
    final counterpartScope = currentUserId == widget.conversation.creatorId
        ? widget.conversation.recipientScope
        : widget.conversation.creatorScope;
    final counterpartCompany = currentUserId == widget.conversation.creatorId
        ? widget.conversation.recipientCompanyName
        : widget.conversation.creatorCompanyName;
    final counterpartRole = currentUserId == widget.conversation.creatorId
        ? widget.conversation.recipientRole
        : widget.conversation.creatorRole;
    final counterpartContext = currentUserId == widget.conversation.creatorId
        ? _identityLabel(
            widget.conversation.recipientScope,
            widget.conversation.recipientCompanyName,
            widget.conversation.recipientRole,
          )
        : _identityLabel(
            widget.conversation.creatorScope,
            widget.conversation.creatorCompanyName,
            widget.conversation.creatorRole,
          );
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
        ),
        title: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () => _showUserDetails(
            name: counterpart,
            email: counterpartEmail,
            scope: counterpartScope,
            company: counterpartCompany,
            role: counterpartRole,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [Flexible(child: Text(counterpart))],
                ),
                Text(
                  counterpartContext,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Conversation actions',
            onSelected: (value) {
              if (const ['open', 'archived'].contains(value)) {
                _changeConversationStatus(value);
              }
              if (value == 'delete') _deleteConversation();
            },
            itemBuilder: (_) => [
              if (widget.conversation.status == 'archived')
                const PopupMenuItem(
                  value: 'open',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.unarchive_outlined),
                    title: Text('Restore'),
                  ),
                )
              else ...[
                const PopupMenuItem(
                  value: 'archived',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.archive_outlined),
                    title: Text('Archive'),
                  ),
                ),
              ],
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'delete',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.delete_outline),
                  title: Text('Delete'),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: _messages.length,
              itemBuilder: (_, index) {
                final item = _messages[index];
                final mine = item.senderId == currentUserId;
                return Align(
                  alignment: mine
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 310),
                    margin: const EdgeInsets.only(bottom: 9),
                    padding: const EdgeInsets.all(11),
                    decoration: BoxDecoration(
                      color: mine ? AppColors.softRed : const Color(0xffE8F1FF),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.content),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Flexible(
                              child: Text(
                                '${item.senderName}\n${Formatters.dateTime(item.createdAt)}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  color: AppColors.muted,
                                ),
                              ),
                            ),
                            if (mine) ...[
                              const SizedBox(width: 5),
                              Icon(
                                item.deliveryState == 'failed'
                                    ? Icons.close
                                    : item.readAt != null
                                    ? Icons.done_all
                                    : Icons.check,
                                size: 16,
                                color: item.deliveryState == 'failed'
                                    ? AppColors.primary
                                    : item.readAt != null
                                    ? Colors.blue
                                    : AppColors.muted,
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          if (widget.conversation.status == 'archived')
            const SafeArea(
              top: false,
              child: Padding(
                padding: EdgeInsets.all(12),
                child: Text(
                  'Restore this conversation from the menu before replying.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.muted),
                ),
              ),
            )
          else
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 6, 10, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _message,
                        maxLines: 4,
                        maxLength: 4000,
                        decoration: const InputDecoration(
                          hintText: 'Write an in-app message',
                          counterText: '',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: _sending ? null : _send,
                      icon: _sending
                          ? const SizedBox.square(
                              dimension: 17,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.send),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ConversationScreen extends StatefulWidget {
  const _ConversationScreen({required this.conversation});
  final InboxConversation conversation;

  @override
  State<_ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<_ConversationScreen> {
  final _message = TextEditingController();
  List<Message> _messages = const [];
  List<InboxStaff> _staff = const [];
  late InboxConversation _conversation;
  Timer? _timer;
  bool _loading = true;
  bool _sending = false;
  String? _senderId;

  @override
  void initState() {
    super.initState();
    _conversation = widget.conversation;
    _senderId = _conversation.senderId;
    _load();
    _timer = Timer.periodic(
      const Duration(seconds: 4),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _message.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final repo = context.read<SmsRepository>();
      final results = await Future.wait([
        repo.inboxConversationMessages(_conversation.id),
        repo.inboxStaff(),
      ]);
      await repo.markInboxRead(_conversation.id);
      if (!mounted) return;
      setState(() {
        _messages = results[0] as List<Message>;
        _staff = results[1] as List<InboxStaff>;
        _loading = false;
      });
    } catch (_) {
      if (!silent && mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final text = _message.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      final result = await context.read<SmsRepository>().replyToConversation(
        _conversation.id,
        text,
        senderId: _senderId,
      );
      if (!mounted) return;
      if (result.successCount > 0) _message.clear();
      Notice.smsResult(context, result);
      await _load();
    } catch (_) {
      if (mounted) Notice.error(context, 'Could not send the reply.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _update(Map<String, dynamic> changes) async {
    try {
      final updated = await context
          .read<SmsRepository>()
          .updateInboxConversation(_conversation.id, changes);
      if (mounted) setState(() => _conversation = updated);
    } catch (_) {
      if (mounted) Notice.error(context, 'Could not update the conversation.');
    }
  }

  Future<void> _deleteConversation() async {
    final confirmed = await _confirmConversationDelete(context);
    if (!confirmed || !mounted) return;
    try {
      await context.read<SmsRepository>().deleteInboxConversation(
        _conversation.id,
      );
      if (mounted) Navigator.of(context).pop();
    } catch (error) {
      if (mounted) Notice.error(context, errorMessage(error));
    }
  }

  void _showContext() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _conversation.title,
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
              _contextRow(
                'Company',
                _conversation.companyName ?? 'Active company',
              ),
              _contextRow('Phone', _conversation.customerPhone),
              _contextRow(
                'Sender ID',
                _conversation.senderId ?? 'Not selected',
              ),
              _contextRow(
                'Assigned to',
                _conversation.assignedToName ?? 'Unassigned',
              ),
              _contextRow(
                'Campaign source',
                _conversation.sourceCampaignName ?? 'No campaign source',
              ),
              _contextRow(
                'Tags',
                _conversation.tags.isEmpty
                    ? 'No tags'
                    : _conversation.tags.join(', '),
              ),
              _contextRow('Previous messages', '${_messages.length}'),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    const canReply = true;
    final canAssign = auth.can('inbox.assign');
    final senderIds = context.watch<SenderIdProvider>().approved;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
        ),
        title: InkWell(
          onTap: _showContext,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _conversation.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                _conversation.customerPhone,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Conversation actions',
            onSelected: (value) async {
              if (value == 'archive') {
                await _update({'status': 'archived'});
                if (context.mounted) Navigator.of(context).pop();
              }
              if (value == 'restore') {
                await _update({'status': 'open'});
                if (context.mounted) Navigator.of(context).pop();
              }
              if (value == 'delete') _deleteConversation();
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: _conversation.status == 'archived'
                    ? 'restore'
                    : 'archive',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(
                    _conversation.status == 'archived'
                        ? Icons.unarchive_outlined
                        : Icons.archive_outlined,
                  ),
                  title: Text(
                    _conversation.status == 'archived' ? 'Restore' : 'Archive',
                  ),
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.delete_outline),
                  title: Text('Delete'),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          if (canAssign)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: DropdownButtonFormField<String?>(
                initialValue: _conversation.assignedToId,
                decoration: const InputDecoration(
                  labelText: 'Assigned staff',
                  isDense: true,
                ),
                items: [
                  const DropdownMenuItem<String?>(
                    value: null,
                    child: Text('Unassigned'),
                  ),
                  ..._staff.map(
                    (user) => DropdownMenuItem<String?>(
                      value: user.id,
                      child: Text(user.name),
                    ),
                  ),
                ],
                onChanged: (value) => _update({'assignedToId': value}),
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(14),
                      itemCount: _messages.length,
                      itemBuilder: (_, index) =>
                          _MessageBubble(message: _messages[index]),
                    ),
                  ),
          ),
          if (canReply)
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 6, 10, 10),
                child: Column(
                  children: [
                    if (senderIds.isNotEmpty)
                      DropdownButtonFormField<String>(
                        initialValue: _senderId ?? senderIds.first.senderId,
                        decoration: const InputDecoration(
                          labelText: 'Reply from',
                          isDense: true,
                        ),
                        items: senderIds
                            .map(
                              (e) => DropdownMenuItem(
                                value: e.senderId,
                                child: Text(e.senderId),
                              ),
                            )
                            .toList(),
                        onChanged: (value) => setState(() => _senderId = value),
                      ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _message,
                            minLines: 1,
                            maxLines: 4,
                            maxLength: 480,
                            decoration: const InputDecoration(
                              hintText: 'Reply to customer',
                              counterText: '',
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton.filled(
                          tooltip: 'Send reply',
                          onPressed: _sending || senderIds.isEmpty
                              ? null
                              : _send,
                          icon: _sending
                              ? const SizedBox.square(
                                  dimension: 17,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.send),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message});
  final Message message;

  @override
  Widget build(BuildContext context) => Align(
    alignment: message.isInbound ? Alignment.centerLeft : Alignment.centerRight,
    child: Container(
      constraints: const BoxConstraints(maxWidth: 310),
      margin: const EdgeInsets.only(bottom: 9),
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: message.isInbound ? const Color(0xffE8F1FF) : AppColors.softRed,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message.content),
          const SizedBox(height: 5),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Flexible(
                child: Text(
                  '${message.sentByName?.isNotEmpty == true ? '${message.sentByName}\n' : ''}'
                  '${Formatters.dateTime(message.sentAt ?? message.createdAt)}',
                  style: const TextStyle(color: AppColors.muted, fontSize: 10),
                ),
              ),
              if (!message.isInbound) ...[
                const SizedBox(width: 5),
                Icon(
                  message.status.toLowerCase() == 'failed'
                      ? Icons.close
                      : message.status.toLowerCase() == 'delivered'
                      ? Icons.done_all
                      : message.status.toLowerCase() == 'pending'
                      ? Icons.schedule
                      : Icons.check,
                  size: 16,
                  color: message.status.toLowerCase() == 'failed'
                      ? AppColors.primary
                      : message.status.toLowerCase() == 'delivered'
                      ? Colors.blue
                      : AppColors.muted,
                ),
              ],
            ],
          ),
        ],
      ),
    ),
  );
}

class _StartInternalConversationSheet extends StatefulWidget {
  const _StartInternalConversationSheet({required this.recipients});

  final List<InternalRecipient> recipients;

  @override
  State<_StartInternalConversationSheet> createState() =>
      _StartInternalConversationSheetState();
}

class _StartInternalConversationSheetState
    extends State<_StartInternalConversationSheet> {
  final _search = TextEditingController();
  final _message = TextEditingController();
  InternalRecipient? _selected;

  @override
  void dispose() {
    _search.dispose();
    _message.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final term = _search.text.trim().toLowerCase();
    final recipients = widget.recipients
        .where(
          (item) =>
              term.isEmpty ||
              item.name.toLowerCase().contains(term) ||
              item.email.toLowerCase().contains(term) ||
              item.companyName.toLowerCase().contains(term) ||
              item.role.toLowerCase().contains(term),
        )
        .toList();
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: FractionallySizedBox(
          heightFactor: .82,
          child: Column(
            children: [
              const Text(
                'Start internal conversation',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: TextField(
                  controller: _search,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    hintText: 'Search name, email, or company',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
              ),
              Expanded(
                child: recipients.isEmpty
                    ? const Center(child: Text('No matching users'))
                    : ListView.separated(
                        itemCount: recipients.length,
                        separatorBuilder: (_, _) => const Divider(
                          height: 1,
                          thickness: 0.6,
                          indent: 72,
                          endIndent: 12,
                          color: AppColors.border,
                        ),
                        itemBuilder: (_, index) {
                          final recipient = recipients[index];
                          final selected =
                              recipient.id == _selected?.id &&
                              recipient.companyId == _selected?.companyId;
                          return ListTile(
                            selected: selected,
                            leading: CircleAvatar(
                              child: Icon(
                                recipient.accountScope == 'platform'
                                    ? Icons.support_agent_outlined
                                    : Icons.person_outline,
                              ),
                            ),
                            title: Text(recipient.name),
                            subtitle: Text(
                              '${recipient.email}\n${_identityLabel(recipient.accountScope, recipient.companyName, recipient.role)}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            trailing: selected
                                ? const Icon(Icons.check_circle)
                                : null,
                            onTap: () => setState(() => _selected = recipient),
                          );
                        },
                      ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _message,
                        minLines: 1,
                        maxLines: 4,
                        maxLength: 4000,
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(
                          hintText: 'Write the first message',
                          counterText: '',
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      tooltip: 'Start conversation',
                      onPressed:
                          _selected == null || _message.text.trim().isEmpty
                          ? null
                          : () => Navigator.of(context).pop((
                              recipient: _selected!,
                              message: _message.text.trim(),
                            )),
                      icon: const Icon(Icons.send),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StartConversationSheet extends StatefulWidget {
  const _StartConversationSheet({
    required this.contacts,
    required this.senderIds,
  });
  final List<Contact> contacts;
  final List<String> senderIds;

  @override
  State<_StartConversationSheet> createState() =>
      _StartConversationSheetState();
}

class _StartConversationSheetState extends State<_StartConversationSheet> {
  final _search = TextEditingController();
  String? _senderId;

  @override
  void initState() {
    super.initState();
    _senderId = widget.senderIds.firstOrNull;
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final term = _search.text.trim().toLowerCase();
    final contacts = widget.contacts
        .where(
          (item) =>
              term.isEmpty ||
              item.name.toLowerCase().contains(term) ||
              item.phoneNumber.contains(term),
        )
        .toList();
    return SafeArea(
      child: FractionallySizedBox(
        heightFactor: .82,
        child: Column(
          children: [
            const Text(
              'Start customer conversation',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  if (widget.senderIds.isNotEmpty)
                    DropdownButtonFormField<String>(
                      initialValue: _senderId,
                      decoration: const InputDecoration(labelText: 'Send from'),
                      items: widget.senderIds
                          .map(
                            (e) => DropdownMenuItem(value: e, child: Text(e)),
                          )
                          .toList(),
                      onChanged: (value) => setState(() => _senderId = value),
                    ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _search,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      hintText: 'Search name or phone',
                      prefixIcon: Icon(Icons.search),
                    ),
                  ),
                ],
              ),
            ),
            if (widget.senderIds.isEmpty)
              const Padding(
                padding: EdgeInsets.all(18),
                child: Text(
                  'An approved sender is required before starting a conversation.',
                ),
              )
            else
              Expanded(
                child: ListView.separated(
                  itemCount: contacts.length,
                  separatorBuilder: (_, _) => const Divider(
                    height: 1,
                    thickness: 0.6,
                    indent: 72,
                    endIndent: 12,
                    color: AppColors.border,
                  ),
                  itemBuilder: (_, index) {
                    final contact = contacts[index];
                    return ListTile(
                      leading: const CircleAvatar(
                        child: Icon(Icons.person_outline),
                      ),
                      title: Text(contact.name),
                      subtitle: Text(contact.phoneNumber),
                      onTap: () => Navigator.of(
                        context,
                      ).pop((contact: contact, senderId: _senderId)),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

Widget _contextRow(String label, String value) => Padding(
  padding: const EdgeInsets.only(bottom: 10),
  child: Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      SizedBox(
        width: 120,
        child: Text(label, style: const TextStyle(color: AppColors.muted)),
      ),
      Expanded(
        child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ),
    ],
  ),
);

String _title(String value) => value.isEmpty
    ? value
    : '${value[0].toUpperCase()}${value.substring(1).replaceAll('_', ' ')}';

Future<bool> _confirmConversationDelete(BuildContext context) async =>
    await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete conversation?'),
        content: const Text(
          'This conversation will be removed and cannot be restored.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    ) ??
    false;

String _identityLabel(String scope, String company, String role) =>
    scope == 'platform'
    ? 'Platform — ${_title(role)}'
    : '$company — ${_title(role)}';
