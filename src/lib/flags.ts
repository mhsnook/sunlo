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
	learning_goals: { enabled: false },
	text_to_speech: { enabled: false },
	client_side_fsrs_scheduling: { enabled: false },
	phrase_request_likes: { enabled: false },
	friend_recommendations: { enabled: false },
	multiple_languages_feed: { disabled: true },
	favourite_answer: { enabled: false },
	request_comments: { enabled: false },
}
