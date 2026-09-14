# SMS Campaign mobile app

The app uses the backend for authentication, company permissions, contacts, groups, campaigns, provider selection, sender IDs, and delivery reports. SMS provider credentials are never stored on the phone.

The app connects to the production Railway backend by default:

`https://smsbackend-production-fc8c.up.railway.app`

For local development, override the API with `--dart-define`; the login screen
does not accept server addresses.

For a production build, provide the HTTPS API at compile time:

```bash
flutter build appbundle --release --dart-define=API_BASE_URL=https://smsbackend-production-fc8c.up.railway.app
```

Android release builds do not allow cleartext HTTP. Copy
`android/key.properties.example` to `android/key.properties`, point it at the
client-owned upload keystore, and keep both files containing secrets out of
source control. If `key.properties` is absent, Gradle will not silently sign a
release with the debug key.

For a release build, use HTTPS and configure the backend environment described in `../backend/.env.example`.

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
