import type {
  Notification,
  NotificationChannel,
  AlertSeverity,
  AlertStatus,
  NotificationRecipient,
  AlertRule,
} from "@/types/notifications";
import type { Holding } from "@/types";

export class NotificationService {
  private recipients: Map<string, NotificationRecipient> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationHistory: Notification[] = [];
  private notificationCooldowns: Map<string, number> = new Map(); // ruleId -> lastSentTimestamp

  constructor() {
    this.initializeDefaultRecipients();
    this.initializeDefaultRules();
  }

  private initializeDefaultRecipients() {
    const defaultRecipients: NotificationRecipient[] = [
      {
        id: "risk-manager-1",
        name: "Global Head of Risk",
        email: "risk.head@invesco.com",
        phone: "+1-555-0100",
        channels: ["email", "sms", "push"],
      },
      {
        id: "compliance-officer-1",
        name: "Chief Compliance Officer",
        email: "compliance@invesco.com",
        phone: "+1-555-0101",
        channels: ["email", "sms"],
      },
      {
        id: "trading-desk-1",
        name: "Trading Desk",
        email: "trading@invesco.com",
        channels: ["email"],
      },
    ];

    defaultRecipients.forEach((recipient) => {
      this.recipients.set(recipient.id, recipient);
    });
  }

  private initializeDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: "warning-high",
        name: "High Priority Warning",
        description: "Alert when position is within 0.5% of threshold",
        enabled: true,
        conditions: [
          { type: "warning", operator: "equals", value: "warning" },
        ],
        recipients: ["risk-manager-1"],
        channels: ["email", "push"],
        severity: "high",
        cooldownMinutes: 15,
      },
      {
        id: "time-to-breach-24h",
        name: "24-Hour Breach Projection",
        description: "Alert when breach is projected within 24 hours",
        enabled: true,
        conditions: [
          {
            type: "time_to_breach",
            operator: "less_than",
            value: 24,
          },
        ],
        recipients: ["risk-manager-1", "trading-desk-1"],
        channels: ["email"],
        severity: "medium",
        cooldownMinutes: 60,
      },
    ];

    defaultRules.forEach((rule) => {
      this.alertRules.set(rule.id, rule);
    });
  }

  // Check if a holding triggers any alert rules
  checkAlerts(holding: Holding, breachStatus: AlertStatus, timeToBreachHours: number | null): Notification[] {
    const triggeredNotifications: Notification[] = [];

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      const cooldownKey = `${rule.id}-${holding.id}`;
      const lastSent = this.notificationCooldowns.get(cooldownKey);
      if (lastSent && rule.cooldownMinutes) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - lastSent < cooldownMs) {
          continue; // Still in cooldown period
        }
      }

      // Evaluate conditions
      if (this.evaluateConditions(rule.conditions, holding, breachStatus, timeToBreachHours)) {
        // Create notifications for each recipient and channel
        for (const recipientId of rule.recipients) {
          const recipient = this.recipients.get(recipientId);
          if (!recipient) continue;

          for (const channel of rule.channels) {
            if (!recipient.channels.includes(channel)) continue;

            const notification = this.createNotification(
              rule,
              recipient,
              channel,
              holding,
              breachStatus,
              timeToBreachHours
            );

            triggeredNotifications.push(notification);
            this.notificationHistory.push(notification);
            this.notificationCooldowns.set(cooldownKey, Date.now());
          }
        }
      }
    }

    return triggeredNotifications;
  }

  private evaluateConditions(
    conditions: AlertRule["conditions"],
    holding: Holding,
    breachStatus: AlertStatus,
    timeToBreachHours: number | null
  ): boolean {
    return conditions.every((condition) => {
      switch (condition.type) {
        case "breach":
          return breachStatus === condition.value;
        case "warning":
          return breachStatus === condition.value;
        case "time_to_breach":
          if (timeToBreachHours === null) return false;
          if (condition.operator === "less_than") {
            return timeToBreachHours < (condition.value as number);
          }
          return false;
        case "threshold":
          const ownershipPercent =
            (holding.sharesOwned / holding.totalSharesOutstanding) * 100;
          if (condition.operator === "greater_than") {
            return ownershipPercent > (condition.value as number);
          }
          return false;
        case "jurisdiction":
          return holding.jurisdiction === condition.value;
        default:
          return false;
      }
    });
  }

  private createNotification(
    rule: AlertRule,
    recipient: NotificationRecipient,
    channel: NotificationChannel,
    holding: Holding,
    breachStatus: AlertStatus,
    timeToBreachHours: number | null
  ): Notification {
    const ownershipPercent =
      (holding.sharesOwned / holding.totalSharesOutstanding) * 100;

    let title: string;
    let message: string;
    let severity: AlertSeverity = "medium";

    if (breachStatus === "breach") {
      title = `🚨 Regulatory Breach: ${holding.ticker}`;
      message = `${holding.issuer} (${holding.ticker}) has breached the ${holding.regulatoryRule.name} threshold at ${ownershipPercent.toFixed(2)}% (threshold: ${holding.regulatoryRule.threshold}%). Immediate action required.`;
      severity = "critical";
    } else if (breachStatus === "warning") {
      title = `⚠️ Warning: ${holding.ticker} Approaching Threshold`;
      message = `${holding.issuer} (${holding.ticker}) is at ${ownershipPercent.toFixed(2)}% (threshold: ${holding.regulatoryRule.threshold}%).`;
      if (timeToBreachHours !== null && timeToBreachHours < 24) {
        message += ` Breach projected in ${timeToBreachHours.toFixed(1)} hours.`;
      }
      severity = "high";
    } else {
      title = `ℹ️ Status Update: ${holding.ticker}`;
      message = `${holding.issuer} (${holding.ticker}) status update.`;
      severity = "low";
    }

    return {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      alertRuleId: rule.id,
      recipientId: recipient.id,
      channel,
      severity,
      status: breachStatus,
      title,
      message,
      holdingId: holding.id,
      ticker: holding.ticker,
      jurisdiction: holding.jurisdiction,
      sentAt: new Date().toISOString(),
      metadata: {
        ownershipPercent,
        threshold: holding.regulatoryRule.threshold,
        timeToBreachHours,
      },
    };
  }

  // Send notification (mock implementation - in production would call actual services)
  async sendNotification(notification: Notification): Promise<boolean> {
    const recipient = this.recipients.get(notification.recipientId);
    if (!recipient) return false;

    try {
      // Simulate sending notification
      // In production, this would:
      // - For email: Call email service (SendGrid, AWS SES, etc.)
      // - For SMS: Call SMS service (Twilio, AWS SNS, etc.)
      // - For push: Send push notification via FCM/APNS

      notification.deliveredAt = new Date().toISOString();
      return true;
    } catch (error) {
      notification.error = error instanceof Error ? error.message : "Unknown error";
      return false;
    }
  }

  // Get notification history
  getNotificationHistory(
    page: number = 1,
    pageSize: number = 50,
    filters?: {
      recipientId?: string;
      channel?: NotificationChannel;
      severity?: AlertSeverity;
      status?: AlertStatus;
      startDate?: string;
      endDate?: string;
    }
  ) {
    let filtered = [...this.notificationHistory];

    if (filters) {
      if (filters.recipientId) {
        filtered = filtered.filter((n) => n.recipientId === filters.recipientId);
      }
      if (filters.channel) {
        filtered = filtered.filter((n) => n.channel === filters.channel);
      }
      if (filters.severity) {
        filtered = filtered.filter((n) => n.severity === filters.severity);
      }
      if (filters.status) {
        filtered = filtered.filter((n) => n.status === filters.status);
      }
      if (filters.startDate) {
        filtered = filtered.filter((n) => n.sentAt >= filters.startDate!);
      }
      if (filters.endDate) {
        filtered = filtered.filter((n) => n.sentAt <= filters.endDate!);
      }
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      notifications: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  // Alert rule management
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  getAlertRule(id: string): AlertRule | undefined {
    return this.alertRules.get(id);
  }

  createAlertRule(rule: Omit<AlertRule, "id">): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    this.alertRules.set(newRule.id, newRule);
    return newRule;
  }

  updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.alertRules.get(id);
    if (!rule) return null;

    const updated = { ...rule, ...updates };
    this.alertRules.set(id, updated);
    return updated;
  }

  deleteAlertRule(id: string): boolean {
    return this.alertRules.delete(id);
  }

  // Recipient management
  getRecipients(): NotificationRecipient[] {
    return Array.from(this.recipients.values());
  }

  getRecipient(id: string): NotificationRecipient | undefined {
    return this.recipients.get(id);
  }

  createRecipient(recipient: Omit<NotificationRecipient, "id">): NotificationRecipient {
    const newRecipient: NotificationRecipient = {
      ...recipient,
      id: `recipient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    this.recipients.set(newRecipient.id, newRecipient);
    return newRecipient;
  }

  updateRecipient(id: string, updates: Partial<NotificationRecipient>): NotificationRecipient | null {
    const recipient = this.recipients.get(id);
    if (!recipient) return null;

    const updated = { ...recipient, ...updates };
    this.recipients.set(id, updated);
    return updated;
  }

  deleteRecipient(id: string): boolean {
    return this.recipients.delete(id);
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

