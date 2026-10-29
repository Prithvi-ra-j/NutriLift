import { router } from "expo-router";
import { ListRow } from "../ui/ListRow";

export function BodySection() {
  return (
    <ListRow
      icon="clipboard"
      title="Import InBody Report"
      subtitle="Paste from Claude or ChatGPT"
      onPress={() => router.push("/modals/inbody-paste")}
    />
  );
}
