# LifeFlow Mobile App 🏃‍♂️

React Native mobile application for LifeFlow wellness platform, built with Expo and React Native.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Expo Go app on your physical device (optional)

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Copy `.env.example` to `.env` and update with your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   Update the values in `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server**

   ```bash
   npm start
   ```

   Then:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## 📱 Features Implemented

### Phase 1: Foundation (✅ Complete)

- ✅ Supabase authentication with secure token storage
- ✅ Email/password login and registration
- ✅ Google OAuth integration (mobile-optimized)
- ✅ React Query for data fetching
- ✅ Auth context and protected routes
- ✅ Expo Router navigation

### Coming Soon

- Dashboard with health metrics
- Fitbit integration
- Google Calendar integration
- Social features
- Profile management
- Workout tracking

## 🏗️ Project Structure

```
react-native/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   ├── sign-in.tsx
│   │   └── register.tsx
│   ├── (tabs)/            # Main app tabs
│   └── _layout.tsx        # Root layout with providers
├── components/            # Reusable components
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication context
├── services/              # API services
│   └── authService.ts     # Auth service
├── lib/                   # Utilities
│   └── supabase.ts        # Supabase client
└── .env                   # Environment variables
```

## 🔐 Authentication

The app uses Supabase for authentication with the following features:

- **Email/Password**: Traditional sign up and login
- **Google OAuth**: Mobile-optimized OAuth flow using `expo-auth-session`
- **Secure Storage**: Tokens stored using `expo-secure-store`
- **Auto-refresh**: Automatic token refresh
- **Session Persistence**: Sessions persist across app restarts

## 🛠️ Tech Stack

- **Framework**: React Native + Expo
- **Navigation**: Expo Router (file-based routing)
- **Authentication**: Supabase Auth
- **Data Fetching**: TanStack React Query
- **Storage**: Expo Secure Store
- **OAuth**: Expo Auth Session

## 📝 Development

### Running on Different Platforms

```bash
# iOS (Mac only)
npm run ios

# Android
npm run android

# Web
npm run web
```

### Linting

```bash
npm run lint
```

## 🔄 Migration from Web

This React Native app is being migrated from the web version in the `frontend` directory. The migration follows this strategy:

1. **Phase 1**: Foundation (Auth, Navigation) - ✅ Complete
2. **Phase 2**: Core Screens (Dashboard, Profile, Settings)
3. **Phase 3**: Integrations (Fitbit, Google Calendar)
4. **Phase 4**: Social Features

## 📚 Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

## 🤝 Contributing

This is a private project for LifeFlow. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved
