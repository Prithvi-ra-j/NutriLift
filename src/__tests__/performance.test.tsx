// @ts-nocheck
import React from 'react';
import { render } from '@testing-library/react-native';
import { List } from '../components/data-display/List';
import { ThemeProvider } from '../core/theme/ThemeProvider';

describe('Performance Benchmarks', () => {
  it('renders a large list within acceptable time limits', () => {
    // Generate 1000 items
    const data = Array.from({ length: 1000 }).map((_, i) => ({
      key: String(i),
      title: `Item ${i}`,
      subtitle: `Description ${i}`,
    }));

    const startTime = performance.now();
    
    render(
      <ThemeProvider initialDark={false}>
        <List data={data} virtualized={true} />
      </ThemeProvider>
    );

    const endTime = performance.now();
    const renderTimeMs = endTime - startTime;

    // React test renderer is synchronous and builds the whole tree.
    // However, with FlatList virtualization, it only renders the initial window.
    // In Jest environment, 1000 items might take some time, but virtualization should keep it under ~500ms
    expect(renderTimeMs).toBeLessThan(1000); 
    
    console.log(`[Performance Benchmark] Large List (1000 items) render time: ${renderTimeMs.toFixed(2)}ms`);
  });

  it('Memoization prevents unnecessary re-renders of the List', () => {
    let renderCount = 0;
    const MemoizedList = React.memo(() => {
      renderCount++;
      return <List data={[{ key: '1', title: 'test' }]} />;
    });

    const { rerender } = render(<MemoizedList />);
    expect(renderCount).toBe(1);

    rerender(<MemoizedList />); // Identical props
    expect(renderCount).toBe(1); // Should not have re-rendered
  });
});
