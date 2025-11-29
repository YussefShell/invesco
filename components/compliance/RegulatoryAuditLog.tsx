"use client";

import { useAuditLog } from "@/components/contexts/AuditLogContext";

export default function RegulatoryAuditLog() {
  const { entries } = useAuditLog();

  return (
    <div className="w-full border-t border-border bg-black/80 text-green-400 font-mono text-xs mt-4">
      <div className="container mx-auto px-6 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Regulatory Audit Log (Read-Only, Tamper-Proof View)</span>
          <span className="uppercase tracking-wide text-slate-500">
            System Channel: risk-core
          </span>
        </div>
        <div className="max-h-40 overflow-y-auto rounded border border-slate-800 bg-black/70 px-3 py-2">
          {entries.map((line, idx) => (
            <div key={idx} className="whitespace-pre text-[11px] leading-relaxed">
              {line}
            </div>
          ))}
          {entries.length === 0 && (
            <div className="text-slate-500 text-[11px]">
              Awaiting events from risk engine...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



