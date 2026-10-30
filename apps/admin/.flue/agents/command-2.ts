'use agent'
import { useTool } from '@flue/runtime'
import { env } from 'cloudflare:workers'
import { scienceOfficerTools } from '../tools/command'
import { CREW_DURABILITY, useCrewMember } from './use-crew-member'

export function Command2() {
	const instructions = useCrewMember('command-2', {
		model: env.MODEL_COMMAND_2,
	})
	for (const tool of scienceOfficerTools()) useTool(tool)
	return instructions
}

Command2.agentName = 'command-2'
Command2.durability = CREW_DURABILITY
