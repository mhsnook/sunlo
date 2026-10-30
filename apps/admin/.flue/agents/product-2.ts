'use agent'
import { useSkill, useTool } from '@flue/runtime'
import { env } from 'cloudflare:workers'
import impeccable from '../skills/impeccable/SKILL.md'
import { designTools } from '../tools/design'
import { CREW_DURABILITY, useCrewMember } from './use-crew-member'

export function Product2() {
	const instructions = useCrewMember('product-2', {
		model: env.MODEL_PRODUCT_2,
	})
	for (const tool of designTools('product-2')) useTool(tool)
	useSkill(impeccable)
	return instructions
}

Product2.agentName = 'product-2'
Product2.durability = CREW_DURABILITY
