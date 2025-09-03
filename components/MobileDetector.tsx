"use client";

import { useEffect, useState } from "react";

export function MobileDetector() {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const checkMobile = () => {
			const userAgent = navigator.userAgent.toLowerCase();
			const isMobileDevice = /mobile|android|iphone|ipad|phone|tablet/i.test(
				userAgent,
			);
			const isSmallScreen = window.innerWidth < 768;
			setIsMobile(isMobileDevice || isSmallScreen);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);

		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	if (!isMobile) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 text-white">
			<div className="text-center p-8 max-w-md">
				<div className="text-6xl mb-4">🖥️</div>
				<h1 className="text-2xl font-bold mb-4">Desktop Only</h1>
				<p className="text-lg mb-6">
					Cyber Bird is designed for desktop computers. Please open this app on
					a desktop or laptop for the best gaming experience.
				</p>
				<div className="text-sm text-gray-300">
					<p>Mobile devices are not supported due to:</p>
					<ul className="mt-2 space-y-1">
						<li>• Complex keyboard controls</li>
						<li>• Performance requirements</li>
						<li>• Screen size limitations</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
