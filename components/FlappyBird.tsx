"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AudioManager } from "./AudioManager";

interface FlappyBirdProps {
	onGameComplete: (time: number) => void;
	onTokensEarned: (tokens: number) => void;
	onCoinsCollected: (coins: number) => void;
	birdBalances: number[]; // [neon-ronin, circuitwing, chainlord, orb-sentinel, slowmo, shield]
}

interface Pipe {
	id: number;
	x: number;
	topHeight: number;
	bottomY: number;
	width: number;
	passed: boolean;
}

interface Coin {
	id: number;
	x: number;
	y: number;
	width: number;
	height: number;
	collected: boolean;
}

interface Particle {
	id: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	type: "normal" | "explosion" | "sparkle";
	size: number;
}

export function FlappyBird({
	onGameComplete,
	onTokensEarned,
	onCoinsCollected,
	birdBalances,
}: FlappyBirdProps) {
	const [gameState, setGameState] = useState<
		"waiting" | "playing" | "finished" | "crashed"
	>("waiting");
	const [birdY, setBirdY] = useState(300);
	const [birdVelocity, setBirdVelocity] = useState(0);
	const [pipes, setPipes] = useState<Pipe[]>([]);
	const [coins, setCoins] = useState<Coin[]>([]);
	const [particles, setParticles] = useState<Particle[]>([]);
	const [score, setScore] = useState(0);
	const [time, setTime] = useState(0);
	const [pipeSpeed, setPipeSpeed] = useState(2);
	const [pipeId, setPipeId] = useState(0);
	const [coinId, setCoinId] = useState(0);
	const [particleId, setParticleId] = useState(0);
	const [coinsCollected, setCoinsCollected] = useState(0);
	const [rewardsDistributed, setRewardsDistributed] = useState(false);
	const [selectedBird, setSelectedBird] = useState("default");
	const [purchasedPowerUps, setPurchasedPowerUps] = useState<{
		slowmo: number;
		shield: number;
	}>({ slowmo: 0, shield: 0 });
	const [activePowerUp, setActivePowerUp] = useState<
		"slowmo" | "shield" | null
	>(null);
	const [powerUpDuration, setPowerUpDuration] = useState(0);

	const gameLoopRef = useRef<number>();
	const lastTimeRef = useRef<number>(0);
	const rewardsDistributedRef = useRef<boolean>(false);

	const GAME_WIDTH = 800;
	const GAME_HEIGHT = 600;
	const BIRD_SIZE = 50;
	const PIPE_WIDTH = 60;
	const PIPE_GAP = 200; // Increased gap for easier navigation
	const COIN_SIZE = 25;

	// Game constants
	const GRAVITY = 0.4; // Slightly reduced gravity for better control
	const JUMP_FORCE = -7; // Slightly reduced jump force for better control
	const GROUND_Y = GAME_HEIGHT - 50;

	const startGame = useCallback(() => {
		setGameState("playing");
		setScore(0);
		setTime(0);
		setBirdY(GAME_HEIGHT / 2); // Start bird in the middle of the screen
		setBirdVelocity(0);
		setPipes([]);
		setCoins([]);
		setParticles([]);
		setPipeSpeed(2);
		setPipeId(0);
		setCoinId(0);
		setParticleId(0);
		setCoinsCollected(0);
		setRewardsDistributed(false);
		rewardsDistributedRef.current = false;
		lastTimeRef.current = Date.now();
	}, []);

	const jump = useCallback(() => {
		if (gameState !== "playing") return;
		setBirdVelocity(JUMP_FORCE);

		// Play jump sound
		if (window.audioOnJump) {
			window.audioOnJump();
		}
	}, [gameState]);

	// Function to use purchased power-ups
	const usePowerUp = useCallback(
		async (type: "slowmo" | "shield") => {
			console.log("usePowerUp called:", {
				type,
				gameState,
				activePowerUp,
				purchasedPowerUps,
			});

			if (gameState !== "playing") {
				console.log("Game not playing, cannot use power-up");
				return;
			}

			if (activePowerUp) {
				console.log("Power-up already active:", activePowerUp);
				return;
			}

			const currentCount = purchasedPowerUps[type];
			if (currentCount <= 0) {
				console.log("No power-ups available:", { type, currentCount });
				return;
			}

			console.log("Activating power-up:", type);

			// Activate power-up
			setActivePowerUp(type);
			setPowerUpDuration(type === "slowmo" ? 5000 : 5000); // 5s slowmo, 5s shield

			// Update local count
			setPurchasedPowerUps((prev) => ({
				...prev,
				[type]: prev[type] - 1,
			}));

			// Burn the power-up on blockchain
			try {
				const tokenId = type === "slowmo" ? 4 : 5;
				
				// Get CSRF token from cookies
				const getCsrfToken = () => {
					const cookies = document.cookie.split(";");
					const csrfCookie = cookies.find((cookie) =>
						cookie.trim().startsWith("csrf-token="),
					);
					return csrfCookie ? csrfCookie.split("=")[1] : null;
				};
				
				const csrfToken = getCsrfToken();
				
				const response = await fetch("/api/burn-powerup", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-csrf-token": csrfToken || "",
					},
					body: JSON.stringify({
						tokenId,
						quantity: 1,
					}),
				});

				if (!response.ok) {
					throw new Error(`Burn failed: ${response.status}`);
				}

				const result = await response.json();
				console.log("Power-up burned successfully:", type, result);
			} catch (error) {
				console.error("Failed to burn power-up:", error);
				// Revert local count if burn failed
				setPurchasedPowerUps((prev) => ({
					...prev,
					[type]: prev[type] + 1,
				}));
			}
		},
		[gameState, activePowerUp, purchasedPowerUps],
	);

	const createParticles = useCallback(
		(
			x: number,
			y: number,
			count: number = 5,
			type: "normal" | "explosion" | "sparkle" = "normal",
		) => {
			const newParticles: Particle[] = [];
			for (let i = 0; i < count; i++) {
				const isExplosion = type === "explosion";
				const isSparkle = type === "sparkle";

				// For energy trail particles (sparkle type), make them go backward like wing trails
				const isEnergyTrail = type === "sparkle";

				newParticles.push({
					id: particleId + i,
					x: x + Math.random() * 20 - 10,
					y: y + Math.random() * 20 - 10,
					vx: isEnergyTrail
						? -(Math.random() * 4 + 2)
						: (Math.random() - 0.5) * (isExplosion ? 8 : 6), // Energy trails go backward
					vy: (Math.random() - 0.5) * (isExplosion ? 8 : isEnergyTrail ? 3 : 6), // Less vertical movement for energy trails
					life: isExplosion ? 45 : isEnergyTrail ? 25 : 40, // Energy trails live shorter
					type: type,
					size: isExplosion
						? Math.random() * 8 + 4
						: isEnergyTrail
							? Math.random() * 4 + 2
							: Math.random() * 6 + 3,
				});
			}
			setParticles((prev) => [...prev, ...newParticles]);
			setParticleId((prev) => prev + count);
		},
		[particleId],
	);

	const triggerCrashState = useCallback(() => {
		setGameState("crashed");

		if (!rewardsDistributedRef.current) {
			onGameComplete(time);
			onCoinsCollected(coinsCollected);
			const totalTokens = calculateRewards(time, coinsCollected);
			onTokensEarned(totalTokens);
			setRewardsDistributed(true);
			rewardsDistributedRef.current = true;
		}
	}, [time, coinsCollected, onGameComplete, onCoinsCollected, onTokensEarned]);

	const checkCollision = useCallback(
		(birdX: number, birdY: number, birdSize: number, pipe: Pipe) => {
			const birdLeft = birdX;
			const birdRight = birdX + birdSize;
			const birdTop = birdY;
			const birdBottom = birdY + birdSize;

			// Check collision with top pipe
			if (birdRight > pipe.x && birdLeft < pipe.x + pipe.width) {
				if (birdTop < pipe.topHeight) {
					return true;
				}
			}

			// Check collision with bottom pipe
			if (birdRight > pipe.x && birdLeft < pipe.x + pipe.width) {
				if (birdBottom > pipe.bottomY) {
					return true;
				}
			}

			return false;
		},
		[],
	);

	const checkCoinCollision = useCallback(
		(birdX: number, birdY: number, birdSize: number, coin: Coin) => {
			const birdLeft = birdX;
			const birdRight = birdX + birdSize;
			const birdTop = birdY;
			const birdBottom = birdY + birdSize;

			const coinLeft = coin.x;
			const coinRight = coin.x + coin.width;
			const coinTop = coin.y;
			const coinBottom = coin.y + coin.height;

			return !(
				birdLeft > coinRight ||
				birdRight < coinLeft ||
				birdTop > coinBottom ||
				birdBottom < coinTop
			);
		},
		[],
	);

	const checkPipeOverlap = useCallback(
		(newPipe: Pipe, existingPipes: Pipe[]) => {
			return existingPipes.some((pipe) => {
				// Check horizontal distance - pipes should be at least 400px apart for better gameplay with wider screen
				if (Math.abs(newPipe.x - pipe.x) < 400) {
					return true; // Overlap detected
				}

				return false;
			});
		},
		[],
	);

	const isPipePositionSafe = useCallback((pipe: Pipe) => {
		// Ensure the pipe gap is large enough for the bird
		const gapSize = pipe.bottomY - pipe.topHeight;
		if (gapSize < 180) {
			return false; // Gap too small (reduced from 200 to 180 for more challenge)
		}

		// Ensure pipes aren't too close to the top or bottom edges (more lenient)
		if (pipe.topHeight < 60 || pipe.bottomY > GAME_HEIGHT - 80) {
			return false; // Too close to edges
		}

		// Remove the center restriction to allow more random positioning
		// This makes the game more challenging and varied

		return true;
	}, []);

	const calculateRewards = useCallback(
		(finalTime: number, coinsCollected: number) => {
			// Reward: 1 $ORBS per orb collected
			const finalReward = coinsCollected;
			return finalReward;
		},
		[],
	);

	const gameLoop = useCallback(
		(currentTime: number) => {
			if (gameState !== "playing") return;

			if (lastTimeRef.current === 0) {
				lastTimeRef.current = currentTime;
				gameLoopRef.current = requestAnimationFrame(gameLoop);
				return;
			}

			const deltaTime = Math.max(0, currentTime - lastTimeRef.current);
			lastTimeRef.current = currentTime;

			// Apply slowmo effect
			const slowmoMultiplier = activePowerUp === "slowmo" ? 0.1 : 1.0;
			const clampedDeltaTime = Math.min(deltaTime * slowmoMultiplier, 100);

			// Debug slowmo effect
			if (activePowerUp === "slowmo" && Math.random() < 0.01) {
				// Log 1% of the time to avoid spam
				console.log("Slowmo active:", {
					slowmoMultiplier,
					deltaTime,
					clampedDeltaTime,
				});
			}

			// Update time and score
			setTime((prev) => Math.max(0, prev + clampedDeltaTime));
			setScore((prev) => Math.max(0, prev + Math.floor(clampedDeltaTime / 16)));

			// Update bird physics
			setBirdY((prev) => {
				const newY = prev + birdVelocity;
				const newVelocity = birdVelocity + GRAVITY;
				setBirdVelocity(newVelocity);

				// Check ground collision
				if (newY + BIRD_SIZE > GROUND_Y) {
					triggerCrashState();
					return prev;
				}

				// Check ceiling collision
				if (newY < 0) {
					setBirdVelocity(0);
					return 0;
				}

				return newY;
			});

			// Update particles
			setParticles((prev) => {
				const updated = prev
					.map((particle) => ({
						...particle,
						x: particle.x + particle.vx,
						y: particle.y + particle.vy,
						life: particle.life - 1,
					}))
					.filter((particle) => particle.life > 0 && particle.y < GAME_HEIGHT);

				return updated.slice(0, 50);
			});

			// Move pipes left
			setPipes((prev) => {
				const updated = prev
					.map((pipe) => ({
						...pipe,
						x: pipe.x - pipeSpeed,
					}))
					.filter((pipe) => pipe.x + pipe.width > -50);

				// Check if bird passed pipe for scoring
				updated.forEach((pipe) => {
					if (!pipe.passed && pipe.x + pipe.width < 100) {
						pipe.passed = true;
						setScore((prev) => prev + 10);
					}
				});

				return updated.slice(0, 6); // Limit to 6 pipes max for wider screen
			});

			// Move coins left
			setCoins((prev) => {
				const updated = prev
					.map((coin) => ({
						...coin,
						x: coin.x - pipeSpeed,
					}))
					.filter((coin) => coin.x + coin.width > -50);

				return updated;
			});

			// Spawn new pipes with guaranteed safe spacing
			if (Math.random() < 0.018 && pipes.length < 4) {
				// Increased frequency from 0.012 to 0.018
				const pipeX = GAME_WIDTH + 50;

				// Create more random and challenging pipe gaps
				const minTopHeight = 80; // Reduced minimum for more variety
				const maxTopHeight = GAME_HEIGHT - PIPE_GAP - 120; // Reduced maximum for more variety

				// Generate a more random height that creates varied challenges
				const topHeight =
					Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;
				const bottomY = topHeight + PIPE_GAP;

				const newPipe: Pipe = {
					id: pipeId,
					x: pipeX,
					topHeight,
					bottomY,
					width: PIPE_WIDTH,
					passed: false,
				};

				// Check for overlap and safety before spawning
				if (!checkPipeOverlap(newPipe, pipes) && isPipePositionSafe(newPipe)) {
					setPipes((prev) => [...prev, newPipe]);
					setPipeId((prev) => prev + 1);

					// Spawn coin in pipe gap (always safe since gap is guaranteed)
					if (Math.random() < 0.95) {
						const coinY = topHeight + PIPE_GAP / 2 - COIN_SIZE / 2;
						const newCoin: Coin = {
							id: coinId,
							x: pipeX + PIPE_WIDTH / 2 - COIN_SIZE / 2,
							y: coinY,
							width: COIN_SIZE,
							height: COIN_SIZE,
							collected: false,
						};
						setCoins((prev) => [...prev, newCoin]);
						setCoinId((prev) => prev + 1);
					}
				}
			}

			// Check collisions with pipes
			const birdX = 150;
			pipes.forEach((pipe) => {
				if (checkCollision(birdX, birdY, BIRD_SIZE, pipe)) {
					// Check if shield is active
					if (activePowerUp === "shield") {
						// Shield absorbs the hit - create shield particles instead of crash
						console.log("Shield blocked collision!");
						createParticles(
							birdX + BIRD_SIZE / 2,
							birdY + BIRD_SIZE / 2,
							15,
							"sparkle",
						);
						// Shield continues to work for its full duration - don't deactivate
						return;
					}

					// Normal collision - crash the game
					console.log("Collision detected - game over!");
					createParticles(
						birdX + BIRD_SIZE / 2,
						birdY + BIRD_SIZE / 2,
						20,
						"explosion",
					);

					if (window.audioOnCrash) {
						window.audioOnCrash();
					}

					triggerCrashState();
					return;
				}
			});

			// Check coin collection
			setCoins((prev) => {
				return prev.map((coin) => {
					if (
						!coin.collected &&
						checkCoinCollision(150, birdY, BIRD_SIZE, coin)
					) {
						const newCoinCount = coinsCollected + 1;
						setCoinsCollected(newCoinCount);
						setScore((prevScore) => prevScore + 50);
						createParticles(
							coin.x + coin.width / 2,
							coin.y + coin.height / 2,
							8,
							"sparkle",
						);

						// Create celebration particles for each orb collected
						createParticles(
							birdX + BIRD_SIZE / 2,
							birdY + BIRD_SIZE / 2,
							10,
							"explosion",
						);

						if (window.audioOnCoinCollect) {
							window.audioOnCoinCollect();
						}

						return { ...coin, collected: true };
					}
					return coin;
				});
			});

			// Increase difficulty
			if (score > 0 && score % 100 === 0) {
				setPipeSpeed((prev) => Math.min(prev + 0.3, 6));
			}

			gameLoopRef.current = requestAnimationFrame(gameLoop);
		},
		[
			gameState,
			birdY,
			birdVelocity,
			pipes,
			pipeSpeed,
			score,
			time,
			pipeId,
			coinId,
			coinsCollected,
			checkCollision,
			calculateRewards,
			createParticles,
			triggerCrashState,
			checkPipeOverlap,
			isPipePositionSafe,
			activePowerUp,
		],
	);

	useEffect(() => {
		if (gameState === "playing") {
			gameLoopRef.current = requestAnimationFrame(gameLoop);
		}

		return () => {
			if (gameLoopRef.current) {
				cancelAnimationFrame(gameLoopRef.current);
			}
		};
	}, [gameState, gameLoop]);

	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.key === " ") {
				e.preventDefault(); // Always prevent page scrolling when space is pressed
				if (gameState === "waiting") {
					startGame();
				} else if (gameState === "playing") {
					jump();
				}
				// If game is crashed/finished, space does nothing but still prevents scrolling
			} else if (e.key === "e" || e.key === "E") {
				if (gameState === "playing" && !rewardsDistributedRef.current) {
					setGameState("finished");
					const finalTime = time;
					const finalCoins = coinsCollected;

					onGameComplete(finalTime);
					onCoinsCollected(finalCoins);

					const totalTokens = calculateRewards(finalTime, finalCoins);
					onTokensEarned(totalTokens);
					setRewardsDistributed(true);
					rewardsDistributedRef.current = true;
				}
			} else if (e.key === "q" || e.key === "Q") {
				e.preventDefault();
				usePowerUp("slowmo");
			} else if (e.key === "w" || e.key === "W") {
				e.preventDefault();
				usePowerUp("shield");
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [
		startGame,
		jump,
		gameState,
		time,
		coinsCollected,
		onGameComplete,
		onTokensEarned,
		calculateRewards,
		usePowerUp,
	]);

	// Sync purchased power-ups with birdBalances
	useEffect(() => {
		setPurchasedPowerUps({
			slowmo: birdBalances[4] || 0,
			shield: birdBalances[5] || 0,
		});
	}, [birdBalances]);

	// Auto-switch from default bird if all NFT birds are owned
	useEffect(() => {
		const totalOwnedBirds = birdBalances
			.slice(0, 4)
			.reduce((total, balance) => total + balance, 0);
		if (totalOwnedBirds >= 4 && selectedBird === "default") {
			// Find first owned NFT bird and switch to it
			if (birdBalances[0] > 0) setSelectedBird("neon-ronin");
			else if (birdBalances[1] > 0) setSelectedBird("circuitwing");
			else if (birdBalances[2] > 0) setSelectedBird("chainlord");
			else if (birdBalances[3] > 0) setSelectedBird("orb-sentinel");
		}
	}, [birdBalances, selectedBird]);

	// Handle power-up duration countdown
	useEffect(() => {
		if (activePowerUp && powerUpDuration > 0) {
			const timer = setTimeout(() => {
				setPowerUpDuration((prev) => {
					if (prev <= 100) {
						setActivePowerUp(null);
						return 0;
					}
					return prev - 100;
				});
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [activePowerUp, powerUpDuration]);

	const formatTime = (ms: number) => {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	return (
		<div className="bg-gradient-to-br from-gray-900 via-black to-purple-900 rounded-3xl p-8 shadow-2xl border border-cyan-500/30 backdrop-blur-sm relative overflow-hidden">
			{/* Audio Manager */}
			<AudioManager
				isGamePlaying={gameState === "playing"}
				onCoinCollect={() => {}}
				onCrash={() => {}}
				onJump={() => {}}
			/>

			{/* Power-up Status - Left Side Above Bird Selector */}
			<div
				className="absolute left-4 z-20"
				style={{ top: "calc(50% - 300px)" }}
			>
				<div className="bg-gradient-to-r from-gray-800/90 to-purple-900/90 backdrop-blur-xl rounded-xl p-3 border border-cyan-500/30 shadow-xl">
					<h5 className="text-cyan-300 font-mono text-xs font-bold mb-2 text-center">
						POWER-UPS
					</h5>
					<div className="space-y-2">
						{/* Slowmo Power-up Status */}
						<div
							className={`flex items-center justify-between px-2 py-1 rounded border transition-all duration-300 ${
								purchasedPowerUps.slowmo > 0
									? "bg-blue-500/20 border-blue-400/50 text-blue-300"
									: "bg-gray-500/20 border-gray-400/30 text-gray-400"
							}`}
						>
							<div className="flex items-center gap-1">
								<span className="text-sm">⏰</span>
								<span className="font-mono text-xs">SLOWMO</span>
							</div>
							<span className="font-mono text-xs">
								{purchasedPowerUps.slowmo > 0
									? `x${purchasedPowerUps.slowmo}`
									: "0"}
							</span>
						</div>

						{/* Shield Power-up Status */}
						<div
							className={`flex items-center justify-between px-2 py-1 rounded border transition-all duration-300 ${
								purchasedPowerUps.shield > 0
									? "bg-green-500/20 border-green-400/50 text-green-300"
									: "bg-gray-500/20 border-gray-400/30 text-gray-400"
							}`}
						>
							<div className="flex items-center gap-1">
								<span className="text-sm">🛡️</span>
								<span className="font-mono text-xs">SHIELD</span>
							</div>
							<span className="font-mono text-xs">
								{purchasedPowerUps.shield > 0
									? `x${purchasedPowerUps.shield}`
									: "0"}
							</span>
						</div>

						{/* Active Power-up Indicator */}
						{activePowerUp && (
							<div
								className={`flex items-center justify-center px-2 py-1 rounded border animate-pulse ${
									activePowerUp === "slowmo"
										? "bg-blue-500/30 border-blue-400 text-blue-300"
										: "bg-green-500/30 border-green-400 text-green-300"
								}`}
							>
								<span className="text-sm mr-1">
									{activePowerUp === "slowmo" ? "⏰" : "🛡️"}
								</span>
								<span className="font-mono text-xs">
									{Math.ceil(powerUpDuration / 1000)}s
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Bird Selector - Left Side */}
			<div
				className="absolute left-4 z-20"
				style={{ top: "calc(50% - 100px)" }}
			>
				<div className="bg-gradient-to-r from-gray-800/90 to-purple-900/90 backdrop-blur-xl rounded-xl p-3 border border-cyan-500/30 shadow-xl">
					<h5 className="text-cyan-300 font-mono text-xs font-bold mb-2 text-center">
						SELECT BIRD
					</h5>
					<div className="space-y-2">
						{/* Default Bird - Only show if not all NFT birds are owned */}
						{birdBalances
							.slice(0, 4)
							.reduce((total, balance) => total + balance, 0) < 4 && (
							<div
								className={`w-12 h-12 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
									selectedBird === "default"
										? "border-cyan-400 scale-110 shadow-lg shadow-cyan-500/25"
										: "border-cyan-500/30 hover:border-cyan-400/50 hover:scale-105"
								}`}
								onClick={() => setSelectedBird("default")}
							>
								<div className="w-full h-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-400 rounded-lg flex items-center justify-center">
									<div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
										<div className="w-3 h-3 bg-cyan-300 rounded-full"></div>
									</div>
								</div>
							</div>
						)}

						{/* Owned Birds - Only show if user owns them */}
						{birdBalances[0] > 0 && (
							<div
								className={`w-12 h-12 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
									selectedBird === "neon-ronin"
										? "border-cyan-400 scale-110 shadow-lg shadow-cyan-500/25"
										: "border-cyan-500/30 hover:border-cyan-400/50 hover:scale-105"
								}`}
								onClick={() => setSelectedBird("neon-ronin")}
							>
								<img
									src="/images/bird1.png"
									alt="Neon Ronin"
									className="w-full h-full object-contain rounded-lg"
								/>
							</div>
						)}

						{birdBalances[1] > 0 && (
							<div
								className={`w-12 h-12 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
									selectedBird === "circuitwing"
										? "border-cyan-400 scale-110 shadow-lg shadow-cyan-500/25"
										: "border-cyan-500/30 hover:border-cyan-400/50 hover:scale-105"
								}`}
								onClick={() => setSelectedBird("circuitwing")}
							>
								<img
									src="/images/bird4.png"
									alt="Circuitwing"
									className="w-full h-full object-contain rounded-lg"
								/>
							</div>
						)}

						{birdBalances[2] > 0 && (
							<div
								className={`w-12 h-12 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
									selectedBird === "chainlord"
										? "border-cyan-400 scale-110 shadow-lg shadow-cyan-500/25"
										: "border-cyan-500/30 hover:border-cyan-400/50 hover:scale-105"
								}`}
								onClick={() => setSelectedBird("chainlord")}
							>
								<img
									src="/images/bird5.png"
									alt="Chainlord"
									className="w-full h-full object-contain rounded-lg"
								/>
							</div>
						)}

						{birdBalances[3] > 0 && (
							<div
								className={`w-12 h-12 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
									selectedBird === "orb-sentinel"
										? "border-cyan-400 scale-110 shadow-lg shadow-cyan-500/25"
										: "border-cyan-500/30 hover:border-cyan-400/50 hover:scale-105"
								}`}
								onClick={() => setSelectedBird("orb-sentinel")}
							>
								<img
									src="/images/bird3.png"
									alt="Orb Sentinel"
									className="w-full h-full object-contain rounded-lg"
								/>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Game Area */}
			<div
				className={`relative mx-auto bg-gradient-to-b from-gray-900 via-black to-purple-900 rounded-2xl overflow-hidden shadow-inner border border-cyan-500/20 transition-all duration-500 ${
					activePowerUp === "slowmo" ? "brightness-75 sepia-50" : ""
				}`}
				style={{
					width: GAME_WIDTH,
					height: GAME_HEIGHT,
				}}
			>
				{/* Futuristic Background Layers */}
				<div className="absolute inset-0">
					{/* Animated Grid Pattern */}
					<div className="absolute inset-0 opacity-10">
						<div
							className="w-full h-full"
							style={{
								backgroundImage: `
                linear-gradient(cyan 1px, transparent 1px),
                linear-gradient(90deg, cyan 1px, transparent 1px)
              `,
								backgroundSize: "50px 50px",
								animation: "grid-move 20s linear infinite",
							}}
						></div>
					</div>

					{/* Floating Tech Elements */}
					<div className="absolute top-10 left-10 w-4 h-4 border border-cyan-400/30 rotate-45 animate-pulse"></div>
					<div
						className="absolute top-20 right-20 w-6 h-6 border-2 border-purple-400/20 rounded-full animate-spin"
						style={{ animationDuration: "8s" }}
					></div>
					<div className="absolute top-40 left-1/4 w-3 h-3 bg-cyan-400/20 rounded-full animate-bounce"></div>
					<div className="absolute top-60 right-1/3 w-5 h-5 border border-pink-400/30 transform rotate-45 animate-pulse"></div>
					<div className="absolute top-80 left-1/2 w-2 h-2 bg-purple-400/30 rounded-full animate-ping"></div>

					{/* Circuit Lines */}
					<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse"></div>
					<div
						className="absolute top-1/3 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent animate-pulse"
						style={{ animationDelay: "1s" }}
					></div>
					<div
						className="absolute top-2/3 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-pink-400/30 to-transparent animate-pulse"
						style={{ animationDelay: "2s" }}
					></div>

					{/* Floating Particles */}
					<div
						className="absolute top-1/4 left-1/4 w-1 h-1 bg-cyan-300/40 rounded-full animate-bounce"
						style={{ animationDelay: "0.5s" }}
					></div>
					<div
						className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-purple-300/40 rounded-full animate-bounce"
						style={{ animationDelay: "1.5s" }}
					></div>
					<div
						className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-pink-300/40 rounded-full animate-bounce"
						style={{ animationDelay: "2.5s" }}
					></div>
				</div>

				{/* Enhanced Ground */}
				<div
					className="absolute bottom-0 w-full bg-gradient-to-r from-gray-800 via-gray-900 to-purple-900 border-t border-cyan-500/30"
					style={{ height: "50px" }}
				>
					<div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"></div>
					{/* Ground Tech Pattern */}
					<div className="absolute inset-0 opacity-20">
						<div
							className="w-full h-full"
							style={{
								backgroundImage: `
                linear-gradient(90deg, cyan 1px, transparent 1px)
              `,
								backgroundSize: "20px 20px",
							}}
						></div>
					</div>
				</div>

				{/* Cyberpunk Barriers */}
				{pipes.map((pipe) => (
					<div key={pipe.id}>
						{/* Top barrier */}
						<div
							className="absolute bg-gradient-to-r from-gray-800 via-gray-900 to-purple-900 border-2 border-cyan-500/50 neon-glow"
							style={{
								left: pipe.x,
								top: 0,
								width: pipe.width,
								height: pipe.topHeight,
							}}
						>
							<div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 to-transparent"></div>
							<div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-400"></div>
						</div>
						{/* Bottom barrier */}
						<div
							className="absolute bg-gradient-to-r from-gray-800 via-gray-900 to-purple-900 border-2 border-cyan-500/50 neon-glow"
							style={{
								left: pipe.x,
								top: pipe.bottomY,
								width: pipe.width,
								height: GAME_HEIGHT - pipe.bottomY,
							}}
						>
							<div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent"></div>
							<div className="absolute top-0 left-0 w-full h-1 bg-cyan-400"></div>
						</div>
					</div>
				))}

				{/* Cyberpunk Energy Orbs */}
				{coins.map(
					(coin) =>
						!coin.collected && (
							<div
								key={coin.id}
								className="absolute energy-orb animate-pulse"
								style={{
									left: coin.x,
									top: coin.y,
									width: coin.width,
									height: coin.height,
								}}
							>
								<div className="w-full h-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-400 rounded-full border-2 border-cyan-300 flex items-center justify-center text-white font-bold text-sm neon-glow relative">
									<div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-purple-500/30 rounded-full animate-spin"></div>
									<span className="relative z-10">⚡</span>
								</div>
							</div>
						),
				)}

				{/* Cyberpunk Particles */}
				{particles.map((particle) => (
					<div
						key={particle.id}
						className={`absolute rounded-full ${
							particle.type === "explosion"
								? "bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-400 explosion-particle neon-glow"
								: particle.type === "sparkle"
									? "bg-gradient-to-r from-cyan-300 to-purple-400 sparkle-particle neon-glow"
									: "bg-cyan-400 neon-glow"
						}`}
						style={{
							left: particle.x,
							top: particle.y,
							width: particle.size,
							height: particle.size,
							opacity:
								particle.life /
								(particle.type === "explosion"
									? 45
									: particle.type === "sparkle"
										? 40
										: 30),
							filter: particle.type === "explosion" ? "blur(1px)" : "none",
							boxShadow:
								particle.type === "explosion"
									? "0 0 10px cyan"
									: particle.type === "sparkle"
										? "0 0 8px purple"
										: "0 0 6px cyan",
						}}
					/>
				))}

				{/* Speed Lines - Motion Effect */}
				{gameState === "playing" && (
					<>
						{/* Main Speed Lines */}
						<div
							className="absolute pointer-events-none"
							style={{
								left: 120,
								top: birdY + BIRD_SIZE / 2 - 10,
								width: 30,
								height: 20,
							}}
						>
							{/* Speed line 1 */}
							<div
								className="absolute w-8 h-0.5 bg-gradient-to-r from-cyan-400/60 to-transparent transform -rotate-12 speed-line"
								style={{ top: 2, left: -5 }}
							></div>
							{/* Speed line 2 */}
							<div
								className="absolute w-6 h-0.5 bg-gradient-to-r from-purple-400/60 to-transparent transform -rotate-6 speed-line"
								style={{ top: 6, left: -3, animationDelay: "0.1s" }}
							></div>
							{/* Speed line 3 */}
							<div
								className="absolute w-7 h-0.5 bg-gradient-to-r from-pink-400/60 to-transparent transform -rotate-9 speed-line"
								style={{ top: 10, left: -4, animationDelay: "0.2s" }}
							></div>
							{/* Speed line 4 */}
							<div
								className="absolute w-5 h-0.5 bg-gradient-to-r from-cyan-300/60 to-transparent transform -rotate-15 speed-line"
								style={{ top: 14, left: -2, animationDelay: "0.3s" }}
							></div>
							{/* Speed line 5 */}
							<div
								className="absolute w-6 h-0.5 bg-gradient-to-r from-purple-300/60 to-transparent transform -rotate-3 speed-line"
								style={{ top: 18, left: -3, animationDelay: "0.4s" }}
							></div>
						</div>

						{/* Trailing Speed Lines - Further back */}
						<div
							className="absolute pointer-events-none"
							style={{
								left: 100,
								top: birdY + BIRD_SIZE / 2 - 8,
								width: 20,
								height: 16,
							}}
						>
							{/* Trailing line 1 */}
							<div
								className="absolute w-6 h-0.5 bg-gradient-to-r from-cyan-300/40 to-transparent transform -rotate-8 speed-trail"
								style={{ top: 1, left: -3, animationDelay: "0.5s" }}
							></div>
							{/* Trailing line 2 */}
							<div
								className="absolute w-5 h-0.5 bg-gradient-to-r from-purple-300/40 to-transparent transform -rotate-4 speed-trail"
								style={{ top: 5, left: -2, animationDelay: "0.6s" }}
							></div>
							{/* Trailing line 3 */}
							<div
								className="absolute w-4 h-0.5 bg-gradient-to-r from-pink-300/40 to-transparent transform -rotate-10 speed-trail"
								style={{ top: 9, left: -2, animationDelay: "0.7s" }}
							></div>
							{/* Trailing line 4 */}
							<div
								className="absolute w-5 h-0.5 bg-gradient-to-r from-cyan-200/40 to-transparent transform -rotate-6 speed-trail"
								style={{ top: 13, left: -2, animationDelay: "0.8s" }}
							></div>
						</div>

						{/* Motion Blur Effect */}
						<div
							className="absolute pointer-events-none"
							style={{
								left: 140,
								top: birdY + BIRD_SIZE / 2 - 15,
								width: 10,
								height: 30,
							}}
						>
							<div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent motion-blur-effect"></div>
						</div>
					</>
				)}

				{/* Cyber Bird */}
				<div
					className="absolute cyber-bird"
					style={{
						left: 150,
						top: birdY,
						width: BIRD_SIZE,
						height: BIRD_SIZE,
						transform: `rotate(${Math.min(Math.max(birdVelocity * 3, -45), 45)}deg)`,
						transition: "transform 0.1s ease-out",
					}}
				>
					{selectedBird === "default" ? (
						<div className="w-full h-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-400 rounded-full border-2 border-cyan-300 flex items-center justify-center neon-glow relative">
							<div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-purple-500/30 rounded-full animate-pulse"></div>
							<div className="w-5 h-5 bg-black rounded-full mr-2 relative z-10 border border-cyan-300"></div>
							<div className="w-3 h-2 bg-cyan-300 rounded-full relative z-10"></div>
							<div className="absolute -top-2 -right-2 w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
						</div>
					) : selectedBird === "neon-ronin" ? (
						<div className="w-full h-full flex items-center justify-center relative">
							<img
								src="/images/bird1.png"
								alt="Neon Ronin"
								className={`w-[180%] h-[180%] object-contain ${gameState === "playing" ? (birdVelocity > 2 ? "wing-flap-fast" : "wing-flap") : ""}`}
							/>
						</div>
					) : selectedBird === "circuitwing" ? (
						<div className="w-full h-full flex items-center justify-center relative">
							<img
								src="/images/bird4.png"
								alt="Circuitwing"
								className={`w-[180%] h-[180%] object-contain ${gameState === "playing" ? (birdVelocity > 2 ? "wing-flap-fast" : "wing-flap") : ""}`}
							/>
						</div>
					) : selectedBird === "chainlord" ? (
						<div className="w-full h-full flex items-center justify-center relative">
							<img
								src="/images/bird5.png"
								alt="Chainlord"
								className={`w-[180%] h-[180%] object-contain ${gameState === "playing" ? (birdVelocity > 2 ? "wing-flap-fast" : "wing-flap") : ""}`}
							/>
						</div>
					) : selectedBird === "orb-sentinel" ? (
						<div className="w-full h-full flex items-center justify-center relative">
							<img
								src="/images/bird3.png"
								alt="Orb Sentinel"
								className={`w-[180%] h-[180%] object-contain ${gameState === "playing" ? (birdVelocity > 2 ? "wing-flap-fast" : "wing-flap") : ""}`}
							/>
						</div>
					) : (
						<div className="w-full h-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-400 rounded-full border-2 border-cyan-300 flex items-center justify-center neon-glow relative">
							<div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-purple-500/30 rounded-full animate-pulse"></div>
							<div className="w-5 h-5 bg-black rounded-full mr-2 relative z-10 border border-cyan-300"></div>
							<div className="w-3 h-2 bg-cyan-300 rounded-full relative z-10"></div>
							<div className="absolute -top-2 -right-2 w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
						</div>
					)}
				</div>

				{/* Game state overlays */}
				{gameState === "waiting" && (
					<div className="absolute inset-0 game-overlay rounded-2xl flex items-center justify-center slide-in bg-black/80 backdrop-blur-sm">
						<div className="text-center text-white">
							<div className="text-6xl mb-6">🤖</div>
							<h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent neon-text">
								SYSTEM READY
							</h3>
							<p className="text-cyan-300 mb-8 text-xl font-mono">
								Press SPACE to start!
							</p>
							<div className="space-y-3 text-sm text-cyan-300 font-mono">
								<p>⚡ SPACE to fly</p>
								<p>🔋 Collect orbs for $ORBS</p>
								<p>🏁 Press E to end</p>
							</div>
						</div>
					</div>
				)}

				{/* End Mission Button */}
				{gameState === "playing" && (
					<div className="absolute top-4 right-4">
						<button
							onClick={() => {
								if (rewardsDistributedRef.current) return;

								setGameState("finished");
								const finalTime = time;
								const finalCoins = coinsCollected;

								onGameComplete(finalTime);
								onCoinsCollected(finalCoins);

								const totalTokens = calculateRewards(finalTime, finalCoins);
								onTokensEarned(totalTokens);
								setRewardsDistributed(true);
								rewardsDistributedRef.current = true;
							}}
							className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-cyan-500/25 hover:scale-105 text-sm border border-cyan-400/30 font-mono"
						>
							⚡ END MISSION
						</button>
					</div>
				)}

				{gameState === "crashed" && (
					<div className="absolute inset-0 game-overlay rounded-2xl flex items-center justify-center slide-in bg-black/95 backdrop-blur-sm">
						<div className="text-center text-white">
							<div className="text-6xl mb-6">💥</div>
							<h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-red-400 via-pink-500 to-purple-400 bg-clip-text text-transparent neon-text font-mono">
								SYSTEM CRASH!
							</h3>
							<div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-6">
								<div className="bg-gradient-to-r from-cyan-500/20 to-purple-600/20 backdrop-blur-xl rounded-xl px-6 py-3 border border-cyan-500/30">
									<p className="text-cyan-300 text-sm font-mono">FINAL SCORE</p>
									<p className="text-2xl font-bold text-cyan-400 font-mono">
										{score.toLocaleString()}
									</p>
								</div>
								<div className="bg-gradient-to-r from-purple-500/20 to-pink-600/20 backdrop-blur-xl rounded-xl px-6 py-3 border border-purple-500/30">
									<p className="text-purple-300 text-sm font-mono">
										ORBS COLLECTED
									</p>
									<p className="text-2xl font-bold text-purple-400 font-mono">
										{coinsCollected}
									</p>
								</div>
							</div>
							<div className="bg-gradient-to-r from-cyan-500/20 to-purple-600/20 backdrop-blur-xl rounded-xl p-4 border border-cyan-500/30 mb-6">
								<div className="text-2xl mb-2">⚡</div>
								<p className="text-cyan-300 font-semibold font-mono">
									REWARDS SENT TO WALLET!
								</p>
								<p className="text-cyan-200/80 text-sm font-mono">
									{coinsCollected} orbs = {coinsCollected} $ORBS distributed
								</p>
							</div>

							<button
								onClick={startGame}
								className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-cyan-500/25 hover:scale-105 border border-cyan-400/30 font-mono"
							>
								🤖 RESTART SYSTEM
							</button>
						</div>
					</div>
				)}

				{gameState === "finished" && (
					<div className="absolute inset-0 game-overlay rounded-2xl flex items-center justify-center slide-in">
						<div className="text-center text-white">
							<div className="text-6xl mb-6">🏆</div>
							<h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
								GAME COMPLETE!
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
								<div className="score-display rounded-xl px-6 py-3">
									<p className="text-gray-300 text-sm">Score</p>
									<p className="text-2xl font-bold text-blue-400">
										{score.toLocaleString()}
									</p>
								</div>
								<div className="score-display rounded-xl px-6 py-3">
									<p className="text-gray-300 text-sm">Time</p>
									<p className="text-2xl font-bold text-green-400">
										{formatTime(time)}
									</p>
								</div>
								<div className="score-display rounded-xl px-6 py-3">
									<p className="text-gray-300 text-sm">Coins</p>
									<p className="text-2xl font-bold text-yellow-400">
										{coinsCollected}
									</p>
								</div>
							</div>

							<div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30 mb-6">
								<div className="text-2xl mb-2">🎉</div>
								<p className="text-green-300 font-semibold">
									Rewards Sent to Wallet!
								</p>
								<p className="text-green-200/80 text-sm">
									{coinsCollected} orbs = {coinsCollected} $ORBS distributed
								</p>
							</div>

							<button
								onClick={startGame}
								className="modern-button text-white font-bold py-3 px-8 rounded-xl text-lg"
							>
								🏁 Play Again
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Instructions */}
			<div className="mt-8 text-center">
				<div className="bg-gradient-to-r from-gray-800/80 to-purple-900/80 backdrop-blur-xl rounded-2xl p-6 border border-cyan-500/30 shadow-xl">
					<h4 className="text-lg font-semibold text-cyan-300 mb-3 font-mono">
						🎮 GAME CONTROLS
					</h4>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-cyan-300">
						<div className="flex items-center justify-center space-x-2">
							<span className="bg-cyan-600 px-2 py-1 rounded text-xs font-mono">
								SPACE
							</span>
							<span className="font-mono">Flap Wings / Start Game</span>
						</div>
						<div className="flex items-center justify-center space-x-2">
							<span className="bg-purple-600 px-2 py-1 rounded text-xs font-mono">
								E
							</span>
							<span className="font-mono">End Game</span>
						</div>
						<div className="flex items-center justify-center space-x-2">
							<span className="bg-blue-600 px-2 py-1 rounded text-xs font-mono">
								Q
							</span>
							<span className="font-mono">
								Use Slowmo ({purchasedPowerUps.slowmo})
							</span>
						</div>
						<div className="flex items-center justify-center space-x-2">
							<span className="bg-green-600 px-2 py-1 rounded text-xs font-mono">
								W
							</span>
							<span className="font-mono">
								Use Shield ({purchasedPowerUps.shield})
							</span>
						</div>
					</div>
					<p className="text-cyan-300 mt-4 text-sm font-mono">
						⚡ Collect energy orbs to earn $ORBS! (1 orb = 1 $ORBS) 🏁 End the
						game to automatically receive rewards in your wallet.
					</p>
				</div>
			</div>
		</div>
	);
}
