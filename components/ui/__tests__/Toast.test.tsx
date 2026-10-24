import { fireEvent, render } from "@testing-library/react-native";
import { Button, View } from "react-native";
import { ToastProvider, useToast } from "../Toast";

function ToastHarness({ onUndo }: { onUndo: () => void }) {
  const toast = useToast();
  return (
    <Button
      title="Queue notifications"
      onPress={() => {
        toast.show({ message: "First notification", kind: "info", durationMs: 60_000 });
        toast.show({
          message: "Second notification",
          kind: "success",
          action: { label: "Undo", onPress: onUndo },
          durationMs: 60_000,
        });
      }}
    />
  );
}

describe("ToastProvider", () => {
  it("queues notifications and runs an undo action", async () => {
    const onUndo = jest.fn();
    const ui = await render(
      <ToastProvider>
        <View>
          <ToastHarness onUndo={onUndo} />
        </View>
      </ToastProvider>,
    );

    await fireEvent.press(ui.getByRole("button", { name: "Queue notifications" }));
    expect(ui.getByText("First notification")).toBeTruthy();
    expect(ui.queryByText("Second notification")).toBeNull();

    await fireEvent.press(ui.getByRole("button", { name: "Dismiss notification" }));
    expect(ui.getByText("Second notification")).toBeTruthy();

    await fireEvent.press(ui.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(ui.queryByText("Second notification")).toBeNull();
  });
});
