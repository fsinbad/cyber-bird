"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AudioManagerProps {
	isGamePlaying: boolean;
	onCoinCollect: () => void;
	onCrash: () => void;
	onJump: () => void;
}

export function AudioManager({
	isGamePlaying,
	onCoinCollect,
	onCrash,
	onJump,
}: AudioManagerProps) {
	const [isMuted, setIsMuted] = useState(false);
	const [lastCrashTime, setLastCrashTime] = useState(0);

	// Audio refs - only keep what we need
	const coinSoundRef = useRef<HTMLAudioElement | null>(null);
	const crashSoundRef = useRef<HTMLAudioElement | null>(null);
	const jumpSoundRef = useRef<HTMLAudioElement | null>(null);

	// Audio control functions - define these first

	const playCoinSound = useCallback(() => {
		if (coinSoundRef.current && !isMuted) {
			coinSoundRef.current.currentTime = 0;
			coinSoundRef.current.play().catch(() => {});
		}
	}, [isMuted]);

	const playCrashSound = useCallback(() => {
		// Prevent crash sound spam - only play once every 2 seconds
		const now = Date.now();
		if (now - lastCrashTime < 2000) return;

		if (crashSoundRef.current && !isMuted) {
			setLastCrashTime(now);
			crashSoundRef.current.currentTime = 0;
			crashSoundRef.current.play().catch(() => {});
		}
	}, [isMuted, lastCrashTime]);

	const playJumpSound = useCallback(() => {
		if (jumpSoundRef.current && !isMuted) {
			jumpSoundRef.current.currentTime = 0;
			jumpSoundRef.current.play().catch(() => {});
		}
	}, [isMuted]);

	// Initialize audio elements
	useEffect(() => {
		// Coin collection sound
		coinSoundRef.current = new Audio("/sounds/coin-collect.mp3");
		coinSoundRef.current.volume = 0.7;

		// Crash sound
		crashSoundRef.current = new Audio("/sounds/crash.mp3");
		crashSoundRef.current.volume = 0.4; // Lower volume to make it less overwhelming

		// Jump sound
		jumpSoundRef.current = new Audio("/sounds/jump.mp3");
		jumpSoundRef.current.volume = 0.6;
	}, []);

	// Expose audio functions to parent component
	useEffect(() => {
		// Only run in browser environment and ensure window exists
		if (typeof window === "undefined" || !window) return;

		try {
			// Create audio functions that can be called from the game
			const audioOnCoinCollect = () => {
				playCoinSound();
				// Call the original callback if it exists
				if (onCoinCollect) onCoinCollect();
			};

			const audioOnCrash = () => {
				playCrashSound();
				// Call the original callback if it exists
				if (onCrash) onCrash();
			};

			const audioOnJump = () => {
				playJumpSound();
				// Call the original callback if it exists
				if (onJump) onJump();
			};

			// Assign audio functions to window object safely
			window.audioOnCoinCollect = audioOnCoinCollect;
			window.audioOnCrash = audioOnCrash;
			window.audioOnJump = audioOnJump;
		} catch (error) {
			// Audio functions not available
		}
	}, [
		onCoinCollect,
		onCrash,
		onJump,
		playCoinSound,
		playCrashSound,
		playJumpSound,
	]);

	const toggleMute = () => {
		setIsMuted(!isMuted);
	};

	return (
		<div className="fixed top-4 right-4 z-50">
			{/* Simple Mute/Unmute Button */}
			<button
				onClick={toggleMute}
				className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${
					isMuted
						? "bg-red-500 hover:bg-red-600 text-white"
						: "bg-green-500 hover:bg-green-600 text-white"
				}`}
				title={isMuted ? "Unmute" : "Mute"}
			>
				{isMuted ? "🔇" : "🔊"}
			</button>
		</div>
	);
}

// Export audio functions for use in other components
export const audioFunctions = {
	playCoinSound: () => {
		if (typeof window !== "undefined" && window.audioOnCoinCollect) {
			window.audioOnCoinCollect();
		}
	},
	playCrashSound: () => {
		if (typeof window !== "undefined" && window.audioOnCrash) {
			window.audioOnCrash();
		}
	},
	playJumpSound: () => {
		if (typeof window !== "undefined" && window.audioOnJump) {
			window.audioOnJump();
		}
	},
};


