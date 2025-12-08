# Motivation Feature Implementation

## Overview
The motivation feature has been successfully merged from the web application to the React Native app. This feature allows users to send motivational messages to friends and request motivation from all friends.

## Files Created

### 1. `services/notificationService.ts`
Complete notification service with the following capabilities:
- **getNotifications()** - Fetch all notifications for current user
- **markAsRead(notificationId)** - Mark a notification as read
- **markAllAsRead()** - Mark all notifications as read
- **deleteNotification(notificationId)** - Delete a notification
- **createNotification(notification)** - Create a new notification (uses RPC to bypass RLS)
- **subscribeToNotifications(callback)** - Real-time notification subscription

### 2. `services/motivationService.ts`
Dedicated motivation service with:
- **sendMotivation(friendIds, message)** - Send motivation to selected friends
- **requestMotivation()** - Request motivation from all friends

Both functions create notifications with appropriate types:
- `motivation_received` - When someone sends you motivation
- `motivation_request` - When someone requests motivation

## Files Modified

### `app/(tabs)/feed.tsx`
Added motivation UI and functionality:

#### New State Variables
- `showMotivationModal` - Controls motivation modal visibility
- `selectedMotivationFriends` - Array of friends selected to receive motivation
- `motivationMessage` - The motivation message content
- `isSendingMotivation` - Loading state for sending
- `isRequestingMotivation` - Loading state for requesting

#### New Functions
- `handleSendMotivation()` - Validates and sends motivation to selected friends
- `handleRequestMotivation()` - Sends motivation request to all friends
- `toggleFriendSelection(friend)` - Toggles friend selection in modal

#### UI Components Added
1. **Header Actions** - Two new buttons in the feed header:
   - ✨ Sparkles icon - Opens motivation modal to send motivation
   - 🤚 Hand icon - Requests motivation from all friends

2. **Motivation Modal** - Full-screen modal with:
   - Friend selection list with checkboxes
   - Message input field (max 300 characters)
   - Send button (disabled until friends selected and message entered)
   - Scrollable content with keyboard handling

#### New Styles
- `headerActions` - Container for header buttons
- `motivationButton` - Circular button style for motivation actions
- `sectionLabel` - Label for modal sections
- `friendsList` - Container for friend selection list
- `friendItem` - Individual friend selection item
- `friendAvatar` - Friend avatar in selection list
- `friendName` - Friend name text style
- `checkmark` - Checkmark icon position

## Features

### Send Motivation
1. Tap the sparkles (✨) icon in the feed header
2. Select one or more friends from the list
3. Write a motivational message (up to 300 characters)
4. Tap "Send" to deliver motivation
5. Each friend receives a notification with your message

### Request Motivation
1. Tap the hand (🤚) icon in the feed header
2. A notification is sent to ALL your friends
3. Friends receive a "Motivation Request" notification
4. They can respond by sending you motivation

## Database Integration

### Notifications Table
The feature uses the existing `notifications` table with:
- `type`: 'motivation_received' or 'motivation_request'
- `title`: Notification title
- `message`: Brief description
- `data`: JSON object containing:
  - `sender_id` / `requester_id`
  - `sender_name` / `requester_name`
  - `sender_username` / `requester_username`
  - `motivation_message` (for received motivation)

### RPC Function
Uses `create_notification_for_user` RPC function to bypass RLS policies, allowing users to create notifications for other users.

## User Experience

### Visual Design
- **Motivation buttons** - Subtle tinted background with border, matching app theme
- **Friend selection** - Clear visual feedback with tinted background when selected
- **Checkmarks** - Green checkmark appears next to selected friends
- **Loading states** - Spinner shows during request/send operations
- **Disabled states** - Send button grays out when invalid

### Feedback
- Success alerts confirm when motivation is sent/requested
- Error alerts show if something goes wrong
- Friend count displayed in success messages
- Empty state message if no friends available

## Error Handling
- Validates friend selection before sending
- Validates message content before sending
- Catches and displays errors from API calls
- Gracefully handles missing user profiles
- Continues if individual notifications fail (logs warning)

## Dependencies
- Uses existing `useFriends` hook to fetch friends list
- Integrates with existing `friendService` for friend data
- Uses Supabase for notifications and user data
- Compatible with existing auth context

## Testing Checklist

### Send Motivation
- [ ] Open motivation modal from feed
- [ ] Select single friend
- [ ] Select multiple friends
- [ ] Deselect friends
- [ ] Enter motivation message
- [ ] Send button enables/disables correctly
- [ ] Success message shows correct friend count
- [ ] Modal closes after sending
- [ ] Recipients receive notifications

### Request Motivation
- [ ] Tap request button
- [ ] Loading spinner appears
- [ ] Success message shows friend count
- [ ] All friends receive notification
- [ ] Works with 0 friends (shows error)
- [ ] Works with 1 friend
- [ ] Works with many friends

### Edge Cases
- [ ] No friends available (shows empty state)
- [ ] Network error during send
- [ ] Invalid user session
- [ ] Very long motivation message (respects 300 char limit)
- [ ] Rapid button tapping (disabled during operation)

## Future Enhancements
- View received motivation in a dedicated screen
- Respond to motivation requests directly from notification
- Add emoji picker for motivation messages
- Track motivation history
- Add pre-written motivation templates
- Allow attaching images to motivation
- Add motivation streaks/badges

## Notes
- Motivation messages are limited to 300 characters
- Request motivation sends to ALL friends (no selection)
- Notifications persist in database until deleted
- Real-time updates available via subscription
- Works in both light and dark mode
