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

interface CreateProjectDialogProps {
	onCreate: (project: { id: string; name: string; address?: string }) => void;
}

export function CreateProjectDialog({ onCreate }: CreateProjectDialogProps) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [address, setAddress] = useState("");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		const id = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");

		onCreate({ id, name: name.trim(), address: address.trim() || undefined });
		setName("");
		setAddress("");
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button />}>
				<Plus className="mr-2 h-4 w-4" />
				New Project
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Project</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Project Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="My House"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="address">Address (optional)</Label>
						<Input
							id="address"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder="123 Main Street"
						/>
					</div>
					<Button type="submit" className="w-full">
						Create Project
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
