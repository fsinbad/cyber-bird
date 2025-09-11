"use client";

import { useState, useEffect } from "react";
import { FlappyBird } from "@/components/FlappyBird";
import { AuthComponent } from "@/components/AuthComponent";
import { CyberShop } from "@/components/CyberShop";
import { env } from "@/lib/env";

interface SavedAuthData {
	userAddress: string;
	email: string;
	timestamp: number;
	csrfToken?: string;
}

export default function Home() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [userAddress, setUserAddress] = useState<string | null>(null);
	const [userEmail, setUserEmail] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState({
		title: "",
		subtitle: "",
		isAutoLogin: false,
	});
	const [loginTimestamp, setLoginTimestamp] = useState<number | null>(null);
	const [gameStats, setGameStats] = useState({
		bestTime: Infinity,
		totalGames: 0,
		totalCoins: 0,
	});
	const [vibesBalance, setVibesBalance] = useState<string>("0");
	const [birdBalances, setBirdBalances] = useState<number[]>([
		0, 0, 0, 0, 0, 0,
	]); // [neon-ronin, circuitwing, chainlord, orb-sentinel, slowmo, shield]

	// Function to fetch VIBES balance directly from API
	const fetchVibesBalance = async (userAddress: string): Promise<string> => {
		try {
			const response = await fetch(
				`${env.THIRDWEB_API_BASE_URL}/v1/contracts/read`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-client-id": env.THIRDWEB_CLIENT_ID,
					},
					body: JSON.stringify({
						calls: [
							{
								contractAddress: "0x15536ea8CcAEB134BD2FCd6E9E126C2F935eb7F0",
								method:
									"function balanceOf(address account) view returns (uint256)",
								params: [userAddress],
							},
						],
						chainId: parseInt(env.CHAIN_ID),
					}),
				},
			);

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`);
			}

			const data = await response.json();

			// Handle the actual response format: {result: [{data: "95000000000000000000", success: true}]}
			if (
				data.result &&
				Array.isArray(data.result) &&
				data.result[0] &&
				data.result[0].success &&
				data.result[0].data
			) {
				const rawBalance = data.result[0].data;
				// Convert from wei (18 decimals) to actual token amount
				const balance = (BigInt(rawBalance) / BigInt(10 ** 18)).toString();
				return balance;
			} else {
				throw new Error("Invalid API response format");
			}
		} catch (error) {
			return "0";
		}
	};

	// Function to fetch bird balances
	const fetchBirdBalances = async (userAddress: string): Promise<number[]> => {
		try {
			const response = await fetch(
				`${env.THIRDWEB_API_BASE_URL}/v1/contracts/read`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-client-id": env.THIRDWEB_CLIENT_ID,
					},
					body: JSON.stringify({
						calls: [
							{
								contractAddress: "0x3d0Ba0690ADFfE3aD06159974Ba380CDBBCde604",
								method:
									"function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
								params: [
									[
										userAddress,
										userAddress,
										userAddress,
										userAddress,
										userAddress,
										userAddress,
									],
									["0", "1", "2", "3", "4", "5"],
								],
							},
						],
						chainId: parseInt(env.CHAIN_ID),
					}),
				},
			);

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status}`);
			}

			const data = await response.json();

			if (
				data.result &&
				Array.isArray(data.result) &&
				data.result[0] &&
				data.result[0].success &&
				data.result[0].data
			) {
				const rawBalances = data.result[0].data;
				// Convert from wei to actual token amounts
				const balances = rawBalances.map((balance: string) =>
					parseInt(balance),
				);
				return balances;
			} else {
				throw new Error("Invalid API response format");
			}
		} catch (error) {
			return [0, 0, 0, 0, 0, 0];
		}
	};

	// Check for saved authentication on page load
	useEffect(() => {
		const savedAuth = localStorage.getItem("cryptoRacerAuth");
		if (savedAuth) {
			try {
				const authData: SavedAuthData = JSON.parse(savedAuth);
				const now = Date.now();
				const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

				// Check if the saved auth is still valid (not expired)
				if (now - authData.timestamp < maxAge) {
					// Simulate a brief loading delay for better UX
					setTimeout(async () => {
						setIsAuthenticated(true);
						setUserAddress(authData.userAddress);
						setUserEmail(authData.email);
						setLoginTimestamp(authData.timestamp);

						setIsLoading(false);

						// Load $VIBES balance and bird balances
						const balance = await fetchVibesBalance(authData.userAddress);
						setVibesBalance(balance);

						const birdBalances = await fetchBirdBalances(authData.userAddress);
						setBirdBalances(birdBalances);

						setToastMessage({
							title: "Welcome back!",
							subtitle: `You've been automatically logged in as ${authData.email}`,
							isAutoLogin: true,
						});
						setShowToast(true);

						// Hide toast after 4 seconds
						setTimeout(() => setShowToast(false), 4000);
					}, 800);
				} else {
					// Clear expired auth data
					localStorage.removeItem("cryptoRacerAuth");
					setIsLoading(false);
				}
			} catch (error) {
				localStorage.removeItem("cryptoRacerAuth");
				setIsLoading(false);
			}
		} else {
			setIsLoading(false);
		}
	}, []);

	const handleAuthenticated = async (
		address: string,
		email: string,
		rememberMe: boolean = true,
		csrfToken: string = "",
	) => {
		const now = Date.now();
		setIsAuthenticated(true);
		setUserAddress(address);
		setUserEmail(email);
		setLoginTimestamp(now);

		// Load $VIBES balance and bird balances
		const balance = await fetchVibesBalance(address);
		setVibesBalance(balance);

		const birdBalances = await fetchBirdBalances(address);
		setBirdBalances(birdBalances);

		// Save authentication data if remember me is enabled
		if (rememberMe) {
			const authData: SavedAuthData = {
				userAddress: address,
				email: email,
				timestamp: now,
				csrfToken: csrfToken,
			};
			localStorage.setItem("cryptoRacerAuth", JSON.stringify(authData));

			// Show brief success message
			setToastMessage({
				title: "Login successful!",
				subtitle: "Your login has been saved for future visits",
				isAutoLogin: false,
			});
			setShowToast(true);
			setTimeout(() => setShowToast(false), 3000);
		}
	};

	const handleLogout = () => {
		setIsAuthenticated(false);
		setUserAddress(null);
		setUserEmail(null);
		setLoginTimestamp(null);
		setVibesBalance("0");
		setBirdBalances([0, 0, 0, 0]);

		localStorage.removeItem("cryptoRacerAuth");

		// Show logout confirmation
		setToastMessage({
			title: "Logged out successfully",
			subtitle: "Your login has been cleared",
			isAutoLogin: false,
		});
		setShowToast(true);
		setTimeout(() => setShowToast(false), 3000);
	};

	const handleGameComplete = async (time: number) => {
		setGameStats((prev) => ({
			...prev,
			bestTime: Math.min(prev.bestTime, time),
			totalGames: prev.totalGames + 1,
		}));

		// Refresh $VIBES balance and bird balances after game
		if (userAddress) {
			const newBalance = await fetchVibesBalance(userAddress);
			setVibesBalance(newBalance);

			const newBirdBalances = await fetchBirdBalances(userAddress);
			setBirdBalances(newBirdBalances);
		}
	};

	const handleTokensEarned = async (tokens: number) => {
		console.log("🎮 handleTokensEarned called with tokens:", tokens);
		
		if (tokens === 0) {
			console.log("⚠️ No tokens to distribute, skipping reward claim");
			return; // Skip if no tokens to distribute
		}

		// Automatically send rewards to user wallet
		try {
			if (!userAddress) {
				console.log("❌ No user address available, cannot claim rewards");
				return;
			}

			console.log("👤 User address:", userAddress);
			console.log("📊 Game stats:", gameStats);

			const rewardData = {
				amount: tokens,
				gameStats: {
					bestTime: gameStats.bestTime,
					totalGames: gameStats.totalGames,
				},
				timestamp: Date.now(),
			};

			console.log("💰 Reward data prepared:", rewardData);

			// Get CSRF token from cookie
			const getCsrfToken = () => {
				const cookies = document.cookie.split(";");
				const csrfCookie = cookies.find((cookie) =>
					cookie.trim().startsWith("csrf-token="),
				);
				return csrfCookie ? csrfCookie.split("=")[1] : null;
			};

			const csrfToken = getCsrfToken();
			console.log("🔐 CSRF token:", csrfToken ? "Present" : "Missing");

			console.log("🚀 Sending reward claim request to /api/claim-rewards");
			const response = await fetch("/api/claim-rewards", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": csrfToken || "",
				},
				body: JSON.stringify(rewardData),
			});

			console.log("📡 Response status:", response.status);
			console.log("📡 Response ok:", response.ok);

			if (response.ok) {
				const result = await response.json();
				console.log("✅ Reward claim successful:", result);

				// Show success message
				setToastMessage({
					title: "Rewards Sent!",
					subtitle: `${tokens} tokens have been sent to your wallet`,
					isAutoLogin: false,
				});
				setShowToast(true);
				setTimeout(() => setShowToast(false), 4000);
			} else {
				console.log("❌ Reward claim failed with status:", response.status);
				const errorText = await response.text();
				console.log("❌ Error response body:", errorText);
				
				// Show error message
				setToastMessage({
					title: "Reward Error",
					subtitle: "Failed to send rewards to wallet. Please try again.",
					isAutoLogin: false,
				});
				setShowToast(true);
				setTimeout(() => setShowToast(false), 4000);
			}
		} catch (error) {
			console.error("💥 Error claiming rewards:", error);
			console.error("💥 Error details:", {
				message: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
				tokens,
				userAddress,
				gameStats
			});
			
			// Show error message
			setToastMessage({
				title: "Reward Error",
				subtitle: "Network error. Rewards will be available to claim later.",
				isAutoLogin: false,
			});
			setShowToast(true);
			setTimeout(() => setShowToast(false), 4000);
		}
	};

	const handleCoinsCollected = (coins: number) => {
		setGameStats((prev) => ({
			...prev,
			totalCoins: prev.totalCoins + coins,
		}));
	};

	const refreshVibesBalance = async () => {
		if (userAddress) {
			const newBalance = await fetchVibesBalance(userAddress);
			setVibesBalance(newBalance);

			setToastMessage({
				title: "Balance Updated!",
				subtitle: `$VIBES balance refreshed`,
				isAutoLogin: false,
			});
			setShowToast(true);
			setTimeout(() => setShowToast(false), 2000);
		}
	};

	const refreshAllBalances = async () => {
		if (userAddress) {
			// Refetch both $ORBS and bird balances
			const newBalance = await fetchVibesBalance(userAddress);
			setVibesBalance(newBalance);

			const newBirdBalances = await fetchBirdBalances(userAddress);
			setBirdBalances(newBirdBalances);

			setToastMessage({
				title: "Balances Updated!",
				subtitle: `$ORBS and inventory refreshed`,
				isAutoLogin: false,
			});
			setShowToast(true);
			setTimeout(() => setShowToast(false), 2000);
		}
	};

	return (
		<main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 relative overflow-hidden">
			{/* Cyberpunk background pattern overlay */}
			<div className="cyberpunk-pattern opacity-20"></div>

			{/* Grid overlay */}
			<div className="grid-overlay opacity-10"></div>

			{/* Neon glow effects */}
			<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"></div>
			<div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-60"></div>

			{/* Cyberpunk Toast Notification */}
			{showToast && (
				<div className="fixed top-6 right-6 z-50 animate-slide-in">
					<div
						className={`${
							toastMessage.isAutoLogin
								? "bg-gradient-to-r from-cyan-500 to-purple-600 border-cyan-400"
								: toastMessage.title.includes("Logged out")
									? "bg-gradient-to-r from-purple-500 to-pink-600 border-purple-400"
									: "bg-gradient-to-r from-cyan-500 to-purple-600 border-cyan-400"
						} text-white px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-sm`}
					>
						<span className="text-2xl">
							{toastMessage.isAutoLogin
								? "🎉"
								: toastMessage.title.includes("Logged out")
									? "👋"
									: "✅"}
						</span>
						<div className="ml-3">
							<p className="font-bold text-lg">{toastMessage.title}</p>
							<p className="text-sm text-white/90">{toastMessage.subtitle}</p>
						</div>
						<button
							onClick={() => setShowToast(false)}
							className="text-white/80 hover:text-white ml-6 p-1 hover:bg-white/20 rounded-full transition-all"
						>
							✕
						</button>
					</div>
				</div>
			)}

			<div className="container mx-auto px-6 py-12 relative z-10">
				{/* Header with Logout Button */}
				<div className="relative mb-12">
					{/* Cyberpunk User & Wallet Status Card - Top Left */}
					{isAuthenticated && userEmail && (
						<div className="absolute top-0 left-0 z-20">
							<div className="bg-gradient-to-r from-gray-800/80 to-purple-900/80 backdrop-blur-xl rounded-2xl p-4 border border-cyan-500/30 shadow-xl max-w-sm hover:shadow-2xl transition-all duration-300">
								<div className="space-y-3">
									{/* User Info */}
									<div className="flex items-center space-x-3">
										<div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-sm shadow-lg">
											🤖
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-cyan-300 font-medium text-sm truncate font-mono">
												{userEmail}
											</p>
											<p className="text-purple-400 text-xs font-mono">
												ACTIVE USER
											</p>
										</div>
										<div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
									</div>

									{/* Wallet Info */}
									<div className="flex items-center space-x-3 pt-2 border-t border-cyan-500/20">
										<div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse shadow-lg"></div>
										<span className="text-cyan-300 text-sm font-medium font-mono">
											WALLET
										</span>
										<code className="text-sm text-cyan-300 font-mono bg-black/60 px-2 py-1 rounded-lg border border-cyan-500/50">
											{userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
										</code>
										<button
											onClick={() => {
												navigator.clipboard.writeText(userAddress || "");
												setToastMessage({
													title: "Wallet copied!",
													subtitle: "Address copied to clipboard",
													isAutoLogin: false,
												});
												setShowToast(true);
												setTimeout(() => setShowToast(false), 2000);
											}}
											className="text-cyan-300 hover:text-cyan-200 text-sm hover:bg-cyan-500/20 px-2 py-1 rounded-lg transition-all duration-200 hover:scale-105"
											title="Copy wallet address"
										>
											📋
										</button>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Centered Cyberpunk Title */}
					<div className="text-center">
						<div className="flex items-center justify-center mb-4">
							<div className="text-6xl mr-4">🤖</div>
							<h1 className="text-7xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-2xl neon-text">
								CYBER BIRD
							</h1>
						</div>
						<div className="w-32 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 mx-auto rounded-full shadow-lg"></div>
					</div>

					{/* Logout Button - Top Right */}
					{isAuthenticated && (
						<div className="absolute top-0 right-0 z-20">
							<button
								onClick={handleLogout}
								className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-200 flex items-center space-x-3 shadow-2xl hover:shadow-red-500/25 hover:scale-105 border border-red-400/30 font-mono"
							>
								<span className="text-lg">⚡</span>
								<span>DISCONNECT</span>
							</button>
						</div>
					)}
				</div>

				{!isAuthenticated ? (
					<div className="max-w-lg mx-auto">
						{isLoading ? (
							<div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl p-12 border border-white/20 shadow-2xl text-center">
								<div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-400 border-t-transparent mx-auto mb-6 shadow-2xl"></div>
								<h3 className="text-2xl font-bold text-white mb-3">
									Checking for saved login...
								</h3>
								<p className="text-gray-300 text-lg">
									Looking for your previous session
								</p>
							</div>
						) : (
							<AuthComponent onAuthenticated={handleAuthenticated} />
						)}
					</div>
				) : (
					<div className="space-y-12">
						{/* Cyberpunk Dashboard Quick Stats */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							<div className="dashboard-card bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 card-entrance">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-cyan-200 text-sm font-medium mb-1 font-mono">
											TOTAL MISSIONS
										</p>
										<p className="text-3xl font-black text-cyan-300">
											{gameStats.totalGames}
										</p>
										<p className="text-cyan-200/60 text-xs font-mono">
											COMPLETED
										</p>
									</div>
									<div className="w-12 h-12 bg-cyan-500/30 rounded-full flex items-center justify-center text-2xl shadow-lg">
										🤖
									</div>
								</div>
							</div>

							<div className="dashboard-card bg-gradient-to-r from-purple-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 card-entrance">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-purple-200 text-sm font-medium mb-1 font-mono">
											BIRDS OWNED
										</p>
										<p className="text-3xl font-black text-purple-300">
											{birdBalances
												.slice(0, 4)
												.reduce((total, balance) => total + balance, 0)}
										</p>
										<p className="text-purple-200/60 text-xs font-mono">
											COLLECTION
										</p>
									</div>
									<div className="w-12 h-12 bg-purple-500/30 rounded-full flex items-center justify-center text-2xl shadow-lg">
										🐦
									</div>
								</div>
							</div>

							<div className="dashboard-card bg-gradient-to-r from-cyan-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 card-entrance">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-cyan-200 text-sm font-medium mb-1 font-mono">
											$ORBS
										</p>
										<p className="text-3xl font-black text-cyan-300">
											{parseInt(vibesBalance) > 0
												? parseInt(vibesBalance).toLocaleString()
												: "0"}
										</p>
										<p className="text-cyan-200/60 text-xs font-mono">
											WALLET BALANCE
										</p>
									</div>
									<div className="w-12 h-12 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 rounded-full flex items-center justify-center text-2xl shadow-lg">
										🔮
									</div>
								</div>
							</div>
						</div>

						{/* Game Dashboard */}
						<div className="w-full" data-game-area>
							<FlappyBird
								onGameComplete={handleGameComplete}
								onTokensEarned={handleTokensEarned}
								onCoinsCollected={handleCoinsCollected}
								birdBalances={birdBalances}
							/>
						</div>

						{/* Cyberpunk Shop Section */}
						<CyberShop
							vibesBalance={vibesBalance}
							birdBalances={birdBalances}
							userAddress={userAddress || ""}
							onPurchaseSuccess={refreshAllBalances}
						/>
					</div>
				)}
			</div>
		</main>
	);
}
