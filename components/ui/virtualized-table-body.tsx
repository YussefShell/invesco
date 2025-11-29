"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, ReactNode } from "react";

interface VirtualizedTableBodyProps<T> {
  data: T[];
  renderRow: (item: T, index: number) => ReactNode;
  estimateSize?: (index: number) => number;
  overscan?: number;
  className?: string;
  maxHeight?: string;
}

export function VirtualizedTableBody<T>({
  data,
  renderRow,
  estimateSize = () => 60,
  overscan = 5,
  className = "",
  maxHeight = "600px",
}: VirtualizedTableBodyProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
  });

  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={100} className="text-center py-8 text-muted-foreground">
            <div className="text-sm">No data to display</div>
          </td>
        </tr>
      </tbody>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <>
      <div
        ref={parentRef}
        className={`overflow-auto ${className}`}
        style={{ maxHeight, position: "relative" }}
      >
        <table className="w-full border-collapse" style={{ display: "block" }}>
          <tbody
            style={{
              display: "block",
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {items.map((virtualRow) => (
              <tr
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderRow(data[virtualRow.index], virtualRow.index)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

