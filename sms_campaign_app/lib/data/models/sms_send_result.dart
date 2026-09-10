class SmsSendResult {
  const SmsSendResult({
    required this.successCount,
    required this.failCount,
    required this.total,
  });

  final int successCount;
  final int failCount;
  final int total;

  bool get allSucceeded => total > 0 && successCount == total;
  bool get allFailed => total > 0 && failCount == total;
  bool get partiallySucceeded => successCount > 0 && failCount > 0;

  String get summary {
    if (total == 0) return 'No recipients were available. Nothing was sent.';
    if (allSucceeded) {
      return 'Sent successfully to $successCount ${successCount == 1 ? 'recipient' : 'recipients'}.';
    }
    if (allFailed) {
      return 'Sending failed for all $failCount ${failCount == 1 ? 'recipient' : 'recipients'}.';
    }
    return 'Partially sent: $successCount succeeded and $failCount failed out of $total.';
  }

  factory SmsSendResult.fromResponse(dynamic data) {
    final map = data is Map ? data : const {};
    int count(String key) => int.tryParse('${map[key] ?? 0}') ?? 0;
    return SmsSendResult(
      successCount: count('successCount'),
      failCount: count('failCount'),
      total: count('total'),
    );
  }
}
