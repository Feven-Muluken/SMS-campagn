import 'package:flutter_test/flutter_test.dart';
import 'package:sms_campaign_app/core/utils/validators.dart';

void main() {
  group('Validators.required', () {
    test('rejects null and empty values', () {
      expect(Validators.required(null), isNotNull);
      expect(Validators.required(''), isNotNull);
      expect(Validators.required('   '), isNotNull);
    });

    test('accepts non-empty values', () {
      expect(Validators.required('hello'), isNull);
    });
  });

  group('Validators.email', () {
    test('rejects malformed emails', () {
      expect(Validators.email('not-an-email'), isNotNull);
      expect(Validators.email('a@b'), isNotNull);
      expect(Validators.email('@example.com'), isNotNull);
    });

    test('accepts valid emails', () {
      expect(Validators.email('user@example.com'), isNull);
      expect(Validators.email('first.last+tag@company.co'), isNull);
    });
  });

  group('Validators.phone (E.164)', () {
    test('rejects non-E.164 numbers', () {
      expect(Validators.phone('0911234567'), isNotNull);
      expect(Validators.phone('+251 91 123 4567'), isNotNull);
      expect(Validators.phone('+0123'), isNotNull);
      expect(Validators.phone(''), isNotNull);
    });

    test('accepts E.164 numbers', () {
      expect(Validators.phone('+251911234567'), isNull);
      expect(Validators.phone('+14155552671'), isNull);
    });
  });

  group('Validators.senderId', () {
    test('rejects invalid sender IDs', () {
      expect(Validators.senderId(''), isNotNull);
      expect(Validators.senderId('HAS SPACE'), isNotNull);
      expect(Validators.senderId('WAYTOOLONGID12'), isNotNull);
      expect(Validators.senderId('bad-id'), isNotNull);
    });

    test('accepts 1-11 alphanumeric sender IDs', () {
      expect(Validators.senderId('AFROEL'), isNull);
      expect(Validators.senderId('A'), isNull);
      expect(Validators.senderId('Brand123456'), isNull);
    });
  });
}
