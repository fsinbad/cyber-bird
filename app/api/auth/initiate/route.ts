import { NextRequest, NextResponse } from "next/server";
import { validateEmail, validateRequestSize } from "@/lib/validation";
import { rateLimitAuth } from "@/lib/rateLimit";

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

		const { email } = await request.json();

		// Validate email
		const emailValidation = validateEmail(email);
		if (!emailValidation.isValid) {
			return NextResponse.json(
				{ error: emailValidation.error },
				{ status: 400 }
			);
		}

		// Apply rate limiting for auth attempts
		const rateLimitResult = rateLimitAuth(email);
		if (!rateLimitResult.allowed) {
			return NextResponse.json(
				{ 
					error: "Too many login attempts. Please wait before trying again.",
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

		// Validate required environment variable
		if (!process.env.THIRDWEB_SECRET_KEY) {
			return NextResponse.json(
				{ error: "Server configuration error" },
				{ status: 500 }
			);
		}

		// Send login code using thirdweb API
		const response = await fetch("https://api.thirdweb.com/v1/auth/initiate", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-secret-key": process.env.THIRDWEB_SECRET_KEY,
			},
			body: JSON.stringify({
				method: "email",
				email,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			return NextResponse.json(
				{ error: "Failed to send login code" },
				{ status: 500 },
			);
		}

		const data = await response.json();

		return NextResponse.json({
			success: true,
			message: "Login code sent to your phone",
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to send login code" },
			{ status: 500 },
		);
	}
}
