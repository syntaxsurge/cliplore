import IpfiClient from "./IpfiClient";

export default async function ProjectIpfiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ exportId?: string }>;
}) {
  const { id } = await params;
  const { exportId } = await searchParams;
  return <IpfiClient projectId={id} initialExportId={exportId} />;
}

