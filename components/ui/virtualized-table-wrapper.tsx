"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, ReactNode } from "react";
import React from "react";

interface VirtualizedTableWrapperProps<T> {
  data: T[];
  renderRow: (item: T, index: number) => ReactNode;
  renderHeader: () => ReactNode;
  estimateSize?: (index: number) => number;
  overscan?: number;
  maxHeight?: string;
}

export function VirtualizedTableWrapper<T>({
  data,
  renderRow,
  renderHeader,
  estimateSize = () => 60,
  overscan = 5,
  maxHeight = "600px",
}: VirtualizedTableWrapperProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
  });

  if (data.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {renderHeader()}
        </table>
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-sm">No data to display</div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        {renderHeader()}
      </table>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          <table className="w-full border-collapse" style={{ position: "absolute", width: "100%" }}>
            <tbody>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const rowContent = renderRow(data[virtualRow.index], virtualRow.index);
                // Clone the row element and add positioning styles
                if (React.isValidElement(rowContent)) {
                  return React.cloneElement(rowContent as React.ReactElement<any>, {
                    key: virtualRow.key,
                    'data-index': virtualRow.index,
                    ref: (el: HTMLElement | null) => {
                      virtualizer.measureElement(el);
                      // Also call the original ref if it exists
                      if (rowContent.props.ref) {
                        if (typeof rowContent.props.ref === 'function') {
                          rowContent.props.ref(el);
                        } else if (rowContent.props.ref.current !== undefined) {
                          rowContent.props.ref.current = el;
                        }
                      }
                    },
                    style: {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      ...(rowContent.props.style || {}),
                    },
                  });
                }
                return null;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

