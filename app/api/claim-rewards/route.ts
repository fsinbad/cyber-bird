import { NextRequest, NextResponse } from "next/server";
import { verifySessionAndCsrf } from "@/lib/cookies";
import { getUserDetails } from "@/lib/thirdweb";
import { validateGameStats, validateTimestamp, validateRewardAmount, validateRequestSize } from "@/lib/validation";

import axios from "axios";

interface RewardRequest {
	amount: number;
	gameStats: {
		bestTime: number;
		totalRaces: number;
	};
	timestamp: number;
}

export async function POST(request: NextRequest) {
	try {
		// Validate request size
		const sizeValidation = validateRequestSize(request);
		if (!sizeValidation.isValid) {
			return NextResponse.json(
				{ error: sizeValidation.error },
				{ status: 413 }
			);
		}

		// Verify authentication and CSRF token
		let authToken: string;
		try {
			const session = verifySessionAndCsrf(request);
			authToken = session.authToken;
		} catch (err: any) {
			const code = err?.message;
			const map: Record<string, number> = {
				NO_SESSION: 401,
				INVALID_CSRF: 403,
				BAD_ORIGIN: 403,
			};
			return NextResponse.json(
				{ error: code || "Unauthorized" },
				{ status: map[code] || 401 },
			);
		}

		const body: RewardRequest = await request.json();
		const { amount, gameStats, timestamp } = body;

		// Validate input data
		const gameStatsValidation = validateGameStats(gameStats);
		if (!gameStatsValidation.isValid) {
			return NextResponse.json(
				{ error: gameStatsValidation.error },
				{ status: 400 }
			);
		}

		const timestampValidation = validateTimestamp(timestamp);
		if (!timestampValidation.isValid) {
			return NextResponse.json(
				{ error: timestampValidation.error },
				{ status: 400 }
			);
		}

		const amountValidation = validateRewardAmount(amount);
		if (!amountValidation.isValid) {
			return NextResponse.json(
				{ error: amountValidation.error },
				{ status: 400 }
			);
		}

		// Get user wallet address from thirdweb API
		let userAddress: string;
		try {
			const userDetails = await getUserDetails(authToken);
			userAddress = userDetails.data.result.address;
		} catch (error) {
			return NextResponse.json(
				{ error: "Failed to retrieve user wallet address" },
				{ status: 500 },
			);
		}





		// Calculate server-side reward amount based on game performance
		const verifiedAmount = calculateServerSideReward(gameStats, amount);

		// Call thirdweb API to distribute tokens
		const tokenDistributionResult = await distributeTokens(
			userAddress,
			verifiedAmount,
		);

		if (!tokenDistributionResult.success) {
			return NextResponse.json(
				{ error: "Token distribution failed" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			message: `Successfully distributed ${verifiedAmount} tokens`,
			transactionHash: tokenDistributionResult.transactionHash,
			amount: verifiedAmount,
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}



// Calculate server-side reward amount to prevent client manipulation
function calculateServerSideReward(gameStats: any, clientAmount: number): number {
	// Base reward calculation based on game performance
	// This prevents clients from sending arbitrary amounts
	
	// Minimum reward for completing a game
	const baseReward = 1;
	
	// Bonus for good performance (faster times = more reward)
	// Scale: 1-5 tokens based on time (1 token for 5min, 5 tokens for 1min)
	const timeBonus = Math.max(1, Math.min(5, Math.floor(300000 / gameStats.bestTime)));
	
	// Calculate total reward
	const calculatedReward = baseReward + timeBonus;
	
	// Use the smaller of client amount or calculated amount to prevent inflation
	// but allow some client flexibility for special events
	const maxAllowedReward = calculatedReward * 2; // Allow up to 2x calculated amount
	
	return Math.min(clientAmount, maxAllowedReward);
}

async function distributeTokens(
	userAddress: string,
	amount: number,
): Promise<{ success: boolean; transactionHash?: string }> {
	try {
		// Convert amount to Wei
		const amountInWei = (amount * Math.pow(10, 18)).toString();

		// Validate required environment variables
		if (!process.env.THIRDWEB_SECRET_KEY) {
			throw new Error("THIRDWEB_SECRET_KEY environment variable is required");
		}
		if (!process.env.TOKEN_CONTRACT_ADDRESS) {
			throw new Error("TOKEN_CONTRACT_ADDRESS environment variable is required");
		}
		if (!process.env.ADMIN_ADDRESS) {
			throw new Error("ADMIN_ADDRESS environment variable is required");
		}
		if (!process.env.CHAIN_ID) {
			throw new Error("CHAIN_ID environment variable is required");
		}

		// Send the transaction via thirdweb contracts write API
		const response = await axios.post(
			"https://api.thirdweb.com/v1/contracts/write",
			{
				calls: [
					{
						contractAddress: process.env.TOKEN_CONTRACT_ADDRESS,
						method: "function mintTo(address to, uint256 amount)",
						params: [userAddress, amountInWei],
					},
				],
				chainId: parseInt(process.env.CHAIN_ID),
				from: process.env.ADMIN_ADDRESS,
			},
			{
				headers: {
					"Content-Type": "application/json",
					"x-secret-key": process.env.THIRDWEB_SECRET_KEY,
				},
			},
		);

		if (
			response.data.result?.transactionIds &&
			response.data.result.transactionIds.length > 0
		) {
			return {
				success: true,
				transactionHash: response.data.result.transactionIds[0],
			};
		} else {
			return { success: false };
		}
	} catch (error) {
		return { success: false };
	}
}
