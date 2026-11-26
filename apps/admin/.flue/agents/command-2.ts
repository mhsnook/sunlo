'use agent'
import { env } from 'cloudflare:workers'
import { scienceOfficerTools } from '../tools/command'
import { CREW_DURABILITY, useCrewMember } from './use-crew-member'

export function Command2() {
	return useCrewMember('command-2', {
		model: env.MODEL_COMMAND_2,
		tools: scienceOfficerTools,
	})
}

Command2.agentName = 'command-2'
Command2.durability = CREW_DURABILITY
