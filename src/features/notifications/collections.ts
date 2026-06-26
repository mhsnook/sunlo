import { createCollection } from '@tanstack/react-db'
import { supabaseCollectionOptions } from '@supabase-labs/tanstack-db'
import { NotificationSchema } from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const notificationsCollection = createCollection(
	supabaseCollectionOptions({
		tableName: 'notification',
		schema: NotificationSchema,
		keys: ['id'],
		supabase,
		queryClient,
		realtime: true,
	})
)
