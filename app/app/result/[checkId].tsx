import { useLocalSearchParams } from "expo-router";

import { ResultScreen, param } from "@/prepared-home";

export default function ResultRoute() {
  const { checkId } = useLocalSearchParams<{ checkId: string }>();
  return <ResultScreen checkId={param(checkId)} />;
}
