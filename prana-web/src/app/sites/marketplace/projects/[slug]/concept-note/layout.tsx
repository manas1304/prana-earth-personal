import { redirect } from "next/navigation";
import { getCurrentUser } from "@/core/auth/session"; // Adjust path if needed
import { getUserSubscription } from "@/actions/billing.actions";

export default async function ConceptNoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // 1. Check if logged in
  if (!user) {
    redirect("/login");
  }

  // 2. Fetch their actual subscription status
  const subResponse: any = await getUserSubscription();
  const subData = subResponse?.data;

  // Check the specific flags returned by your billing service
  if (!subData?.isMarketplaceAccess && subData?.planType !== "MARKETPLACE") {
    redirect("/pricing");
  }

  // 4. If authorized, render the page
  return <>{children}</>;
}