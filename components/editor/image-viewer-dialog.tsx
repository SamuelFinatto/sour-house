"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ImageViewerDialogProps {
	open: boolean;
	title: string;
	src: string;
	onClose: () => void;
}

export function ImageViewerDialog({
	open,
	title,
	src,
	onClose,
}: ImageViewerDialogProps) {
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-3xl max-h-[90vh]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<div className="flex items-center justify-center overflow-auto">
					<img
						src={src}
						alt={title}
						className="max-w-full max-h-[75vh] object-contain rounded"
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
