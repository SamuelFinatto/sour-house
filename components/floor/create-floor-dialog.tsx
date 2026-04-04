"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateFloorDialogProps {
	onCreate: (floor: { id: string; name: string; elevationCm: number }) => void;
}

export function CreateFloorDialog({ onCreate }: CreateFloorDialogProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [elevation, setElevation] = useState("0");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		const id = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");

		onCreate({
			id,
			name: name.trim(),
			elevationCm: Number.parseInt(elevation, 10) || 0,
		});
		setName("");
		setElevation("0");
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button />}>
				<Plus className="mr-2 h-4 w-4" />
				Add Floor
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Floor</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="floor-name">Floor Name</Label>
						<Input
							id="floor-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ground Floor"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="elevation">Elevation (cm)</Label>
						<Input
							id="elevation"
							type="number"
							value={elevation}
							onChange={(e) => setElevation(e.target.value)}
						/>
					</div>
					<Button type="submit" className="w-full">
						Add Floor
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
