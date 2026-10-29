import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { AsyncBoundary } from "../AsyncBoundary";

jest.mock("@expo/vector-icons", () => ({
  Feather: () => null,
}));

async function renderWithQuery(
  queryFn: () => Promise<string[]>,
  isEmpty: (data: string[]) => boolean = (data) => data.length === 0,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Harness() {
    const query = useQuery({ queryKey: ["async-boundary"], queryFn, retry: false });
    return (
      <AsyncBoundary
        emptyMessage="No entries saved."
        emptyTitle="No entries"
        errorMessage="Could not load entries."
        isEmpty={isEmpty}
        loadingFallback={<Text testID="loading">Loading</Text>}
        query={query}
      >
        {(entries) => <Text>{entries.join(", ")}</Text>}
      </AsyncBoundary>
    );
  }
  const ui = await render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
  return { ...ui, client };
}

describe("AsyncBoundary", () => {
  it("renders a loading fallback while a query is pending", async () => {
    const { getByTestId, client } = await renderWithQuery(
      () => new Promise(() => {}),
    );

    expect(getByTestId("loading")).toBeTruthy();
    client.clear();
  });

  it("renders an error and retries the failed query", async () => {
    const queryFn = jest.fn<Promise<string[]>, []>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(["saved"]);
    const ui = await renderWithQuery(queryFn);

    expect(await ui.findByText("Could not load entries.")).toBeTruthy();
    fireEvent.press(ui.getByTestId("async.retry"));
    await waitFor(() => expect(ui.getByText("saved")).toBeTruthy());
    ui.client.clear();
  }, 15_000);

  it("renders an empty state for empty query data", async () => {
    const ui = await renderWithQuery(async () => []);

    expect(await ui.findByText("No entries")).toBeTruthy();
    expect(ui.getByText("No entries saved.")).toBeTruthy();
    ui.client.clear();
  });

  it("renders query data when it is not empty", async () => {
    const ui = await renderWithQuery(async () => ["Protein", "Carbs"]);

    expect(await ui.findByText("Protein, Carbs")).toBeTruthy();
    ui.client.clear();
  });
});
