import { useLocalSearchParams } from "expo-router";

import { StartScreen } from "@/prepared-home";
import { param } from "@/prepared-home/routes";

export default function StartRoute() {
  const { example } = useLocalSearchParams<{ example?: string }>();
  return <StartScreen example={param(example) || undefined} />;
}
