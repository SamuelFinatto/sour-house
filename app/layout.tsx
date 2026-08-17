import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Sour House",
		template: "%s | Sour House",
	},
	description: "Self-hosted house planning tool",
	manifest: "/manifest.json",
	icons: {
		icon: [
			{ url: "/icon.svg", type: "image/svg+xml" },
			{ url: "/favicon.ico", sizes: "any" },
		],
		apple: "/icon-192.png",
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Sour House",
	},
};

export const viewport: Viewport = {
	themeColor: "#171717",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="h-full flex flex-col">
				{children}
				<Toaster richColors />
				{process.env.NODE_ENV === "production" && (
					<Script
						id="sw-register"
						strategy="afterInteractive"
						dangerouslySetInnerHTML={{
							__html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
              }
            `,
						}}
					/>
				)}
			</body>
		</html>
	);
}
