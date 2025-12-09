# Google OAuth Setup Guide for LifeFlow Mobile

This guide will help you set up Google OAuth authentication for the LifeFlow mobile app.

## Prerequisites

1. A Google Cloud Console account
2. Your Supabase project URL and anon key configured in `.env`
3. Expo CLI installed

## Step 1: Configure Google Cloud Console

### 1.1 Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**

### 1.2 Configure OAuth Consent Screen

Before creating credentials, you need to configure the OAuth consent screen:

1. Click **Configure Consent Screen**
2. Choose **External** (unless you have a Google Workspace)
3. Fill in the required information:
   - App name: **LifeFlow**
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes (optional for basic auth):
   - `userinfo.email`
   - `userinfo.profile`
5. Save and continue

### 1.3 Create OAuth Client IDs

You'll need to create separate OAuth clients for each platform:

#### For iOS:

1. Application type: **iOS**
2. Name: **LifeFlow iOS**
3. Bundle ID: Get this from your `app.json` or `app.config.js` (e.g., `com.yourcompany.lifeflow`)
4. Click **Create**

#### For Android:

1. Application type: **Android**
2. Name: **LifeFlow Android**
3. Package name: Get this from your `app.json` or `app.config.js` (e.g., `com.yourcompany.lifeflow`)
4. SHA-1 certificate fingerprint:
   - For development, get your debug keystore SHA-1:
     ```bash
     # On macOS/Linux
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     
     # On Windows
     keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   - Copy the SHA-1 fingerprint
5. Click **Create**

#### For Web (Development/Testing):

1. Application type: **Web application**
2. Name: **LifeFlow Web**
3. Authorized JavaScript origins:
   - `http://localhost:8081` (Expo dev server)
   - Your Supabase project URL
4. Authorized redirect URIs:
   - `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`
5. Click **Create**

## Step 2: Configure Supabase

### 2.1 Add Google Provider

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** and click to expand
5. Enable the Google provider
6. Enter your Google OAuth credentials:
   - **Client ID**: From your Google Cloud Console (Web application client ID)
   - **Client Secret**: From your Google Cloud Console (Web application client secret)
7. Configure the redirect URL:
   - Supabase will show you the callback URL to add to Google Console
   - It should be: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
8. Click **Save**

### 2.2 Configure Deep Link Redirect

In Supabase, you need to add your mobile app's deep link scheme to the allowed redirect URLs:

1. In **Authentication** > **URL Configuration**
2. Add to **Redirect URLs**:
   - `lifeflow://auth/callback`
   - `exp://localhost:8081/--/auth/callback` (for Expo Go development)

## Step 3: Update Environment Variables

Make sure your `.env` file has the correct Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_URL=lifeflow://
```

## Step 4: Test the OAuth Flow

### 4.1 Start the Development Server

```bash
npx expo start
```

### 4.2 Test on Device/Simulator

1. Open the app on your device or simulator
2. Navigate to the Sign In screen
3. Tap **Continue with Google**
4. A browser should open with Google's OAuth consent screen
5. Sign in with your Google account
6. Grant permissions
7. You should be redirected back to the app and logged in

## Troubleshooting

### Issue: "OAuth redirect URI mismatch"

**Solution**: Make sure the redirect URI in your Google Cloud Console matches exactly what Supabase is sending. Check:
- Supabase callback URL is added to Google Console
- Mobile deep link `lifeflow://auth/callback` is added to Supabase allowed redirect URLs

### Issue: "Browser doesn't redirect back to app"

**Solution**: 
- Make sure `expo-web-browser` is installed: `npx expo install expo-web-browser`
- Verify the scheme in `app.config.js` matches your deep link
- On iOS, you may need to rebuild the app after changing the scheme

### Issue: "Session not persisting after OAuth"

**Solution**: The callback handler should automatically save the session to AsyncStorage. Check:
- `@react-native-async-storage/async-storage` is installed
- No errors in the console during the callback process

### Issue: "Google sign-in button does nothing"

**Solution**: Check the console logs:
- Look for any errors from `authService.loginWithGoogle()`
- Verify your Supabase URL and anon key are correct
- Make sure Google provider is enabled in Supabase

## Platform-Specific Notes

### iOS

- Deep links work automatically with Expo
- For standalone builds, you'll need to configure Associated Domains in your Apple Developer account

### Android

- Deep links work automatically with Expo
- For standalone builds, you'll need to add intent filters to your `AndroidManifest.xml` (Expo handles this automatically)

### Web (Expo Web)

- OAuth works differently on web - it uses browser redirects instead of deep links
- The callback URL will be `http://localhost:8081/auth/callback` during development

## Database Triggers

Make sure you have a database trigger in Supabase that creates a user profile when a new auth user is created:

```sql
-- This trigger should already exist in your Supabase project
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, username, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE(new.raw_user_meta_data->>'username', ''),
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)

## Support

If you encounter issues not covered in this guide, check:
1. Supabase logs in the Dashboard
2. Console logs in your app
3. Google Cloud Console logs
