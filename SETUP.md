# LifeFlow Mobile - Setup Guide

## ✅ Phase 1 Complete: Authentication Foundation

Phase 1 of the React Native migration is complete! The authentication infrastructure is now fully functional.

## 🎯 What's Been Implemented

### Core Infrastructure
- ✅ **Supabase Client**: Mobile-optimized client with secure token storage
- ✅ **Authentication Service**: Complete auth service ported from web
- ✅ **Auth Context**: React context for managing auth state
- ✅ **React Query**: Set up for data fetching
- ✅ **Secure Storage**: Using `expo-secure-store` for tokens

### Authentication Features
- ✅ **Email/Password Auth**: Sign up and login with validation
- ✅ **Google OAuth**: Mobile-optimized OAuth flow
- ✅ **Session Management**: Auto-refresh and persistence
- ✅ **Protected Routes**: Auth-based navigation
- ✅ **Logout**: Secure logout with session cleanup

### Screens
- ✅ **Sign In Screen**: Email/password + Google OAuth
- ✅ **Register Screen**: Full registration form with validation
- ✅ **Home Screen**: Shows user info and logout button

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
The `.env` file is already set up with your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://qjtyzxnnhdaqwlqgquel.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

### 3. Start the App
```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code for physical device

## 🧪 Testing the Auth Flow

### Test Email/Password Auth
1. Open the app - you'll see the Sign In screen
2. Click "Sign Up" to create a new account
3. Fill in all fields and submit
4. You'll be automatically logged in and redirected to the home screen
5. Test logout by clicking the red "Logout" button

### Test Google OAuth
1. Click "Continue with Google" on the Sign In screen
2. Complete the OAuth flow in the browser
3. You'll be redirected back to the app and logged in

### Verify Session Persistence
1. Log in to the app
2. Close the app completely
3. Reopen the app - you should still be logged in

## 📁 Key Files Created

```
react-native/
├── lib/
│   └── supabase.ts              # Supabase client with secure storage
├── services/
│   └── authService.ts           # Auth service (login, register, OAuth)
├── contexts/
│   └── AuthContext.tsx          # Auth state management
├── app/
│   ├── index.tsx                # Auth-based routing
│   ├── _layout.tsx              # Root layout with providers
│   ├── (auth)/
│   │   ├── sign-in.tsx          # Sign in screen
│   │   └── register.tsx         # Register screen
│   └── (tabs)/
│       └── index.tsx            # Home screen (updated with user info)
├── .env                         # Environment variables
└── .env.example                 # Environment template
```

## 🔄 Migration Progress

### ✅ Phase 1: Foundation (COMPLETE)
- Supabase authentication
- React Query setup
- Auth screens and navigation
- Secure token storage

### ✅ Phase 2: Core Screens (COMPLETE)
- Dashboard with health metrics
- Profile screen with avatar upload
- Settings screen with integrations
- Reusable UI components (Card, StatCard)

### 📋 Phase 3: Integrations
- Fitbit integration (using expo-auth-session)
- Google Calendar integration
- Health data visualization

### 📋 Phase 4: Social Features
- Social feed
- Friend system
- Activity sharing

## 🔐 Security Notes

- Tokens are stored securely using `expo-secure-store`
- OAuth flows use `expo-auth-session` for mobile security
- Session auto-refresh is enabled
- `.env` file is gitignored (use `.env.example` as template)

## 🐛 Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists in the root directory
- Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set
- Restart the Expo dev server after changing `.env`

### OAuth not working
- Ensure you've configured the OAuth redirect URL in Supabase dashboard
- For development, the redirect URL should match your Expo app scheme
- Check the console for detailed OAuth error messages

### Session not persisting
- This is expected on web platform (uses localStorage)
- On iOS/Android, sessions should persist using SecureStore
- Try clearing the app data and logging in again

## 📝 Next Steps

To continue the migration:

1. **Create Dashboard Screen**: Port the Dashboard component with health metrics
2. **Add UI Component Library**: Consider React Native Paper or NativeBase
3. **Implement Profile Screen**: User profile with avatar upload
4. **Add Settings Screen**: App settings and preferences
5. **Port Fitbit Integration**: Adapt OAuth flow for mobile

## 🤝 Need Help?

- Check the main README.md for general documentation
- Review the web version in `../frontend` for reference
- Supabase docs: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Expo Router docs: https://docs.expo.dev/router/introduction/
