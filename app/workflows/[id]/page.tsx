import { redirect } from "next/navigation";

type Params = Promise<{ id: string }>;

type Props = {
  params: Params;
};

export default async function WorkflowDetailsRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/workflows/${id}/builder`);
}
