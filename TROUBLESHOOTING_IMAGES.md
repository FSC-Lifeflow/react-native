# Troubleshooting Image Upload Issues

## Issue: Images appear blank/white or fail to load

### Common Causes & Solutions

#### 1. File Size Restrictions

**Supabase Storage Limits:**
- Default bucket limit: 50MB per file
- BUT: Your bucket might have custom limits set to 2MB

**Check Your Bucket Settings:**
1. Go to Supabase Dashboard → Storage → Buckets
2. Click on `avatars` bucket → Settings (⚙️)
3. Check "File size limit" setting
4. If it's set to 2MB, either:
   - Increase it to 5MB or 10MB
   - OR keep the mobile app quality low (0.5 or lower)

**Current Mobile App Settings:**
- Image quality: 0.5 (50%)
- Max file size: 2MB
- Aspect ratio: 1:1 (square)
- Editing enabled: Yes

#### 2. Bucket Not Public

**Symptoms:**
- Images upload successfully
- URLs are generated
- But images don't display (blank/white)
- Console shows 403 or 404 errors

**Solution:**
1. Supabase Dashboard → Storage → Buckets
2. Find `avatars` bucket
3. Click three dots (⋮) → Edit bucket
4. Enable "Public bucket" toggle
5. Save

#### 3. Missing Storage Policies

Even with a public bucket, you need RLS policies:

```sql
-- Allow public read access
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 4. CORS Issues

**Symptoms:**
- Images load in browser when you paste the URL
- But don't load in the mobile app
- Console shows CORS errors

**Solution:**
1. Supabase Dashboard → Storage → Configuration
2. Add allowed origins:
   - Development: `*` (wildcard)
   - Production: Your specific domains

#### 5. Image Format Issues

**Supported formats:**
- ✅ JPG/JPEG
- ✅ PNG
- ✅ WEBP
- ❌ HEIC (iPhone default - gets converted by expo-image-picker)

#### 6. Network/CDN Caching

**If images were previously broken:**
- Old broken URLs might be cached
- Clear app cache or reinstall
- Or append a query parameter: `?v=${Date.now()}`

## Debugging Steps

### Step 1: Check Console Logs

After uploading, look for:

```
📸 Selected image details:
  - URI: file:///...
  - Width: 1024
  - Height: 1024
  - File size: 0.85 MB

🚀 Starting avatar upload...
📤 Starting avatar upload for user: [user-id]
📁 File URI: file:///...
📤 Uploading to path: [user-id]/[timestamp].jpg
✅ File uploaded successfully
🔗 Public URL generated: https://...
🧪 Testing URL accessibility...
🧪 URL test status: 200
✅ URL is accessible!
✅ Avatar URL updated in database
✅ Avatar upload complete, refreshing user...
```

### Step 2: Test the URL

1. Copy the generated URL from console
2. Paste it in a browser
3. If it loads → CORS or app issue
4. If it doesn't load → Bucket permissions issue

### Step 3: Check Image Loading

When viewing profile:

```
🔄 Starting to load avatar: https://...
✅ ===== AVATAR LOADED =====
URL: https://...
============================
```

OR if it fails:

```
❌ ===== AVATAR LOAD ERROR =====
URL: https://...
Error details: {...}
================================
```

## Quick Fixes

### Fix 1: Reduce Image Quality Further

In `profile.tsx`, change quality to 0.3:

```typescript
quality: 0.3, // Even smaller files
```

### Fix 2: Increase Bucket Size Limit

In Supabase Dashboard:
1. Storage → Buckets → avatars → Settings
2. Change "File size limit" to 5MB or 10MB

### Fix 3: Force Image Refresh

Add cache busting to image URLs:

```typescript
source={{ uri: `${user.avatar_url}?v=${Date.now()}` }}
```

### Fix 4: Use Signed URLs (if bucket must be private)

In `authService.ts`:

```typescript
// Instead of getPublicUrl, use createSignedUrl
const { data: signedData, error: signedError } = await supabase.storage
  .from('avatars')
  .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

if (signedError) throw signedError;
const publicUrl = signedData.signedUrl;
```

## Verification Checklist

- [ ] Bucket is set to "Public"
- [ ] Storage policies exist for SELECT
- [ ] File size limit is adequate (5MB+)
- [ ] Image quality is reasonable (0.5 or lower)
- [ ] URL test returns 200 status
- [ ] URL opens in browser
- [ ] Console shows successful load
- [ ] No CORS errors in console

## Still Having Issues?

1. Check the exact error in console logs
2. Verify the URL format: `https://[project].supabase.co/storage/v1/object/public/avatars/...`
3. Try uploading a very small test image (< 100KB)
4. Check Supabase project status (not paused)
5. Verify API keys are correct in `.env`
