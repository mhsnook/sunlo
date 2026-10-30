'use agent'
import { useTool } from '@flue/runtime'
import { firstOfficerTools } from '../tools/command'
import { CREW_DURABILITY, useCrewMember } from './use-crew-member'

export function Command1() {
	const instructions = useCrewMember('command-1', { database: false })
	for (const tool of firstOfficerTools()) useTool(tool)
	return instructions
}

Command1.agentName = 'command-1'
Command1.durability = CREW_DURABILITY
