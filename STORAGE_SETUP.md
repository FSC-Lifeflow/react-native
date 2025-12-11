# Supabase Storage Setup Guide

## Issue: Blank/White Images

If profile pictures and activity images appear blank or white, it's likely a storage bucket permission issue.

## Solution

### 1. Make Buckets Public

In your Supabase Dashboard:

1. Go to **Storage** → **Buckets**
2. For each bucket (`avatars`, `activity-images`, etc.):
   - Click the three dots menu
   - Select "Edit bucket"
   - Enable **"Public bucket"**
   - Save changes

### 2. Set Up Storage Policies

Run these SQL commands in the Supabase SQL Editor:

```sql
-- ============================================
-- AVATARS BUCKET POLICIES
-- ============================================

-- Allow public read access to avatars
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- ACTIVITY IMAGES BUCKET POLICIES (if applicable)
-- ============================================

-- Allow public read access to activity images
CREATE POLICY "Public Access to Activity Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'activity-images' );

-- Allow authenticated users to upload activity images
CREATE POLICY "Users can upload activity images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'activity-images' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own activity images
CREATE POLICY "Users can update their own activity images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'activity-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own activity images
CREATE POLICY "Users can delete their own activity images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'activity-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### 3. Verify URL Format

After uploading, the public URL should look like:
```
https://[your-project-id].supabase.co/storage/v1/object/public/avatars/[user-id]/[timestamp].jpg
```

Test by:
1. Upload an avatar
2. Check console logs for the generated URL
3. Copy the URL and open it in a browser
4. If it loads in the browser but not in the app, it's a CORS issue

### 4. CORS Configuration (if needed)

If images load in browser but not in app:

1. Go to **Storage** → **Configuration**
2. Add allowed origins:
   - For development: `*` (wildcard)
   - For production: Your app's domain

### 5. Test the Implementation

After making these changes:

1. Upload a new profile picture
2. Check the console logs for any errors
3. Verify the image appears in:
   - Profile screen
   - Feed posts
   - Messages
   - Friends list

## Troubleshooting

### Images still blank?

1. **Check bucket exists**: Verify `avatars` bucket exists in Storage
2. **Check RLS is enabled**: Storage → Policies → Enable RLS
3. **Check policies**: Make sure the SELECT policy exists and is active
4. **Check URL**: Copy the avatar_url from database and test in browser
5. **Check console**: Look for error messages when images fail to load

### Network errors?

- Verify your Supabase URL and anon key are correct in `.env`
- Check if you can access other Supabase features (auth, database)
- Try uploading a small test image

### Still having issues?

Check the console logs added to the code:
- Avatar upload logs show the generated URL
- Image component logs show loading success/failure
- Compare working URLs from web app vs mobile app
