'use agent'
import { env } from 'cloudflare:workers'
import { CREW_DURABILITY, useCrewMember } from './use-crew-member'

export function Product1() {
	return useCrewMember('product-1', { model: env.MODEL_PRODUCT_1 })
}

Product1.agentName = 'product-1'
Product1.durability = CREW_DURABILITY
