'use agent'
import { env } from 'cloudflare:workers'
import { CREW_DURABILITY, useCrewMember } from './use-crew-member'

export function Product2() {
	return useCrewMember('product-2', { model: env.MODEL_PRODUCT_2 })
}

Product2.agentName = 'product-2'
Product2.durability = CREW_DURABILITY
