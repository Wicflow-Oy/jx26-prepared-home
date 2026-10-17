import { useLocalSearchParams } from "expo-router";

import { CheckScreen } from "@/prepared-home";
import { param } from "@/prepared-home/routes";

export default function CheckRoute() {
  const { checkId } = useLocalSearchParams<{ checkId: string }>();
  const id = param(checkId);
  return <CheckScreen key={id} checkId={id} />;
}
