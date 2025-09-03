// Rate limiting utility for API endpoints

interface RateLimitEntry {
	requests: number[];
	lastCleanup: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

// Clean up old entries periodically
function cleanupOldEntries() {
	const now = Date.now();
	for (const [key, entry] of rateLimitMap.entries()) {
		// Remove entries older than 1 hour
		if (now - entry.lastCleanup > 60 * 60 * 1000) {
			rateLimitMap.delete(key);
		}
	}
}

export function rateLimit(
	identifier: string,
	maxRequests: number,
	windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
	const now = Date.now();
	
	// Clean up old entries periodically
	if (Math.random() < 0.01) { // 1% chance to cleanup
		cleanupOldEntries();
	}
	
	let entry = rateLimitMap.get(identifier);
	if (!entry) {
		entry = {
			requests: [],
			lastCleanup: now
		};
		rateLimitMap.set(identifier, entry);
	}
	
	// Remove requests outside the time window
	entry.requests = entry.requests.filter(time => now - time < windowMs);
	
	// Check if limit exceeded
	if (entry.requests.length >= maxRequests) {
		const oldestRequest = Math.min(...entry.requests);
		const resetTime = oldestRequest + windowMs;
		return {
			allowed: false,
			remaining: 0,
			resetTime
		};
	}
	
	// Add current request
	entry.requests.push(now);
	
	return {
		allowed: true,
		remaining: maxRequests - entry.requests.length,
		resetTime: now + windowMs
	};
}

// Rate limit for game reward claims (5 requests per minute)
export function rateLimitGameRewards(userAddress: string): { allowed: boolean; remaining: number; resetTime: number } {
	return rateLimit(`game_rewards_${userAddress}`, 5, 60 * 1000);
}

// Rate limit for purchases (10 requests per minute)
export function rateLimitPurchases(userAddress: string): { allowed: boolean; remaining: number; resetTime: number } {
	return rateLimit(`purchases_${userAddress}`, 10, 60 * 1000);
}

// Rate limit for auth attempts (3 requests per minute)
export function rateLimitAuth(email: string): { allowed: boolean; remaining: number; resetTime: number } {
	return rateLimit(`auth_${email}`, 3, 60 * 1000);
}
