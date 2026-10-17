import { useLocalSearchParams } from "expo-router";

import { AdjusterScreen } from "@/prepared-home";
import { param } from "@/prepared-home/routes";

export default function AdjusterRoute() {
  const { claimId } = useLocalSearchParams<{ claimId: string }>();
  return <AdjusterScreen claimId={param(claimId)} />;
}
