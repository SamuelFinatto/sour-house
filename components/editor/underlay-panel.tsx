"use client";

import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api";
import type { FloorUnderlay } from "@/types/floor";

interface UnderlayPanelProps {
	projectId: string;
	underlay?: FloorUnderlay;
	onUpdate: (underlay: FloorUnderlay | undefined) => void;
}

export function UnderlayPanel({
	projectId,
	underlay,
	onUpdate,
}: UnderlayPanelProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	async function handleUpload(file: File) {
		const formData = new FormData();
		formData.append("file", file);
		const res = await fetch(apiUrl(`/api/projects/${projectId}/assets`), {
			method: "POST",
			body: formData,
		});
		if (!res.ok) {
			const err = await res.json();
			toast.error(err.error || "Failed to upload");
			return;
		}
		const { assetId } = await res.json();
		onUpdate({
			assetId,
			x: 0,
			y: 0,
			width: 500,
			height: 500,
			opacity: 0.3,
		});
		toast.success("Underlay uploaded");
	}

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) handleUpload(file);
		e.target.value = "";
	}

	return (
		<div className="p-3 space-y-2">
			<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
				<ImageIcon className="h-3 w-3" />
				Underlay
			</h3>

			{!underlay ? (
				<>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/png,image/jpeg,image/webp,image/svg+xml"
						className="hidden"
						onChange={handleFileChange}
					/>
					<Button
						variant="outline"
						size="sm"
						className="w-full"
						onClick={() => fileInputRef.current?.click()}
					>
						<Upload className="mr-2 h-3 w-3" />
						Upload Image
					</Button>
				</>
			) : (
				<div className="space-y-2">
					<div>
						<Label className="text-xs">Opacity</Label>
						<input
							type="range"
							min={0}
							max={100}
							value={Math.round(underlay.opacity * 100)}
							onChange={(e) =>
								onUpdate({
									...underlay,
									opacity: Number(e.target.value) / 100,
								})
							}
							className="w-full h-1.5 accent-primary"
						/>
						<p className="text-[10px] text-muted-foreground text-right">
							{Math.round(underlay.opacity * 100)}%
						</p>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div>
							<Label className="text-xs">X</Label>
							<input
								type="number"
								value={underlay.x}
								onChange={(e) =>
									onUpdate({
										...underlay,
										x: Number(e.target.value),
									})
								}
								className="w-full h-7 text-xs rounded-lg border border-input bg-transparent px-2 outline-none focus-visible:border-ring"
							/>
						</div>
						<div>
							<Label className="text-xs">Y</Label>
							<input
								type="number"
								value={underlay.y}
								onChange={(e) =>
									onUpdate({
										...underlay,
										y: Number(e.target.value),
									})
								}
								className="w-full h-7 text-xs rounded-lg border border-input bg-transparent px-2 outline-none focus-visible:border-ring"
							/>
						</div>
						<div>
							<Label className="text-xs">Width</Label>
							<input
								type="number"
								value={underlay.width}
								onChange={(e) =>
									onUpdate({
										...underlay,
										width: Number(e.target.value),
									})
								}
								className="w-full h-7 text-xs rounded-lg border border-input bg-transparent px-2 outline-none focus-visible:border-ring"
							/>
						</div>
						<div>
							<Label className="text-xs">Height</Label>
							<input
								type="number"
								value={underlay.height}
								onChange={(e) =>
									onUpdate({
										...underlay,
										height: Number(e.target.value),
									})
								}
								className="w-full h-7 text-xs rounded-lg border border-input bg-transparent px-2 outline-none focus-visible:border-ring"
							/>
						</div>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={() => fileInputRef.current?.click()}
						>
							Replace
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => onUpdate(undefined)}
							title="Remove underlay"
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/png,image/jpeg,image/webp,image/svg+xml"
						className="hidden"
						onChange={handleFileChange}
					/>
				</div>
			)}
		</div>
	);
}
