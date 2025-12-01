"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type {
  Notification,
  AlertRule,
  NotificationChannel,
  AlertSeverity,
  AlertStatus,
  NotificationRecipient,
} from "@/types/notifications";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  History,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export default function NotificationManager() {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRecipientDialogOpen, setIsRecipientDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<NotificationRecipient | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAlertRules();
    loadNotificationHistory();
    loadRecipients();
  }, []);

  const loadRecipients = async () => {
    try {
      const response = await fetch("/api/notifications/recipients");
      if (!response.ok) {
        throw new Error(`Failed to load recipients: ${response.statusText}`);
      }
      const data = await response.json();
      setRecipients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load recipients:", error);
      setRecipients([]);
    }
  };

  const loadAlertRules = async () => {
    try {
      const response = await fetch("/api/notifications/alert-rules");
      if (!response.ok) {
        throw new Error(`Failed to load alert rules: ${response.statusText}`);
      }
      const data = await response.json();
      setAlertRules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load alert rules:", error);
      setAlertRules([]);
    }
  };

  const loadNotificationHistory = async () => {
    try {
      const response = await fetch("/api/notifications?pageSize=20");
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Failed to load notification history:", error);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/notifications/alert-rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) {
        throw new Error(`Failed to toggle rule: ${response.statusText}`);
      }
      
      // Trigger immediate check when rule is enabled
      if (enabled) {
        window.dispatchEvent(new CustomEvent('alert-rule-updated', { 
          detail: { ruleId, action: 'enabled' }
        }));
      }
      
      await loadAlertRules();
    } catch (error) {
      console.error("Failed to toggle rule:", error);
      alert("Failed to update alert rule. Please try again.");
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this alert rule?")) return;

    try {
      const response = await fetch(`/api/notifications/alert-rules/${ruleId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to delete rule: ${response.statusText}`);
      }
      
      // Trigger immediate check after rule deletion (to re-evaluate remaining rules)
      window.dispatchEvent(new CustomEvent('alert-rule-updated', { 
        detail: { ruleId, action: 'deleted' }
      }));
      
      await loadAlertRules();
    } catch (error) {
      console.error("Failed to delete rule:", error);
      alert("Failed to delete alert rule. Please try again.");
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
    }
  };

  const getStatusIcon = (status: AlertStatus) => {
    switch (status) {
      case "breach":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "safe":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case "email":
        return <Mail className="w-4 h-4" />;
      case "sms":
        return <MessageSquare className="w-4 h-4" />;
      case "push":
        return <Smartphone className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alert Rules & Notifications
              </CardTitle>
              <CardDescription>
                Configure alert rules and manage notification settings
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryOpen(true)}
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRecipient(null);
                  setIsRecipientDialogOpen(true);
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Register Contact
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedRule(null);
                  setIsRuleDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Rule
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertRules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No alert rules configured. Create one to get started.
              </div>
            ) : (
              alertRules.map((rule) => (
                <div
                  key={rule.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{rule.name}</h3>
                        <Badge
                          variant={rule.enabled ? "default" : "secondary"}
                        >
                          {rule.enabled ? "Active" : "Disabled"}
                        </Badge>
                        <Badge className={getSeverityColor(rule.severity)}>
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rule.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          Recipients: {rule.recipients.length}
                        </span>
                        <span className="flex items-center gap-1">
                          Channels:
                          {rule.channels.length > 0 ? (
                            rule.channels.map((ch) => (
                              <span key={ch} className="flex items-center gap-1" title={ch}>
                                {getChannelIcon(ch)}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </span>
                        {rule.cooldownMinutes && (
                          <span>Cooldown: {rule.cooldownMinutes} min</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRule(rule.id, !rule.enabled)}
                      >
                        {rule.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRule(rule);
                          setIsRuleDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification History</DialogTitle>
            <DialogDescription>
              View all sent notifications and their delivery status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notifications sent yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(notif.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{notif.title}</h4>
                          <Badge className={getSeverityColor(notif.severity)}>
                            {notif.severity}
                          </Badge>
                          <Badge variant="outline">
                            {getChannelIcon(notif.channel)}
                            {notif.channel}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notif.message}
                        </p>
                        {notif.ticker && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ticker: {notif.ticker} | Jurisdiction: {notif.jurisdiction}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>{new Date(notif.sentAt).toLocaleString()}</div>
                      {notif.deliveredAt && (
                        <div className="text-green-500">Delivered</div>
                      )}
                      {notif.error && (
                        <div className="text-red-500">Error: {notif.error}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Rule Dialog - Simplified for now */}
      {isRuleDialogOpen && (
        <AlertRuleDialog
          rule={selectedRule}
          open={isRuleDialogOpen}
          onOpenChange={setIsRuleDialogOpen}
          onSave={loadAlertRules}
        />
      )}

      {/* Recipient Registration Dialog */}
      {isRecipientDialogOpen && (
        <RecipientDialog
          recipient={selectedRecipient}
          open={isRecipientDialogOpen}
          onOpenChange={setIsRecipientDialogOpen}
          onSave={loadRecipients}
          existingRecipients={recipients}
        />
      )}

      {/* User Recipients Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Your Notification Contacts
              </CardTitle>
              <CardDescription>
                Manage your email and phone number for receiving alerts
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedRecipient(null);
                setIsRecipientDialogOpen(true);
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Register Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recipients.filter(r => !r.id.startsWith("risk-manager") && !r.id.startsWith("compliance") && !r.id.startsWith("trading-desk")).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">No personal contacts registered.</p>
                <p className="text-sm">Click &quot;Register Contact&quot; to add your email or phone number to receive notifications.</p>
              </div>
            ) : (
              recipients
                .filter(r => !r.id.startsWith("risk-manager") && !r.id.startsWith("compliance") && !r.id.startsWith("trading-desk"))
                .map((recipient) => (
                  <div
                    key={recipient.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{recipient.name}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {recipient.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {recipient.email}
                            </span>
                          )}
                          {recipient.phone && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {recipient.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Channels:</span>
                          {recipient.channels.map((ch) => (
                            <Badge key={ch} variant="outline" className="text-xs">
                              {getChannelIcon(ch)}
                              {ch}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRecipient(recipient);
                            setIsRecipientDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!confirm("Are you sure you want to remove this contact?")) return;
                            try {
                              const response = await fetch(`/api/notifications/recipients/${recipient.id}`, {
                                method: "DELETE",
                              });
                              if (!response.ok) throw new Error("Failed to delete");
                              await loadRecipients();
                            } catch (error) {
                              console.error("Failed to delete recipient:", error);
                              alert("Failed to delete contact. Please try again.");
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertRuleDialog({
  rule,
  open,
  onOpenChange,
  onSave,
}: {
  rule: AlertRule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(rule?.name || "");
  const [description, setDescription] = useState(rule?.description || "");
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [severity, setSeverity] = useState<AlertSeverity>(
    rule?.severity || "medium"
  );
  const [channels, setChannels] = useState<NotificationChannel[]>(
    rule?.channels || ["email"]
  );
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(
    rule?.cooldownMinutes || 15
  );
  const [loading, setLoading] = useState(false);

  // Sync state when rule prop changes (e.g., switching from create to edit)
  useEffect(() => {
    if (rule) {
      setName(rule.name || "");
      setDescription(rule.description || "");
      setEnabled(rule.enabled ?? true);
      setSeverity(rule.severity || "medium");
      setChannels(rule.channels || ["email"]);
      setCooldownMinutes(rule.cooldownMinutes || 15);
    } else {
      // Reset to defaults for new rule
      setName("");
      setDescription("");
      setEnabled(true);
      setSeverity("medium");
      setChannels(["email"]);
      setCooldownMinutes(15);
    }
  }, [rule, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Rule name is required");
      return;
    }

    if (channels.length === 0) {
      alert("At least one notification channel is required");
      return;
    }

    if (loading) return; // Prevent double-clicks

    setLoading(true);
    try {
      const ruleData = {
        name: name.trim(),
        description: description.trim(),
        enabled,
        severity,
        channels,
        conditions: rule?.conditions || [
          { type: "breach" as const, operator: "equals" as const, value: "breach" },
        ],
        recipients: rule?.recipients || [],
        cooldownMinutes: cooldownMinutes || 15,
      };

      const url = rule 
        ? `/api/notifications/alert-rules/${rule.id}`
        : "/api/notifications/alert-rules";
      const method = rule ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save rule: ${response.statusText}`);
      }

      const savedRule = await response.json();
      console.log("Rule saved successfully:", savedRule);

      // Trigger immediate check of all holdings to evaluate new rule
      // This ensures the new rule is executed immediately if conditions are met
      if (savedRule.enabled) {
        // Dispatch a custom event to trigger immediate notification check
        window.dispatchEvent(new CustomEvent('alert-rule-updated', { 
          detail: { ruleId: savedRule.id, action: rule ? 'updated' : 'created' }
        }));
      }

      await onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save rule:", error);
      alert(error instanceof Error ? error.message : "Failed to save alert rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {rule ? "Edit Alert Rule" : "Create Alert Rule"}
          </DialogTitle>
          <DialogDescription>
            Configure when and how notifications should be sent
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Rule Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Critical Breach Alert"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when this rule triggers"
            />
          </div>
          <div>
            <Label>Severity</Label>
            <Select
              value={severity}
              onValueChange={(value) => setSeverity(value as AlertSeverity)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notification Channels</Label>
            <div className="flex gap-2 mt-2">
              {(["email", "sms", "push"] as NotificationChannel[]).map(
                (channel) => (
                  <Button
                    key={channel}
                    variant={channels.includes(channel) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (channels.includes(channel)) {
                        setChannels(channels.filter((c) => c !== channel));
                      } else {
                        setChannels([...channels, channel]);
                      }
                    }}
                  >
                    {channel === "email" && <Mail className="w-4 h-4 mr-1" />}
                    {channel === "sms" && (
                      <MessageSquare className="w-4 h-4 mr-1" />
                    )}
                    {channel === "push" && (
                      <Smartphone className="w-4 h-4 mr-1" />
                    )}
                    {channel}
                  </Button>
                )
              )}
            </div>
          </div>
          <div>
            <Label>Cooldown (minutes)</Label>
            <Input
              type="number"
              min="1"
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(parseInt(e.target.value) || 15)}
              placeholder="15"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Prevent duplicate alerts within this time period
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <Label htmlFor="enabled">Enable this rule</Label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Rule"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecipientDialog({
  recipient,
  open,
  onOpenChange,
  onSave,
  existingRecipients,
}: {
  recipient: NotificationRecipient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  existingRecipients: NotificationRecipient[];
}) {
  const [name, setName] = useState(recipient?.name || "");
  const [email, setEmail] = useState(recipient?.email || "");
  const [phone, setPhone] = useState(recipient?.phone || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recipient) {
      setName(recipient.name || "");
      setEmail(recipient.email || "");
      setPhone(recipient.phone || "");
    } else {
      setName("");
      setEmail("");
      setPhone("");
    }
  }, [recipient, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    if (!email.trim() && !phone.trim()) {
      alert("At least one contact method (email or phone) is required");
      return;
    }

    // Validate email format if provided
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        alert("Please enter a valid email address");
        return;
      }
    }

    // Validate phone format if provided (basic E.164 format)
    if (phone.trim()) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        alert("Please enter a valid phone number in E.164 format (e.g., +1234567890)");
        return;
      }
    }

    if (loading) return;

    setLoading(true);
    try {
      const recipientData = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      };

      const url = recipient
        ? `/api/notifications/recipients/${recipient.id}`
        : "/api/notifications/recipients";
      const method = recipient ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipientData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save contact: ${response.statusText}`);
      }

      const savedRecipient = await response.json();
      console.log("Recipient saved successfully:", savedRecipient);

      await onSave();
      onOpenChange(false);
      
      // Show success message
      alert(`Contact ${recipient ? "updated" : "registered"} successfully! You will now receive notifications at ${email.trim() ? email.trim() : phone.trim()}.`);
    } catch (error) {
      console.error("Failed to save recipient:", error);
      alert(error instanceof Error ? error.message : "Failed to save contact. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {recipient ? "Edit Contact" : "Register for Notifications"}
          </DialogTitle>
          <DialogDescription>
            {recipient
              ? "Update your contact information for receiving alerts"
              : "Add your email or phone number to receive regulatory breach alerts"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="recipient-name">Name *</Label>
            <Input
              id="recipient-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="recipient-email">Email Address</Label>
            <Input
              id="recipient-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              You&apos;ll receive email notifications for regulatory breaches
            </p>
          </div>
          <div>
            <Label htmlFor="recipient-phone">Phone Number</Label>
            <Input
              id="recipient-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use E.164 format (e.g., +1234567890). You&apos;ll receive SMS notifications for critical alerts
            </p>
          </div>
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> At least one contact method (email or phone) is required. 
              You can add both to receive notifications via multiple channels.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                recipient ? "Update Contact" : "Register"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

