import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MobileDetector } from "../components/MobileDetector";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Cyber Bird",
	description: "Race to earn ERC-20 tokens!",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<MobileDetector />
				{children}
			</body>
		</html>
	);
}
