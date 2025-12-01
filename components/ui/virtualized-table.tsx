"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, ReactNode } from "react";

interface VirtualizedTableProps<T> {
  data: T[];
  renderRow: (item: T, index: number) => ReactNode;
  estimateSize?: (index: number) => number;
  overscan?: number;
  className?: string;
  containerClassName?: string;
}

export function VirtualizedTable<T>({
  data,
  renderRow,
  estimateSize = () => 60,
  overscan = 5,
  className = "",
  containerClassName = "",
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
  });

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center py-8 text-muted-foreground ${containerClassName}`}>
        <div className="text-sm">No data to display</div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${containerClassName}`}
      style={{ height: "600px" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className={className}
          >
            {renderRow(data[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}


