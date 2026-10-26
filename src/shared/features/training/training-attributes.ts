/**
 * Player attributes the training feature's server component writes and its
 * HUD reads. Session state and server-computed rates, not profile data.
 */
export const TrainingAttribute = {
	/** boolean: a training session is running. */
	Training: "Training",
	/** number: Strength one completed rep grants right now. */
	StrengthPerRep: "StrengthPerRep",
	/** number: seconds one rep takes right now. */
	SecondsPerRep: "SecondsPerRep",
} as const;
