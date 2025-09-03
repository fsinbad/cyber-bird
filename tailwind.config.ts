import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				"race-red": "#e74c3c",
				"race-blue": "#3498db",
				"race-green": "#2ecc71",
				"race-yellow": "#f1c40f",
				"race-orange": "#e67e22",
			},
			animation: {
				"bounce-slow": "bounce 2s infinite",
				"pulse-slow": "pulse 3s infinite",
			},
		},
	},
	plugins: [],
};
export default config;
