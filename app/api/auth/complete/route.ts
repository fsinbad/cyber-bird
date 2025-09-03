import { NextRequest, NextResponse } from "next/server";
import { setSessionCookies, generateCsrfToken } from "@/lib/cookies";
import { validateEmail, validateAuthCode, validateRequestSize } from "@/lib/validation";

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

		const { email, code } = await request.json();

		// Validate email
		const emailValidation = validateEmail(email);
		if (!emailValidation.isValid) {
			return NextResponse.json(
				{ error: emailValidation.error },
				{ status: 400 }
			);
		}

		// Validate auth code
		const codeValidation = validateAuthCode(code);
		if (!codeValidation.isValid) {
			return NextResponse.json(
				{ error: codeValidation.error },
				{ status: 400 }
			);
		}

		// Validate required environment variable
		if (!process.env.THIRDWEB_SECRET_KEY) {
			return NextResponse.json(
				{ error: "Server configuration error" },
				{ status: 500 }
			);
		}

		// Verify login code using thirdweb API
		const response = await fetch("https://api.thirdweb.com/v1/auth/complete", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-secret-key": process.env.THIRDWEB_SECRET_KEY,
			},
			body: JSON.stringify({
				method: "email",
				email,
				code,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			return NextResponse.json(
				{ error: "Invalid or expired code" },
				{ status: 400 },
			);
		}

		const data = await response.json();

		// Generate CSRF up front so we can include it in body
		const csrfToken = generateCsrfToken();

		const user = {
			id: email,
			email,
			walletAddress: data.walletAddress || "unknown",
			createdAt: new Date().toISOString(),
			csrfToken,
		};

		const res = NextResponse.json({ user });
		setSessionCookies(res, {
			authToken: data.token,
			sessionMaxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
			csrfMaxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
			csrfToken,
		});

		return res;
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to verify login code" },
			{ status: 500 },
		);
	}
}
