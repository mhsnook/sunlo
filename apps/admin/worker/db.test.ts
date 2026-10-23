import { describe, expect, it } from 'vitest'
import { sslFor } from './db'

describe('sslFor', () => {
	it('uses plain TCP for local Supabase', () => {
		expect(
			sslFor('postgresql://admin_reader:pw@127.0.0.1:54322/postgres')
		).toBe(false)
		expect(
			sslFor('postgresql://admin_reader:pw@localhost:54322/postgres')
		).toBe(false)
	})

	it('requires TLS for every other host', () => {
		expect(
			sslFor(
				'postgresql://admin_reader.ref:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'
			)
		).toBe('require')
	})
})
