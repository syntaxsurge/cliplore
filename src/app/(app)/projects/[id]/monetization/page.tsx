import MonetizationClient from "./MonetizationClient";

export default async function MonetizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MonetizationClient projectId={id} />;
}
