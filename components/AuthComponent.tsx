"use client";

import { useState } from "react";
import axios from "axios";

interface AuthComponentProps {
	onAuthenticated: (
		address: string,
		email: string,
		rememberMe: boolean,
		csrfToken: string,
	) => void;
}

export function AuthComponent({ onAuthenticated }: AuthComponentProps) {
	const [email, setEmail] = useState("");
	const [otpCode, setOtpCode] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [showOtpInput, setShowOtpInput] = useState(false);
	const [rememberMe, setRememberMe] = useState(true);

	const handleInitiateAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setMessage("");

		try {
			// Call our backend API - only needs email
			const response = await axios.post("/api/auth/initiate", {
				email: email,
			});

			if (response.data.success) {
				setMessage("✅ Verification code sent to your email!");
				setShowOtpInput(true);
			} else {
				setMessage("❌ Failed to send verification code. Please try again.");
			}
		} catch (error: any) {
			setMessage(
				`❌ Error: ${error.response?.data?.error || "Failed to initiate authentication"}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCompleteAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!otpCode.trim()) {
			setMessage("❌ Please enter the verification code");
			return;
		}

		setIsLoading(true);
		setMessage("");

		try {
			// Call our backend API - needs email and code
			const response = await axios.post("/api/auth/complete", {
				email: email,
				code: otpCode,
			});

			if (response.data.user?.walletAddress) {
				setMessage("🎉 Authentication successful!");

				// Get CSRF token from response headers
				const csrfToken = response.headers["x-csrf-token"] || "";

				onAuthenticated(
					response.data.user.walletAddress,
					email,
					rememberMe,
					csrfToken,
				);
			} else {
				setMessage(
					"❌ Authentication failed. Please check your code and try again.",
				);
			}
		} catch (error: any) {
			setMessage(
				`❌ Error: ${error.response?.data?.error || "Authentication failed"}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleResendCode = async () => {
		setIsLoading(true);
		setMessage("");

		try {
			// Call our backend API to resend code
			const response = await axios.post("/api/auth/initiate", {
				email: email,
			});

			if (response.data.success) {
				setMessage("✅ New verification code sent!");
			} else {
				setMessage("❌ Failed to resend code. Please try again.");
			}
		} catch (error: any) {
			setMessage(
				`❌ Error: ${error.response?.data?.error || "Failed to resend code"}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="bg-gradient-to-r from-white/15 to-white/5 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl border border-white/20 relative overflow-hidden">
			{/* Background decorative elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>
				<div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl"></div>
			</div>

			<div className="relative z-10">
				<div className="text-center mb-8">
					<div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-2xl">
						🚀
					</div>
					<h2 className="text-4xl font-black bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent mb-2">
						Login to Race
					</h2>
					<p className="text-gray-300 text-lg">
						Enter your email to get started
					</p>
				</div>

				{!showOtpInput ? (
					<form onSubmit={handleInitiateAuth} className="space-y-8">
						<div>
							<label
								htmlFor="email"
								className="block text-lg font-semibold text-gray-200 mb-3"
							>
								📧 Email Address
							</label>
							<input
								type="email"
								id="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-200 text-lg backdrop-blur-sm"
								placeholder="Enter your email address"
								required
							/>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-blue-500/25 text-lg"
						>
							{isLoading ? "🔄 Sending Code..." : "📧 Send Verification Code"}
						</button>
					</form>
				) : (
					<form onSubmit={handleCompleteAuth} className="space-y-8">
						<div>
							<label
								htmlFor="otp"
								className="block text-lg font-semibold text-gray-200 mb-3"
							>
								🔐 Verification Code
							</label>
							<input
								type="text"
								id="otp"
								value={otpCode}
								onChange={(e) => setOtpCode(e.target.value)}
								className="w-full px-6 py-4 bg-white/10 border-2 border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-green-500/30 focus:border-green-400 transition-all duration-200 text-center text-3xl tracking-widest font-mono backdrop-blur-sm"
								placeholder="123456"
								maxLength={6}
								required
							/>
							<p className="text-sm text-gray-400 mt-3 text-center">
								Enter the 6-digit code sent to{" "}
								<span className="text-blue-300 font-semibold">{email}</span>
							</p>
						</div>

						{/* Remember Me Checkbox */}
						<div className="flex items-center justify-center">
							<input
								type="checkbox"
								id="rememberMe"
								checked={rememberMe}
								onChange={(e) => setRememberMe(e.target.checked)}
								className="w-5 h-5 text-blue-600 bg-white/20 border-2 border-white/30 rounded-lg focus:ring-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent"
							/>
							<label
								htmlFor="rememberMe"
								className="ml-3 text-lg text-gray-200 font-medium"
							>
								{rememberMe
									? "💾 Remember me for 7 days"
									: "⚠️ Don't save my login"}
							</label>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-green-500/25 text-lg"
						>
							{isLoading ? "🔄 Verifying..." : "✅ Verify & Login"}
						</button>

						<div className="text-center space-y-4">
							<button
								type="button"
								onClick={handleResendCode}
								disabled={isLoading}
								className="text-blue-400 hover:text-blue-300 text-lg underline hover:no-underline disabled:opacity-50 transition-all duration-200 hover:scale-105"
							>
								🔄 Didn't receive code? Resend
							</button>

							<div>
								<button
									type="button"
									onClick={() => {
										setShowOtpInput(false);
										setOtpCode("");
										setMessage("");
									}}
									className="text-gray-400 hover:text-gray-300 text-lg underline hover:no-underline transition-all duration-200 hover:scale-105"
								>
									← Back to email input
								</button>
							</div>
						</div>
					</form>
				)}

				{message && (
					<div
						className={`mt-8 p-4 rounded-2xl text-center text-lg font-medium border-2 ${
							message.includes("✅") || message.includes("🎉")
								? "bg-green-500/20 border-green-500/30 text-green-200"
								: message.includes("❌")
									? "bg-red-500/20 border-red-500/30 text-red-200"
									: "bg-blue-500/20 border-blue-500/30 text-blue-200"
						}`}
					>
						{message}
					</div>
				)}

				<div className="mt-10 text-center space-y-3">
					<p className="text-gray-300 text-lg font-medium">
						🔒 Secure authentication via thirdweb
					</p>
				</div>
			</div>
		</div>
	);
}
