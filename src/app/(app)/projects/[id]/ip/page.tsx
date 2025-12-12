import RegistrationClient from "./RegistrationClient";

export default async function IpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RegistrationClient projectId={id} />;
}
