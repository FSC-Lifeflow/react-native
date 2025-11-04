# Web OAuth Setup - Final Step!

## What I Just Fixed

✅ **Created `/app/auth/callback.tsx`** - Handles OAuth redirect and sets session
✅ **Updated authService** - Uses correct redirect URL with `/auth/callback` path
✅ **Updated sign-in screen** - Doesn't try to redirect immediately (callback handles it)

## 🔴 Required: Update Supabase Redirect URL

You need to add the callback URL to Supabase:

### Step 1: Add Redirect URL to Supabase

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **URL Configuration**
3. Under **Redirect URLs**, add:
   ```
   http://localhost:8081/auth/callback
   ```
4. Click **Save**

### Step 2: Test Again

1. Make sure the dev server is running:
   ```bash
   npx expo start --web
   ```

2. Open `http://localhost:8081` in your browser

3. Click **"Continue with Google"**

4. Sign in with Google

5. You should be redirected to `http://localhost:8081/auth/callback`

6. The callback will process the tokens and redirect you to the dashboard ✅

## How It Works Now

```
1. User clicks "Continue with Google"
   ↓
2. Opens Google OAuth page
   ↓
3. User signs in with Google
   ↓
4. Google redirects to: http://localhost:8081/auth/callback?access_token=...&refresh_token=...
   ↓
5. /app/auth/callback.tsx extracts tokens
   ↓
6. Sets Supabase session
   ↓
7. Redirects to /(tabs) dashboard
   ↓
8. ✅ User is logged in!
```

## Troubleshooting

### If you still get redirected to sign-in:

1. **Check browser console** for errors
2. **Verify the redirect URL** in Supabase matches exactly: `http://localhost:8081/auth/callback`
3. **Check the callback route** is being hit (you'll see console logs)
4. **Clear browser cache** and try again

### Check the Console Logs

You should see:
```
🔍 Redirect URL: http://localhost:8081/auth/callback
🔄 Processing OAuth callback...
📝 URL params: { access_token: '...', refresh_token: '...' }
🔑 Setting session with tokens...
✅ Session set successfully!
👤 User: your-email@gmail.com
```

## For Production

When you deploy, add your production URL:
```
https://yourdomain.com/auth/callback
```

## Summary

- ✅ Code is ready
- ⏳ **YOU NEED TO**: Add `http://localhost:8081/auth/callback` to Supabase
- 🧪 Test on web - it should work now!

Once you add the redirect URL to Supabase, OAuth will work perfectly on web! 🎉
