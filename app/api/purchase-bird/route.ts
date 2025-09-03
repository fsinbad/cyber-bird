import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { verifySessionAndCsrf } from "@/lib/cookies";
import {
	createThirdwebClient,
	defineChain,
	getContract,
	encode,
	toWei,
} from "thirdweb";
import { approve } from "thirdweb/extensions/erc20";
import { claimTo } from "thirdweb/extensions/erc1155";
import { getUserDetails } from "@/lib/thirdweb";
import { validateTokenId, validateQuantity, validateRequestSize } from "@/lib/validation";
import { rateLimitPurchases } from "@/lib/rateLimit";

// Bird and Power-up prices in $ORBS tokens (tokenId -> price)
const BIRD_PRICES = [30, 40, 50, 20, 10, 10]; // [neon-ronin, circuitwing, chainlord, orb-sentinel, slowmo, shield]

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

		// Verify cookie session + CSRF
		let authToken: string;
		let userAddress: string;
		try {
			const session = verifySessionAndCsrf(request);
			authToken = session.authToken;

					// Get user details from auth token
		const userDetails = await getUserDetails(authToken);
		userAddress = userDetails.data.result.address;
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

	// Apply rate limiting for purchases
	const rateLimitResult = rateLimitPurchases(userAddress);
	if (!rateLimitResult.allowed) {
		return NextResponse.json(
			{ 
				error: "Rate limit exceeded. Please wait before making another purchase.",
				resetTime: rateLimitResult.resetTime
			},
			{ 
				status: 429,
				headers: {
					'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
					'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
				}
			}
		);
	}

		// Parse request body
		const { tokenId, quantity } = await request.json();

		// Validate tokenId
		const tokenIdValidation = validateTokenId(tokenId);
		if (!tokenIdValidation.isValid) {
			return NextResponse.json(
				{ error: tokenIdValidation.error },
				{ status: 400 },
			);
		}

		// Validate quantity
		const quantityValidation = validateQuantity(quantity);
		if (!quantityValidation.isValid) {
			return NextResponse.json(
				{ error: quantityValidation.error },
				{ status: 400 },
			);
		}

		// Get bird price and convert to wei
		const priceInTokens = BIRD_PRICES[tokenId];
		if (!priceInTokens) {
			return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
		}
		const totalPriceInTokens = priceInTokens * quantity; // Multiply by quantity
		const priceInWei = toWei(totalPriceInTokens.toString()); // Convert total price to wei

		// Create thirdweb client and contract
		let client,
			contract,
			transaction,
			encodedData,
			erc20Contract,
			transactionApprove,
			encodedDataApprove;
		try {
			client = createThirdwebClient({ clientId: env.THIRDWEB_CLIENT_ID });
			contract = getContract({
				client,
				chain: defineChain(parseInt(env.CHAIN_ID)),
				address: "0x3d0Ba0690ADFfE3aD06159974Ba380CDBBCde604",
			});
			erc20Contract = getContract({
				client,
				chain: defineChain(parseInt(env.CHAIN_ID)),
				address: "0x15536ea8CcAEB134BD2FCd6E9E126C2F935eb7F0",
			});

			// Create claimTo transaction
			transaction = claimTo({
				contract,
				to: userAddress, // Use actual user address from auth token
				tokenId: BigInt(tokenId),
				quantity: BigInt(quantity),
			});

			transactionApprove = approve({
				contract: erc20Contract,
				spender: "0x3d0Ba0690ADFfE3aD06159974Ba380CDBBCde604",
				amountWei: priceInWei, // Use price in wei based on selected token
			});

			// Encode transaction
			encodedData = await encode(transaction);
			encodedDataApprove = await encode(transactionApprove);
		} catch (error) {
			return NextResponse.json(
				{ error: "Failed to create transaction" },
				{ status: 500 },
			);
		}

		// Send transaction via thirdweb API
		let response, result;
		try {
			response = await fetch(`${env.THIRDWEB_API_BASE_URL}/v1/transactions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authToken}`,
					"x-secret-key": env.THIRDWEB_SECRET_KEY,
				},
				body: JSON.stringify({
					chainId: env.CHAIN_ID,
					from: userAddress, // Use actual user address from auth token
					transactions: [
						{
							data: encodedDataApprove,
							to: "0x15536ea8CcAEB134BD2FCd6E9E126C2F935eb7F0",
							value: "0",
						},
						{
							data: encodedData,
							to: "0x3d0Ba0690ADFfE3aD06159974Ba380CDBBCde604",
							value: "0",
						},
					],
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				return NextResponse.json(
					{ error: `Transaction failed: ${response.status}` },
					{ status: response.status },
				);
			}

			result = await response.json();
		} catch (error) {
			return NextResponse.json(
				{ error: "Failed to send transaction" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			transactionIds: result.transactionIds || [],
			tokenId,
			quantity,
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to purchase bird" },
			{ status: 500 },
		);
	}
}
