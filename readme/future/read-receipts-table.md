# Future Architecture: Unified Notifications / Read Receipts Table

## Current Implementation

Chat message read tracking is currently implemented with a `read_at` column directly on the `chat_message` table:

- Sender inserts the message row
- Recipient can update the `read_at` field (via RLS policy)
- Collection's `onUpdate` callback handles persistence

This works but has an awkward ownership model where one user creates a row and another user modifies it.

## Proposed Architecture

Replace the `read_at` column with a dedicated **user_notification** table that can handle read receipts and other notification types uniformly.

### Schema

```sql
create type notification_type as enum(
	'chat_message',
	'friend_request',
	'feed_mention',
	'playlist_share',
	'system_alert'
);

create table user_notification (
	id uuid primary key default gen_random_uuid(),
	uid uuid not null references auth.users (id), -- who this notification is FOR
	notification_type notification_type not null,
	reference_id uuid not null, -- the chat_message.id, request.id, etc.
	reference_table text not null, -- 'chat_message', 'friend_request_action', etc.
	read_at timestamptz,
	created_at timestamptz default now() not null,
	unique (uid, notification_type, reference_id)
);

-- Simple RLS: users can only see/modify their own notifications
alter table user_notification enable row level security;

create policy "Users can view their own notifications" on user_notification for
select
	using (uid = auth.uid ());

create policy "Users can insert their own notifications" on user_notification for insert
with
	check (uid = auth.uid ());

create policy "Users can update their own notifications" on user_notification
for update
	using (uid = auth.uid ());

-- Index for efficient unread queries
create index user_notification_unread_idx on user_notification (uid, notification_type, read_at)
where
	read_at is null;
```

### Benefits

1. **Clean ownership model**: Each user only creates/modifies their own notification records
2. **Simple RLS**: All policies are just `uid = auth.uid()`
3. **Extensible**: New notification types just add an enum value
4. **Unified notifications UI**: Could power a single notifications dropdown/page
5. **Push notification ready**: Query unread notifications to send push alerts
6. **Activity tracking**: Could extend to track "seen" vs "read" vs "acted upon"

### Migration Path

1. Create the new `user_notification` table
2. Add a database trigger on `chat_message` INSERT that creates a notification for the recipient
3. Update the frontend to:
   - Query `user_notification` for unread counts
   - Mark notifications as read instead of updating `chat_message.read_at`
4. Remove `read_at` column from `chat_message` (or keep for backwards compat)
5. Optionally backfill notifications for existing messages

### Frontend Changes

```typescript
// New collection for notifications
export const notificationsCollection = createCollection(
	queryCollectionOptions({
		id: 'user_notifications',
		queryKey: ['user', 'notification'],
		queryFn: async () => {
			const { data } = await supabase
				.from('user_notification')
				.select()
				.throwOnError()
			return data ?? []
		},
		onUpdate: async (item) => {
			await supabase
				.from('user_notification')
				.update({ read_at: item.read_at })
				.eq('id', item.id)
				.throwOnError()
		},
		// ...
	})
)

// Hook to get unread chat message count
export const useUnreadChatsCount = () => {
	return useLiveQuery(
		(q) =>
			q
				.from({ n: notificationsCollection })
				.where(({ n }) =>
					and(eq(n.notification_type, 'chat_message'), isNull(n.read_at))
				)
				.fn.select(({ n }) => n.reference_id),
		[]
	)
}
```

### Other Use Cases This Enables

- **Friend request badges**: Show count of pending friend requests
- **Feed mentions**: Notify users when someone mentions them in a comment
- **Playlist shares**: Notify when a friend shares a playlist with you
- **System alerts**: App announcements, feature updates, etc.
- **Activity digest**: "You have 3 unread messages and 2 new friend requests"

## Decision

For now, we're using the simpler `read_at` column approach with `collection.onUpdate()`. This architecture should be revisited when:

- We need other notification types beyond chat read receipts
- We want a unified notifications UI
- We implement push notifications
- The ownership model becomes problematic
