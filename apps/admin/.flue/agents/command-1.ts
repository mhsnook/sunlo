'use agent'
import { firstOfficerTools } from '../tools/command'
import { CREW_DURABILITY, useCrewMember } from './use-crew-member'

export function Command1() {
	return useCrewMember('command-1', {
		database: false,
		tools: () => firstOfficerTools(),
	})
}

Command1.agentName = 'command-1'
Command1.durability = CREW_DURABILITY
