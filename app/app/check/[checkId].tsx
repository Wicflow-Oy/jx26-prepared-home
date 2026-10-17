import { useLocalSearchParams } from "expo-router";

import { CheckScreen } from "@/prepared-home";
import { param } from "@/prepared-home/routes";

export default function CheckRoute() {
  const { checkId } = useLocalSearchParams<{ checkId: string }>();
  // No key: moving to the next check keeps the screen, and its camera, mounted.
  return <CheckScreen checkId={param(checkId)} />;
}
