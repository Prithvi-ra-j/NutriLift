import { fireEvent, render } from "@testing-library/react-native";
import { Button } from "../Button";

describe("Button", () => {
  it("announces its label and button role and invokes its action", async () => {
    const onPress = jest.fn();
    const ui = await render(
      <Button label="Save entry" onPress={onPress} testID="nutrition.save" />,
    );

    await fireEvent.press(ui.getByRole("button", { name: "Save entry" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(ui.getByTestId("nutrition.save")).toBeTruthy();
  });

  it("exposes the disabled state and does not invoke disabled actions", async () => {
    const onPress = jest.fn();
    const ui = await render(
      <Button disabled label="Save entry" onPress={onPress} />,
    );

    expect(ui.getByRole("button", { name: "Save entry" }).props.accessibilityState)
      .toMatchObject({ disabled: true, busy: false });
    await fireEvent.press(ui.getByRole("button", { name: "Save entry" }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
