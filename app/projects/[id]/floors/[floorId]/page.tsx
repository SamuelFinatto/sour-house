import { FloorEditor } from "@/components/editor/floor-editor";

export default async function FloorEditorPage(
	props: PageProps<"/projects/[id]/floors/[floorId]">,
) {
	const { id, floorId } = await props.params;

	return <FloorEditor projectId={id} floorId={floorId} />;
}
