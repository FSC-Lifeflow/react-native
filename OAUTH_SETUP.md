# Google OAuth Setup for Expo

## The Problem

iOS's `ASWebAuthenticationSession` (used by `WebBrowser.openAuthSessionAsync`) requires the redirect URL to be **exactly** whitelisted in your OAuth provider (Supabase).

When you see:
```
"error": "The operation couldn't be completed. (com.apple.AuthenticationServices.WebAuthenticationSession error 1.)"
```

This means iOS is blocking the redirect because the URL doesn't match what's configured in Supabase.

## The Solution

### Step 1: Find Your Expo Redirect URL

The redirect URL will be logged in the console when you try to sign in. Look for:
```
🔍 Redirect URL: exp://10.10.247.33:8081/--/
```

It will be something like:
- **Expo Go**: `exp://YOUR_IP:8081/--/`
- **Standalone**: `lifeflow://`

### Step 2: Add to Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **URL Configuration**
3. Under **Redirect URLs**, add:
   ```
   exp://10.10.247.33:8081/--/
   http://localhost:8081
   lifeflow://
   ```
   
   **Important**: Replace `10.10.247.33` with YOUR actual IP address from the console log!

4. Click **Save**

### Step 3: Test Again

1. Restart your app:
   ```bash
   npx expo start -c
   ```

2. Try Google OAuth again
3. Check the console for the redirect URL
4. Make sure that EXACT URL is in Supabase

## Why This Happens

- **Expo Go** uses dynamic URLs like `exp://YOUR_IP:8081/--/`
- **iOS** requires the redirect URL to be pre-registered
- **Supabase** needs to know which URLs are valid

## Alternative: Use Web Browser (Temporary Workaround)

If you can't get the native flow working, you can test OAuth on web:

```bash
npx expo start --web
```

Then test Google OAuth in the browser - it will work immediately because web uses `http://localhost:8081`.

## For Production

When you build a standalone app (not Expo Go), you'll use:
```
lifeflow://
```

This is already configured in `app.json` with `"scheme": "lifeflow"`.

## Debugging Tips

1. **Check the console** for the exact redirect URL being used
2. **Copy that URL exactly** into Supabase (including trailing slashes)
3. **Wait a few seconds** after saving in Supabase for changes to propagate
4. **Try again** - iOS is very strict about URL matching

## Current Status

✅ Code is updated with better error logging
✅ App scheme is set to `lifeflow`
⏳ **YOU NEED TO**: Add the Expo redirect URL to Supabase

Once you add the redirect URL to Supabase, it should work! 🎉
