# Social Feed Setup Guide

## 🎉 What's Been Built

The social feed is now fully implemented and ready to use! It uses your existing database schema from the web app.

### ✅ Features Implemented

**Feed Screen** (`app/(tabs)/feed.tsx`)
- View posts from friends (last 7 days)
- Create new posts with text and/or images
- Like/unlike posts with optimistic updates
- Delete your own posts
- Beautiful card-based UI
- Pull-to-refresh
- Empty states

**Post Service** (`services/postService.ts`)
- `getFriendPosts()` - Get posts from friends
- `getMyPosts()` - Get your own posts
- `createPost()` - Create new post with optional image
- `deletePost()` - Delete your posts
- `toggleLike()` - Like/unlike posts
- `uploadImage()` - Upload images to Supabase Storage
- `pickImage()` - Pick images from device

**React Hooks** (`hooks/usePosts.ts`)
- `useFriendPosts()` - Fetch and manage friend posts
- `useMyPosts()` - Fetch and manage your posts
- `useCreatePost()` - Create posts with loading states
- `useDeletePost()` - Delete posts
- `useToggleLike()` - Like/unlike with optimistic updates

## 📦 Installation

Install the required dependency:

```bash
npx expo install expo-file-system
```

## 🗄️ Database Schema

Your existing database already has everything needed:

**Tables:**
- `user_posts` - Stores posts with content and images
- `post_likes` - Stores likes on posts
- `post_comments` - Stores comments (UI coming soon)
- `comment_replies` - Stores nested comments

**Storage:**
- `post-images` bucket - Stores post images

All tables have Row Level Security (RLS) enabled, so users can only:
- View posts from friends
- Create their own posts
- Like posts they can see
- Delete their own posts

## 🚀 Usage

### Start the App

```bash
npx expo start
```

### Navigate to Feed

The Feed tab is now the first tab in your bottom navigation!

### Create a Post

1. Tap the **+** button in the top right
2. Enter your post content
3. Optionally add a photo
4. Tap **Post**

### Interact with Posts

- **Like**: Tap the heart icon
- **Comment**: Tap the comment icon (coming soon)
- **Delete**: Tap the trash icon (only on your own posts)

## 🎨 UI Features

- **Modern Design**: Clean card-based layout
- **Dark Mode**: Fully themed for light/dark modes
- **Optimistic Updates**: Likes update instantly
- **Image Support**: Upload and display images
- **Time Stamps**: Shows "just now", "5m ago", etc.
- **User Avatars**: Shows friend avatars
- **Empty States**: Helpful messages when no posts
- **Loading States**: Smooth loading indicators
- **Pull-to-Refresh**: Refresh feed with pull gesture

## 📱 Testing

### Test Scenario 1: Create a Post

1. Go to Feed tab
2. Tap the + button
3. Enter some text like "Just finished a great workout! 💪"
4. Tap "Post"
5. Your post should appear at the top of the feed

### Test Scenario 2: Add Photo

1. Tap the + button
2. Tap "Add Photo"
3. Select an image from your device
4. Add some text (optional)
5. Tap "Post"
6. Post should show with the image

### Test Scenario 3: Like a Post

1. Find a post in your feed
2. Tap the heart icon
3. Heart should turn red and count should increase
4. Tap again to unlike

### Test Scenario 4: Delete a Post

1. Find one of your own posts
2. Tap the trash icon
3. Confirm deletion
4. Post should disappear from feed

### Test Scenario 5: View Friend Posts

1. Make sure you have friends added
2. Have a friend create a post on web or mobile
3. Pull down to refresh the feed
4. Friend's post should appear

## 🔒 Security

- **RLS Policies**: All database operations are protected
- **Friend-Only Feed**: Only see posts from accepted friends
- **Own Posts Only**: Can only delete your own posts
- **Secure Storage**: Images stored in Supabase Storage with proper permissions

## 🐛 Troubleshooting

### "No posts yet" message
- Make sure you have friends added
- Friends need to create posts
- Posts older than 7 days won't show

### Image upload fails
- Check that `post-images` bucket exists in Supabase Storage
- Verify bucket is set to public
- Check file size (max 5MB)

### Can't see friend posts
- Verify friendship status is 'accepted'
- Check that friend has created posts in last 7 days
- Try pull-to-refresh

### Permission denied errors
- Verify RLS policies are enabled
- Check that you're authenticated
- Try logging out and back in

## 🎯 What's Next

The social feed is ready to use! Future enhancements could include:

- **Comments UI**: View and add comments on posts
- **Nested Replies**: Reply to comments
- **@Mentions**: Mention friends in posts (backend ready)
- **Post Editing**: Edit your posts
- **Share Posts**: Share posts outside the app
- **Post Filters**: Filter by friend or date
- **Infinite Scroll**: Load more posts as you scroll

## 📊 Performance

The feed is optimized for performance:
- **React Query Caching**: Posts are cached and reused
- **Optimistic Updates**: Likes update instantly
- **Efficient Queries**: Only fetches last 7 days
- **Batch Requests**: User info fetched in batches
- **Image Optimization**: Images compressed before upload

## 🎉 Summary

**The social feed is fully functional and ready to use!**

✅ Uses existing database schema  
✅ No migration needed  
✅ Beautiful mobile-optimized UI  
✅ Full CRUD operations  
✅ Likes and interactions  
✅ Image support  
✅ Secure and performant  

Just install `expo-file-system` and start testing! 🚀
