# OAuth Callback Debug Guide

## Issue
After logout, signing in again with OAuth causes the "Completing sign in..." page to spin infinitely.

## What I Added

### Enhanced Logging in `/app/auth/callback.tsx`

1. **Prevent multiple executions** - Added `hasProcessed` state
2. **Detailed token parsing logs** - Shows each step of token extraction
3. **Navigation error handling** - Catches and logs navigation issues
4. **User info logging** - Shows user email and ID after session set

## Debug Steps

### 1. Check Console Output

When you try to sign in again, look for this sequence:

```
🔄 Processing OAuth callback...
📝 URL params: {...}
📝 Params keys: [...]
🔍 Initial token check: {...}
🔍 Parsing hash fragment: ...
🔍 After parsing hash: {...}
🔑 Setting session with tokens...
🔑 Access token length: ...
🔑 Refresh token length: ...
✅ Session set successfully!
👤 User: your-email@gmail.com
👤 User ID: ...
🚀 Redirecting to dashboard...
🔄 Attempting navigation to /(tabs)/dashboard
✅ Navigation command executed
Auth state changed: SIGNED_IN
```

### 2. Common Issues

#### Issue: Callback runs multiple times
**Symptoms:** You see "🔄 Processing OAuth callback..." multiple times
**Solution:** The `hasProcessed` flag should prevent this now

#### Issue: No tokens found
**Symptoms:** You see "❌ No tokens found in callback URL"
**Solution:** Check if the hash fragment is being parsed correctly

#### Issue: Navigation doesn't work
**Symptoms:** You see "✅ Navigation command executed" but page doesn't change
**Solution:** Check if there's a navigation error or if the router is stuck

#### Issue: Session not persisting
**Symptoms:** Session sets successfully but auth state doesn't change
**Solution:** Check if the AuthContext listener is working

### 3. What to Look For

1. **Are tokens being extracted?**
   - Look for "🔍 After parsing hash" with token lengths

2. **Is session being set?**
   - Look for "✅ Session set successfully!"

3. **Is navigation executing?**
   - Look for "✅ Navigation command executed"

4. **Does auth state change?**
   - Look for "Auth state changed: SIGNED_IN"

### 4. If Still Stuck

Check these:

1. **Browser cache** - Clear it and try again
2. **Session storage** - Check if old session is interfering
3. **Router state** - The router might be in a bad state

Try this in browser console:
```javascript
// Check if there's a session
localStorage.getItem('supabase.auth.token')

// Clear everything and try again
localStorage.clear()
sessionStorage.clear()
```

## Next Steps

1. **Try OAuth again** after the changes
2. **Copy the console output** and share it
3. **Note where it gets stuck** - which log message is the last one you see?

This will help identify exactly where the flow is breaking!
