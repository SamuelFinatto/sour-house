import { Preview3D } from "@/components/editor/preview-3d";

export default async function Preview3DPage(
	props: PageProps<"/projects/[id]/floors/[floorId]/3d">,
) {
	const { id, floorId } = await props.params;

	return <Preview3D projectId={id} floorId={floorId} />;
}
