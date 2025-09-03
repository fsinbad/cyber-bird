// Extend the Window interface to include audio functions
declare global {
	interface Window {
		audioOnJump?: () => void;
		audioOnCrash?: () => void;
		audioOnCoinCollect?: () => void;
	}
}

export {};
