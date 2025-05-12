import { useMutation } from '@tanstack/react-query'
import supabase from './supabase-client'
import { ClientErrorInsert } from '@/types/main'

export async function monitorClientEvent(values: ClientErrorInsert) {
	return supabase.from('monitor_client_event').insert(values).select()
}

export function useMonitorClientEventMutation() {
	return useMutation({
		mutationFn: monitorClientEvent,
		onSuccess: (data, variables) =>
			console.log(
				`We have possibly logged a client error in the DB`,
				data,
				variables
			),
	})
}
