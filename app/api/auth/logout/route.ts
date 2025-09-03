import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/cookies";

export async function POST(request: NextRequest) {
	try {
		const res = NextResponse.json({
			success: true,
			message: "Logged out successfully",
		});
		clearSessionCookies(res);
		return res;
	} catch (error) {
		return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
	}
}
