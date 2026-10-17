import { useLocalSearchParams } from "expo-router";

import { ResultScreen } from "@/prepared-home";
import { param } from "@/prepared-home/routes";

export default function ResultRoute() {
  const { checkId } = useLocalSearchParams<{ checkId: string }>();
  return <ResultScreen checkId={param(checkId)} />;
}
