export function Logo({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			{/* House roof */}
			<path
				d="M16 3L2 15h4v12h20V15h4L16 3z"
				fill="currentColor"
				opacity={0.15}
			/>
			<path
				d="M16 3L2 15h4v12h20V15h4L16 3z"
				stroke="currentColor"
				strokeWidth={1.5}
				strokeLinejoin="round"
				fill="none"
			/>
			{/* Floor plan lines inside */}
			<path
				d="M10 27V20h6v7M16 23h6V15"
				stroke="currentColor"
				strokeWidth={1.2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{/* Door arc */}
			<path
				d="M16 27a4 4 0 0 1-4-4"
				stroke="currentColor"
				strokeWidth={1}
				strokeDasharray="2 1.5"
				fill="none"
			/>
		</svg>
	);
}
