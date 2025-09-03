import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export function generateCsrfToken(): string {
	return randomBytes(32).toString("hex");
}

export interface SessionCookieOptions {
	authToken: string;
	sessionMaxAgeSeconds: number;
	csrfMaxAgeSeconds: number;
	csrfToken: string;
}

export function setSessionCookies(
	response: NextResponse,
	options: SessionCookieOptions,
): void {
	const { authToken, sessionMaxAgeSeconds, csrfMaxAgeSeconds, csrfToken } =
		options;

	// Set authentication token cookie
	response.cookies.set("auth-token", authToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: sessionMaxAgeSeconds,
		path: "/",
	});

	// Set CSRF token cookie
	response.cookies.set("csrf-token", csrfToken, {
		httpOnly: false, // Allow JavaScript access for CSRF validation
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: csrfMaxAgeSeconds,
		path: "/",
	});
}

export function validateCsrfToken(
	requestToken: string,
	cookieToken: string,
): boolean {
	return requestToken === cookieToken;
}
