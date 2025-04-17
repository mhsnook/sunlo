type FlagMap = {
	[key: string]:
		| {
				enabled: boolean
				disabled?: boolean
		  }
		| {
				disabled: boolean
				enabled?: boolean
		  }
}
export const flags: FlagMap = {
	smart_recommendations: { enabled: false },
	friend_recommendations: { enabled: false },
	friends_activity: { enabled: false },
	learning_goals: { enabled: false },
	text_to_speech: { enabled: false },
	cards_schedule_metadata: { enabled: false },
	deck_metadata_on_cards: { enabled: false },
	routines_goals: { enabled: false },
}
