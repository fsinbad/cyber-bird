"use client";

import { useState, useCallback, useEffect } from "react";

interface User {
	csrfToken?: string;
	userAddress?: string;
	email?: string;
	timestamp?: number;
	// Add other user properties as needed
}

interface CyberShopProps {
	vibesBalance: string;
	birdBalances: number[]; // [neon-ronin, circuitwing, chainlord, orb-sentinel, slowmo, shield]
	userAddress: string;
	onPurchaseSuccess?: () => void; // Callback to refetch balances after purchase
}

const USER_STORAGE_KEY = "cryptoRacerAuth";

export function CyberShop({
	vibesBalance,
	birdBalances,
	userAddress,
	onPurchaseSuccess,
}: CyberShopProps) {
	const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>(
		{},
	);
	const [successStates, setSuccessStates] = useState<Record<number, boolean>>(
		{},
	);
	const [errorMessage, setErrorMessage] = useState<string>("");

	const loadUserFromStorage = useCallback(() => {
		try {
			const savedUser = localStorage.getItem(USER_STORAGE_KEY);
			if (savedUser) {
				const userData = JSON.parse(savedUser) as User;
				return userData;
			}
		} catch (error) {
			// Clear corrupted data
			localStorage.removeItem(USER_STORAGE_KEY);
		}
		return null;
	}, []);
	// Function to burn power-ups when used in game
	const burnPowerUp = async (tokenId: number, quantity: number) => {
		try {
			const userData = loadUserFromStorage();
			if (!userData || !userData.csrfToken) {
				throw new Error("User not found. Please login again.");
			}

			const response = await fetch("/api/burn-powerup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": userData.csrfToken,
				},
				body: JSON.stringify({
					tokenId,
					quantity,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error || `Burn request failed: ${response.status}`,
				);
			}

			return await response.json();
		} catch (error) {
			console.error("Failed to burn power-up:", error);
			throw error;
		}
	};

	const handlePurchase = async (tokenId: number, quantity: number) => {
		// Set loading state
		setLoadingStates((prev) => ({ ...prev, [tokenId]: true }));
		setErrorMessage("");

		try {
			// Get user data from localStorage
			const userData = loadUserFromStorage();
			if (!userData) {
				throw new Error("User not found. Please login again.");
			}

			// Get CSRF token from user data

			const csrfToken = userData.csrfToken;
			if (!csrfToken) {
				throw new Error("CSRF token not found. Please refresh the page.");
			}

			const response = await fetch("/api/purchase-bird", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-csrf-token": csrfToken || "",
				},
				body: JSON.stringify({
					tokenId,
					quantity,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error || `API request failed: ${response.status}`,
				);
			}

			const result = await response.json();

			// Set success state
			setSuccessStates((prev) => ({ ...prev, [tokenId]: true }));

			// Call callback to refetch balances
			if (onPurchaseSuccess) {
				onPurchaseSuccess();
			}

			// Clear success state after 3 seconds
			setTimeout(() => {
				setSuccessStates((prev) => ({ ...prev, [tokenId]: false }));
			}, 3000);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Purchase failed",
			);

			// Clear error message after 5 seconds
			setTimeout(() => {
				setErrorMessage("");
			}, 5000);
		} finally {
			// Clear loading state
			setLoadingStates((prev) => ({ ...prev, [tokenId]: false }));
		}
	};
	// Note: burnPowerUp function is no longer exposed globally
	// FlappyBird component now calls the API directly

	return (
		<div className="mt-12">
			<div className="bg-gradient-to-r from-gray-800/80 to-purple-900/80 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/30 shadow-xl">
				<h4 className="text-2xl font-bold text-cyan-300 mb-6 text-center font-mono">
					🛒 CYBER SHOP
				</h4>

				{/* Error Message */}
				{errorMessage && (
					<div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
						<p className="text-red-300 text-sm font-mono text-center">
							❌ {errorMessage}
						</p>
					</div>
				)}

				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					{/* Bird Items with proper token mapping */}
					{[
						{
							id: 0,
							name: "NEON RONIN 🥷",
							image: "/images/bird1.png",
							price: 30,
							theme: "cyan-purple",
							type: "bird",
						},
						{
							id: 1,
							name: "CIRCUITWING ⚡",
							image: "/images/bird4.png",
							price: 40,
							theme: "pink-cyan",
							type: "bird",
						},
						{
							id: 2,
							name: "CHAINLORD ⛓️",
							image: "/images/bird5.png",
							price: 50,
							theme: "cyan-pink",
							type: "bird",
						},
						{
							id: 3,
							name: "ORB SENTINEL 🔵",
							image: "/images/bird3.png",
							price: 20,
							theme: "purple-pink",
							type: "bird",
						},
						{
							id: 4,
							name: "SLOWMO ⏰",
							image: "/images/slowmo.png",
							price: 10,
							theme: "blue-purple",
							type: "powerup",
							description: "Slow down time",
						},
						{
							id: 5,
							name: "SHIELD 🛡️",
							image: "/images/shield.png",
							price: 10,
							theme: "green-blue",
							type: "powerup",
							description: "Protection from collision",
						},
					].map((item) => {
						const isOwned =
							item.type === "bird" ? birdBalances[item.id] > 0 : false;
						const canAfford = parseInt(vibesBalance) >= item.price;
						const canAfford5x = parseInt(vibesBalance) >= item.price * 5;
						const canAfford10x = parseInt(vibesBalance) >= item.price * 10;
						const canPurchase =
							item.type === "powerup" ? canAfford : !isOwned && canAfford;

						return (
							<div
								key={item.id}
								className={`bg-gradient-to-br from-${
									item.theme.split("-")[0]
								}-500/20 to-${
									item.theme.split("-")[1]
								}-600/20 rounded-xl p-4 border border-${
									item.theme.split("-")[0]
								}-500/30 transition-all duration-300 ${
									isOwned
										? "opacity-60 cursor-not-allowed"
										: canPurchase
											? "hover:border-cyan-400/50 hover:scale-105 cursor-pointer group"
											: "opacity-40 cursor-not-allowed"
								}`}
							>
								<div className="aspect-square mb-3 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center relative">
									<img
										src={item.image}
										alt={item.name}
										className={`w-full h-full object-contain transition-transform duration-300 ${
											canPurchase ? "group-hover:scale-110" : ""
										}`}
									/>
									{isOwned && (
										<div className="absolute top-1 right-1 bg-green-500 text-white text-xs font-mono px-2 py-1 rounded-full">
											{item.type === "powerup"
												? `x${birdBalances[item.id]}`
												: "OWNED"}
										</div>
									)}
								</div>
								<h5
									className={`text-${
										item.theme.split("-")[0]
									}-300 font-mono text-sm font-bold mb-1`}
								>
									{item.name}
								</h5>
								{item.description && (
									<p className="text-gray-400 text-xs font-mono mb-1">
										{item.description}
									</p>
								)}
								<p
									className={`text-${
										item.theme.split("-")[1]
									}-300 text-xs font-mono mb-2`}
								>
									Price: {item.price} $ORBS
								</p>
								{isOwned && item.type === "bird" ? (
									<div className="w-full mt-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-mono py-2 px-3 rounded-lg text-center">
										✓ OWNED
									</div>
								) : !canAfford ? (
									<div className="w-full mt-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-mono py-2 px-3 rounded-lg text-center">
										INSUFFICIENT FUNDS
									</div>
								) : (
									<div className="space-y-2">
										{item.type === "powerup" && (
											<div className="flex space-x-1">
												<button
													onClick={() => handlePurchase(item.id, 1)}
													disabled={
														loadingStates[item.id] ||
														successStates[item.id] ||
														!canAfford
													}
													className={`flex-1 text-white text-xs font-mono py-1 px-2 rounded transition-all duration-200 ${
														successStates[item.id]
															? "bg-gradient-to-r from-green-500 to-green-600 animate-pulse"
															: loadingStates[item.id]
																? "bg-gradient-to-r from-yellow-500 to-orange-600 cursor-not-allowed"
																: !canAfford
																	? "bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed opacity-50"
																	: "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
													}`}
												>
													{successStates[item.id]
														? "✓"
														: loadingStates[item.id]
															? "⚡"
															: "1x"}
												</button>
												<button
													onClick={() => handlePurchase(item.id, 5)}
													disabled={
														loadingStates[item.id] ||
														successStates[item.id] ||
														!canAfford5x
													}
													className={`flex-1 text-white text-xs font-mono py-1 px-2 rounded transition-all duration-200 ${
														successStates[item.id]
															? "bg-gradient-to-r from-green-500 to-green-600 animate-pulse"
															: loadingStates[item.id]
																? "bg-gradient-to-r from-yellow-500 to-orange-600 cursor-not-allowed"
																: !canAfford5x
																	? "bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed opacity-50"
																	: "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
													}`}
												>
													{successStates[item.id]
														? "✓"
														: loadingStates[item.id]
															? "⚡"
															: "5x"}
												</button>
												<button
													onClick={() => handlePurchase(item.id, 10)}
													disabled={
														loadingStates[item.id] ||
														successStates[item.id] ||
														!canAfford10x
													}
													className={`flex-1 text-white text-xs font-mono py-1 px-2 rounded transition-all duration-200 ${
														successStates[item.id]
															? "bg-gradient-to-r from-green-500 to-green-600 animate-pulse"
															: loadingStates[item.id]
																? "bg-gradient-to-r from-yellow-500 to-orange-600 cursor-not-allowed"
																: !canAfford10x
																	? "bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed opacity-50"
																	: "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
													}`}
												>
													{successStates[item.id]
														? "✓"
														: loadingStates[item.id]
															? "⚡"
															: "10x"}
												</button>
											</div>
										)}
										{item.type === "bird" && (
											<button
												onClick={() => handlePurchase(item.id, 1)}
												disabled={
													loadingStates[item.id] || successStates[item.id]
												}
												className={`w-full mt-2 text-white text-xs font-mono py-2 px-3 rounded-lg transition-all duration-200 ${
													successStates[item.id]
														? "bg-gradient-to-r from-green-500 to-green-600 animate-pulse"
														: loadingStates[item.id]
															? "bg-gradient-to-r from-yellow-500 to-orange-600 cursor-not-allowed"
															: "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
												}`}
											>
												{successStates[item.id] ? (
													<span className="flex items-center justify-center">
														<span className="animate-spin mr-2">✓</span>
														PURCHASED!
													</span>
												) : loadingStates[item.id] ? (
													<span className="flex items-center justify-center">
														<span className="animate-spin mr-2">⚡</span>
														PROCESSING...
													</span>
												) : (
													"PURCHASE"
												)}
											</button>
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>

				<div className="text-center">
					<p className="text-cyan-300 text-sm font-mono">
						💡 Earn $ORBS by collecting energy orbs in the game above!
					</p>
				</div>
			</div>
		</div>
	);
}
