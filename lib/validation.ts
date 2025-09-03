// Input validation utilities for API routes

export interface ValidationResult {
	isValid: boolean;
	error?: string;
}

// Email validation
export function validateEmail(email: any): ValidationResult {
	if (typeof email !== 'string') {
		return { isValid: false, error: 'Email must be a string' };
	}
	
	if (email.length === 0) {
		return { isValid: false, error: 'Email is required' };
	}
	
	if (email.length > 254) {
		return { isValid: false, error: 'Email is too long' };
	}
	
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return { isValid: false, error: 'Invalid email format' };
	}
	
	return { isValid: true };
}

// Token ID validation (0-5 for birds and power-ups)
export function validateTokenId(tokenId: any): ValidationResult {
	if (typeof tokenId !== 'number') {
		return { isValid: false, error: 'Token ID must be a number' };
	}
	
	if (!Number.isInteger(tokenId)) {
		return { isValid: false, error: 'Token ID must be an integer' };
	}
	
	if (tokenId < 0 || tokenId > 5) {
		return { isValid: false, error: 'Token ID must be between 0 and 5' };
	}
	
	return { isValid: true };
}

// Quantity validation
export function validateQuantity(quantity: any): ValidationResult {
	if (typeof quantity !== 'number') {
		return { isValid: false, error: 'Quantity must be a number' };
	}
	
	if (!Number.isInteger(quantity)) {
		return { isValid: false, error: 'Quantity must be an integer' };
	}
	
	if (quantity <= 0) {
		return { isValid: false, error: 'Quantity must be greater than 0' };
	}
	
	if (quantity > 100) {
		return { isValid: false, error: 'Quantity cannot exceed 100' };
	}
	
	return { isValid: true };
}

// Game stats validation
export function validateGameStats(gameStats: any): ValidationResult {
	if (typeof gameStats !== 'object' || gameStats === null) {
		return { isValid: false, error: 'Game stats must be an object' };
	}
	
	if (typeof gameStats.bestTime !== 'number') {
		return { isValid: false, error: 'Best time must be a number' };
	}
	
	if (typeof gameStats.totalGames !== 'number') {
		return { isValid: false, error: 'Total games must be a number' };
	}
	
	if (!Number.isInteger(gameStats.totalGames)) {
		return { isValid: false, error: 'Total games must be an integer' };
	}
	
	if (gameStats.bestTime < 0) {
		return { isValid: false, error: 'Best time cannot be negative' };
	}
	
	if (gameStats.totalGames < 0) {
		return { isValid: false, error: 'Total games cannot be negative' };
	}
	
	if (gameStats.bestTime > 300000) { // 5 minutes max
		return { isValid: false, error: 'Best time is unreasonably high' };
	}
	
	if (gameStats.totalGames > 10000) { // Reasonable upper limit
		return { isValid: false, error: 'Total games is unreasonably high' };
	}
	
	return { isValid: true };
}

// Timestamp validation
export function validateTimestamp(timestamp: any): ValidationResult {
	if (typeof timestamp !== 'number') {
		return { isValid: false, error: 'Timestamp must be a number' };
	}
	
	if (!Number.isInteger(timestamp)) {
		return { isValid: false, error: 'Timestamp must be an integer' };
	}
	
	const now = Date.now();
	const fiveMinutesAgo = now - (5 * 60 * 1000);
	const oneDayAgo = now - (24 * 60 * 60 * 1000);
	
	if (timestamp < oneDayAgo) {
		return { isValid: false, error: 'Timestamp is too old' };
	}
	
	if (timestamp > now + 60000) { // Allow 1 minute future tolerance
		return { isValid: false, error: 'Timestamp is in the future' };
	}
	
	return { isValid: true };
}

// Amount validation for rewards
export function validateRewardAmount(amount: any): ValidationResult {
	if (typeof amount !== 'number') {
		return { isValid: false, error: 'Amount must be a number' };
	}
	
	if (!Number.isInteger(amount)) {
		return { isValid: false, error: 'Amount must be an integer' };
	}
	
	if (amount < 0) {
		return { isValid: false, error: 'Amount cannot be negative' };
	}
	
	if (amount > 1000) { // Reasonable upper limit for single game
		return { isValid: false, error: 'Amount is unreasonably high' };
	}
	
	return { isValid: true };
}

// Code validation (for auth codes)
export function validateAuthCode(code: any): ValidationResult {
	if (typeof code !== 'string') {
		return { isValid: false, error: 'Code must be a string' };
	}
	
	if (code.length === 0) {
		return { isValid: false, error: 'Code is required' };
	}
	
	if (code.length > 10) {
		return { isValid: false, error: 'Code is too long' };
	}
	
	// Only allow alphanumeric characters
	const codeRegex = /^[a-zA-Z0-9]+$/;
	if (!codeRegex.test(code)) {
		return { isValid: false, error: 'Code contains invalid characters' };
	}
	
	return { isValid: true };
}

// Request size validation
export function validateRequestSize(request: Request, maxSize: number = 1024 * 1024): ValidationResult {
	const contentLength = request.headers.get('content-length');
	if (contentLength && parseInt(contentLength) > maxSize) {
		return { isValid: false, error: 'Request too large' };
	}
	return { isValid: true };
}
