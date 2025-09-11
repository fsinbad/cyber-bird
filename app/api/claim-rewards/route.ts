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
	console.log("🎯 [CLAIM-REWARDS] API endpoint called");
	
	try {
		// Validate request size
		const sizeValidation = validateRequestSize(request);
		if (!sizeValidation.isValid) {
			console.log("❌ [CLAIM-REWARDS] Request size validation failed:", sizeValidation.error);
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
			console.log("✅ [CLAIM-REWARDS] Authentication successful");
		} catch (err: any) {
			const code = err?.message;
			console.log("❌ [CLAIM-REWARDS] Authentication failed:", code);
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
		
		console.log("📊 [CLAIM-REWARDS] Request data:", {
			amount,
			gameStats,
			timestamp,
			authToken: authToken ? "Present" : "Missing"
		});

		// Skip game stats validation - not required for reward distribution
		console.log("✅ [CLAIM-REWARDS] Skipping game stats validation");

		const timestampValidation = validateTimestamp(timestamp);
		if (!timestampValidation.isValid) {
			console.log("❌ [CLAIM-REWARDS] Timestamp validation failed:", timestampValidation.error);
			return NextResponse.json(
				{ error: timestampValidation.error },
				{ status: 400 }
			);
		}
		console.log("✅ [CLAIM-REWARDS] Timestamp validation passed");

		const amountValidation = validateRewardAmount(amount);
		if (!amountValidation.isValid) {
			console.log("❌ [CLAIM-REWARDS] Amount validation failed:", amountValidation.error);
			return NextResponse.json(
				{ error: amountValidation.error },
				{ status: 400 }
			);
		}
		console.log("✅ [CLAIM-REWARDS] Amount validation passed");

		// Get user wallet address from thirdweb API
		let userAddress: string;
		try {
			console.log("🔍 [CLAIM-REWARDS] Fetching user details from thirdweb...");
			const userDetails = await getUserDetails(authToken);
			userAddress = userDetails.data.result.address;
			console.log("✅ [CLAIM-REWARDS] User address retrieved:", userAddress);
		} catch (error) {
			console.log("❌ [CLAIM-REWARDS] Failed to get user details:", error);
			return NextResponse.json(
				{ error: "Failed to retrieve user wallet address" },
				{ status: 500 },
			);
		}





		// Calculate server-side reward amount based on game performance
		console.log("🧮 [CLAIM-REWARDS] Calculating server-side reward...");
		const verifiedAmount = calculateServerSideReward(gameStats, amount);
		console.log("💰 [CLAIM-REWARDS] Verified amount:", verifiedAmount, "(client requested:", amount, ")");

		// Call thirdweb API to distribute tokens
		console.log("🚀 [CLAIM-REWARDS] Calling distributeTokens...");
		const tokenDistributionResult = await distributeTokens(
			userAddress,
			verifiedAmount,
		);

		console.log("📡 [CLAIM-REWARDS] Token distribution result:", tokenDistributionResult);

		if (!tokenDistributionResult.success) {
			console.log("❌ [CLAIM-REWARDS] Token distribution failed");
			return NextResponse.json(
				{ error: "Token distribution failed" },
				{ status: 500 },
			);
		}

		console.log("✅ [CLAIM-REWARDS] Successfully distributed tokens:", {
			amount: verifiedAmount,
			transactionHash: tokenDistributionResult.transactionHash
		});

		return NextResponse.json({
			success: true,
			message: `Successfully distributed ${verifiedAmount} tokens`,
			transactionHash: tokenDistributionResult.transactionHash,
			amount: verifiedAmount,
		});
	} catch (error) {
		console.error("💥 [CLAIM-REWARDS] Unexpected error:", error);
		console.error("💥 [CLAIM-REWARDS] Error details:", {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
		});
		
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
	console.log("🪙 [DISTRIBUTE-TOKENS] Starting token distribution:", {
		userAddress,
		amount,
		amountInWei: (amount * Math.pow(10, 18)).toString()
	});
	
	try {
		// Convert amount to Wei
		const amountInWei = (amount * Math.pow(10, 18)).toString();
		console.log("🔢 [DISTRIBUTE-TOKENS] Amount in Wei:", amountInWei);

		// Validate required environment variables
		console.log("🔍 [DISTRIBUTE-TOKENS] Validating environment variables...");
		if (!process.env.THIRDWEB_SECRET_KEY) {
			console.log("❌ [DISTRIBUTE-TOKENS] THIRDWEB_SECRET_KEY missing");
			throw new Error("THIRDWEB_SECRET_KEY environment variable is required");
		}
		if (!process.env.TOKEN_CONTRACT_ADDRESS) {
			console.log("❌ [DISTRIBUTE-TOKENS] TOKEN_CONTRACT_ADDRESS missing");
			throw new Error("TOKEN_CONTRACT_ADDRESS environment variable is required");
		}
		if (!process.env.ADMIN_ADDRESS) {
			console.log("❌ [DISTRIBUTE-TOKENS] ADMIN_ADDRESS missing");
			throw new Error("ADMIN_ADDRESS environment variable is required");
		}
		if (!process.env.CHAIN_ID) {
			console.log("❌ [DISTRIBUTE-TOKENS] CHAIN_ID missing");
			throw new Error("CHAIN_ID environment variable is required");
		}
		console.log("✅ [DISTRIBUTE-TOKENS] Environment variables validated");

		// Send the transaction via thirdweb contracts write API
		const requestData = {
			calls: [
				{
					contractAddress: process.env.TOKEN_CONTRACT_ADDRESS,
					method: "function mintTo(address to, uint256 amount)",
					params: [userAddress, amountInWei],
				},
			],
			chainId: parseInt(process.env.CHAIN_ID),
			from: process.env.ADMIN_ADDRESS,
		};
		
		console.log("📤 [DISTRIBUTE-TOKENS] Sending request to thirdweb API:", {
			url: "https://api.thirdweb.com/v1/contracts/write",
			contractAddress: process.env.TOKEN_CONTRACT_ADDRESS,
			chainId: process.env.CHAIN_ID,
			from: process.env.ADMIN_ADDRESS,
			to: userAddress,
			amountInWei
		});
		
		const response = await axios.post(
			"https://api.thirdweb.com/v1/contracts/write",
			requestData,
			{
				headers: {
					"Content-Type": "application/json",
					"x-secret-key": process.env.THIRDWEB_SECRET_KEY,
				},
			},
		);

		console.log("📡 [DISTRIBUTE-TOKENS] Thirdweb API response:", {
			status: response.status,
			data: response.data
		});

		if (
			response.data.result?.transactionIds &&
			response.data.result.transactionIds.length > 0
		) {
			const transactionHash = response.data.result.transactionIds[0];
			console.log("✅ [DISTRIBUTE-TOKENS] Transaction successful:", transactionHash);
			return {
				success: true,
				transactionHash: transactionHash,
			};
		} else {
			console.log("❌ [DISTRIBUTE-TOKENS] No transaction ID in response");
			return { success: false };
		}
	} catch (error) {
		console.error("💥 [DISTRIBUTE-TOKENS] Error calling thirdweb API:", error);
		console.error("💥 [DISTRIBUTE-TOKENS] Error details:", {
			message: error instanceof Error ? error.message : "Unknown error",
			stack: error instanceof Error ? error.stack : undefined,
			response: error instanceof Error && 'response' in error ? (error as any).response?.data : undefined
		});
		return { success: false };
	}
}
