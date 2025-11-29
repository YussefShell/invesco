export type NotificationChannel = "email" | "sms" | "push";

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export type AlertStatus = "breach" | "warning" | "safe";

export interface NotificationRecipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  channels: NotificationChannel[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  recipients: string[]; // Recipient IDs
  channels: NotificationChannel[];
  severity: AlertSeverity;
  escalation?: EscalationRule;
  cooldownMinutes?: number; // Prevent duplicate alerts within this time
}

export interface AlertCondition {
  type: "breach" | "warning" | "threshold" | "time_to_breach" | "jurisdiction";
  operator: "equals" | "greater_than" | "less_than" | "in";
  value: string | number;
  field?: string; // For threshold conditions
}

export interface EscalationRule {
  enabled: boolean;
  delayMinutes: number; // Escalate after this many minutes if not acknowledged
  escalateTo: string[]; // Additional recipient IDs
  maxEscalations?: number;
}

export interface Notification {
  id: string;
  alertRuleId?: string;
  recipientId: string;
  channel: NotificationChannel;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  holdingId?: string;
  ticker?: string;
  jurisdiction?: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface NotificationHistory {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

