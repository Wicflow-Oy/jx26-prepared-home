import { useLocalSearchParams } from "expo-router";

import { AdjusterScreen, param } from "@/prepared-home";

export default function AdjusterRoute() {
  const { claimId } = useLocalSearchParams<{ claimId: string }>();
  return <AdjusterScreen claimId={param(claimId)} />;
}
