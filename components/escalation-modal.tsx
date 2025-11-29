"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface EscalationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticker: string;
  issuer: string;
  onConfirm: (justification: string) => void;
}

export function EscalationModal({
  open,
  onOpenChange,
  ticker,
  issuer,
  onConfirm,
}: EscalationModalProps) {
  const [justification, setJustification] = useState("");

  const handleSubmit = () => {
    if (justification.trim().length === 0) {
      return; // Don't allow empty justification
    }
    onConfirm(justification);
    setJustification("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setJustification("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <DialogTitle>Escalation Required</DialogTitle>
          </div>
          <DialogDescription>
            High-severity alerts require supervisor approval before dismissal.
            This action will be logged in the audit trail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Alert Details</Label>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              <div>
                <span className="font-medium">Ticker:</span> {ticker}
              </div>
              <div>
                <span className="font-medium">Issuer:</span> {issuer}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="justification" className="text-sm font-semibold">
              Justification Note <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="justification"
              placeholder="Provide a detailed justification for dismissing this alert..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This note will be reviewed by a supervisor. The alert status will
              change to &quot;Pending Supervisor Review&quot; until approved.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={justification.trim().length === 0}
            className="bg-amber-500 hover:bg-amber-600"
          >
            Submit for Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

