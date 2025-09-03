export interface User {
	id: string;
	email: string;
	walletAddress: string;
	createdAt: string;
	csrfToken: string;
}

export interface GameStats {
	bestTime: number;
	totalRaces: number;
	totalTokens: number;
}

export interface RewardRequest {
	userAddress: string;
	amount: number;
	gameStats: GameStats;
	timestamp: number;
}

export interface VerificationResult {
	isValid: boolean;
	reason?: string;
}
