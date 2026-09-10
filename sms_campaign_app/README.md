# SMS Campaign mobile app

The app uses the backend for authentication, company permissions, contacts, groups, campaigns, provider selection, sender IDs, and delivery reports. SMS provider credentials are never stored on the phone.

Before signing in, open **Server URL**, enter the backend address, and use **Test & save**. Typical development values are:

- Android emulator: `http://10.0.2.2:5000`
- Physical phone on the same Wi-Fi: `http://<computer-lan-ip>:5000`
- Production: `https://api.your-domain.example`

For a production build, provide the HTTPS API at compile time:

```bash
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.your-domain.example
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
