import { useLocalSearchParams } from "expo-router";

import { StartScreen, param } from "@/prepared-home";

export default function StartRoute() {
  const { example } = useLocalSearchParams<{ example?: string }>();
  return <StartScreen example={param(example) || undefined} />;
}
