import { Redirect } from "expo-router";

// Replaces the generated route list with the start screen.
export default function Sitemap() {
  return <Redirect href="/" />;
}
