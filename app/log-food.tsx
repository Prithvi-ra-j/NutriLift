import { Redirect, useLocalSearchParams } from "expo-router";

export default function LogFoodDeepLink() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const meal = typeof params.meal === "string" ? params.meal : undefined;
  const date = typeof params.date === "string" ? params.date : undefined;

  return (
    <Redirect
      href={{
        pathname: "/modals/log-food",
        params: { meal, date },
      }}
    />
  );
}
