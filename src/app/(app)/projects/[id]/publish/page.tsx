import PublishClient from "./PublishClient";

export default async function PublishPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ exportId?: string }>;
}) {
  const { id } = await params;
  const { exportId } = await searchParams;
  return <PublishClient projectId={id} initialExportId={exportId} />;
}

