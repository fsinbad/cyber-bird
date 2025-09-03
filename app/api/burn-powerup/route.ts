import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { verifySessionAndCsrf } from "@/lib/cookies";
import {
	createThirdwebClient,
	defineChain,
	getContract,
	encode,
} from "thirdweb";
import { burnBatch } from "thirdweb/extensions/erc1155";
import { getUserDetails } from "@/lib/thirdweb";
import { validateTokenId, validateQuantity, validateRequestSize } from "@/lib/validation";

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

		// Only allow burning power-ups (tokenId 4 and 5)
		if (tokenId !== 4 && tokenId !== 5) {
			return NextResponse.json(
				{ error: "Only power-ups can be burned" },
				{ status: 400 },
			);
		}

		// Create thirdweb client and contract
		let client, contract, transaction, encodedData;
		try {
			client = createThirdwebClient({ clientId: env.THIRDWEB_CLIENT_ID });
			contract = getContract({
				client,
				chain: defineChain(parseInt(env.CHAIN_ID)),
				address: "0x3d0Ba0690ADFfE3aD06159974Ba380CDBBCde604",
			});

			// Create burnBatch transaction
			transaction = burnBatch({
				contract,
				account: userAddress,
				ids: [BigInt(tokenId)],
				values: [BigInt(quantity)],
			});

			// Encode transaction
			encodedData = await encode(transaction);
		} catch (error) {
			return NextResponse.json(
				{ error: "Failed to create burn transaction" },
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
					from: userAddress,
					transactions: [
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
					{ error: `Burn transaction failed: ${response.status}` },
					{ status: response.status },
				);
			}

			result = await response.json();
		} catch (error) {
			return NextResponse.json(
				{ error: "Failed to send burn transaction" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			transactionIds: result.transactionIds || [],
			tokenId,
			quantity,
			message: `Successfully burned ${quantity} power-up(s)`,
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to burn power-up" },
			{ status: 500 },
		);
	}
}
