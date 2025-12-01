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
        id: "breach-critical",
        name: "Critical Regulatory Breach",
        description: "Immediate alert when a position breaches regulatory threshold",
        enabled: true,
        conditions: [
          { type: "breach", operator: "equals", value: "breach" },
        ],
        recipients: ["risk-manager-1", "compliance-officer-1", "trading-desk-1", "all-users"],
        channels: ["email", "sms", "push"],
        severity: "critical",
        cooldownMinutes: 5, // Short cooldown for critical breaches
      },
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

    // Iterate through all enabled rules (including newly created ones)
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Log rule evaluation for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[NotificationService] Evaluating rule: ${rule.name} (${rule.id}) for ${holding.ticker}`);
      }

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
      const conditionsMet = this.evaluateConditions(rule.conditions, holding, breachStatus, timeToBreachHours);
      
      if (process.env.NODE_ENV === 'development' && conditionsMet) {
        console.log(`[NotificationService] ✅ Rule "${rule.name}" conditions met for ${holding.ticker}`);
      }
      
      if (conditionsMet) {
        // Get recipients - if rule has "all-users" as a recipient, include all user-registered recipients
        let recipientsToNotify = rule.recipients;
        if (rule.recipients.includes("all-users")) {
          // Include all user-registered recipients (exclude system defaults)
          const userRecipients = Array.from(this.recipients.values())
            .filter(r => !r.id.startsWith("risk-manager") && 
                        !r.id.startsWith("compliance") && 
                        !r.id.startsWith("trading-desk"))
            .map(r => r.id);
          recipientsToNotify = [...new Set([...rule.recipients.filter(r => r !== "all-users"), ...userRecipients])];
        }

        // Create notifications for each recipient and channel
        for (const recipientId of recipientsToNotify) {
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
            
            // Persist to database (async, don't await to avoid blocking)
            import("@/lib/db/persistence-service").then(({ persistNotification }) => {
              persistNotification(notification, recipient.name).catch((error) => {
                console.error("[NotificationService] Failed to persist notification:", error);
              });
            });
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

  // Send notification - actually sends via email or SMS
  async sendNotification(notification: Notification): Promise<boolean> {
    const recipient = this.recipients.get(notification.recipientId);
    if (!recipient) {
      console.error(`Recipient ${notification.recipientId} not found`);
      return false;
    }

    try {
      if (notification.channel === "email" && recipient.email) {
        await this.sendEmail(recipient.email, notification);
      } else if (notification.channel === "sms" && recipient.phone) {
        await this.sendSMS(recipient.phone, notification);
      } else if (notification.channel === "push" && recipient.pushToken) {
        await this.sendPushNotification(recipient.pushToken, notification);
      } else {
        console.warn(`Cannot send ${notification.channel} notification: missing contact info`);
        return false;
      }

      notification.deliveredAt = new Date().toISOString();
      
      // Persist to database
      try {
        const { persistNotification } = await import("@/lib/db/persistence-service");
        await persistNotification(notification, recipient.name);
      } catch (error) {
        console.error("[NotificationService] Failed to persist notification to database:", error);
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      notification.error = errorMessage;
      console.error(`Failed to send notification: ${errorMessage}`, error);
      return false;
    }
  }

  private async sendEmail(email: string, notification: Notification): Promise<void> {
    // Use Next.js API route to send email
    // In production, integrate with SendGrid, AWS SES, Resend, etc.
    try {
      const baseUrl = this.getApiBaseUrl();
      const url = baseUrl ? `${baseUrl}/api/notifications/send-email` : "/api/notifications/send-email";
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: notification.title,
          body: this.formatEmailBody(notification),
          html: this.formatEmailHTML(notification),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Email service returned ${response.status}`);
      }

      console.log(`Email sent successfully to ${email}`);
    } catch (error) {
      // Fallback: log to console if API route fails (for development)
      console.log(`[EMAIL] To: ${email}`);
      console.log(`[EMAIL] Subject: ${notification.title}`);
      console.log(`[EMAIL] Body: ${notification.message}`);
      // Don't throw in development mode - allow notifications to continue
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }

  private async sendSMS(phone: string, notification: Notification): Promise<void> {
    // Use Next.js API route to send SMS
    // In production, integrate with Twilio, AWS SNS, etc.
    try {
      const baseUrl = this.getApiBaseUrl();
      const url = baseUrl ? `${baseUrl}/api/notifications/send-sms` : "/api/notifications/send-sms";
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          message: `${notification.title}: ${notification.message}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `SMS service returned ${response.status}`);
      }

      console.log(`SMS sent successfully to ${phone}`);
    } catch (error) {
      // Fallback: log to console if API route fails (for development)
      console.log(`[SMS] To: ${phone}`);
      console.log(`[SMS] Message: ${notification.title}: ${notification.message}`);
      // Don't throw in development mode - allow notifications to continue
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }

  private async sendPushNotification(pushToken: string, notification: Notification): Promise<void> {
    // Use Next.js API route to send push notifications
    // Supports FCM (Firebase Cloud Messaging) for Android/web and APNS for iOS
    try {
      const baseUrl = this.getApiBaseUrl();
      const url = baseUrl ? `${baseUrl}/api/notifications/send-push` : "/api/notifications/send-push";
      
      // Determine platform from token or use default
      let platform: "ios" | "android" | "web" | undefined;
      if (pushToken.length === 64 && /^[a-fA-F0-9]+$/.test(pushToken)) {
        platform = "ios";
      } else if (pushToken.length > 100) {
        platform = "android";
      } else {
        platform = "web";
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: pushToken,
          title: notification.title,
          message: notification.message,
          data: {
            notificationId: notification.id,
            ticker: notification.ticker,
            jurisdiction: notification.jurisdiction,
            severity: notification.severity,
            ...notification.metadata,
          },
          platform,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Push service returned ${response.status}`);
      }

      console.log(`Push notification sent successfully to ${pushToken.substring(0, 20)}...`);
    } catch (error) {
      // Fallback: log to console if API route fails (for development)
      console.log(`[PUSH] Token: ${pushToken.substring(0, 20)}...`);
      console.log(`[PUSH] Title: ${notification.title}`);
      console.log(`[PUSH] Message: ${notification.message}`);
      // Don't throw in development mode - allow notifications to continue
      if (process.env.NODE_ENV === "production") {
        throw error;
      }
    }
  }

  private formatEmailBody(notification: Notification): string {
    return `
${notification.title}

${notification.message}

${notification.ticker ? `Ticker: ${notification.ticker}` : ""}
${notification.jurisdiction ? `Jurisdiction: ${notification.jurisdiction}` : ""}
${notification.metadata?.ownershipPercent ? `Ownership: ${notification.metadata.ownershipPercent.toFixed(2)}%` : ""}
${notification.metadata?.threshold ? `Threshold: ${notification.metadata.threshold}%` : ""}
${notification.metadata?.timeToBreachHours ? `Time to Breach: ${notification.metadata.timeToBreachHours.toFixed(1)} hours` : ""}

Sent at: ${new Date(notification.sentAt).toLocaleString()}
    `.trim();
  }

  private formatEmailHTML(notification: Notification): string {
    const severityColor = {
      critical: "#dc2626",
      high: "#ea580c",
      medium: "#ca8a04",
      low: "#2563eb",
    }[notification.severity];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background-color: ${severityColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .details { background-color: white; padding: 15px; border-radius: 5px; margin-top: 10px; }
    .footer { padding: 10px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${notification.title}</h2>
  </div>
  <div class="content">
    <p>${notification.message}</p>
    <div class="details">
      ${notification.ticker ? `<p><strong>Ticker:</strong> ${notification.ticker}</p>` : ""}
      ${notification.jurisdiction ? `<p><strong>Jurisdiction:</strong> ${notification.jurisdiction}</p>` : ""}
      ${notification.metadata?.ownershipPercent ? `<p><strong>Ownership:</strong> ${notification.metadata.ownershipPercent.toFixed(2)}%</p>` : ""}
      ${notification.metadata?.threshold ? `<p><strong>Threshold:</strong> ${notification.metadata.threshold}%</p>` : ""}
      ${notification.metadata?.timeToBreachHours ? `<p><strong>Time to Breach:</strong> ${notification.metadata.timeToBreachHours.toFixed(1)} hours</p>` : ""}
    </div>
  </div>
  <div class="footer">
    Sent at: ${new Date(notification.sentAt).toLocaleString()}
  </div>
</body>
</html>
    `.trim();
  }

  private getApiBaseUrl(): string {
    // In client-side, use window.location.origin
    if (typeof window !== "undefined" && window.location) {
      try {
        return window.location.origin;
      } catch (error) {
        // Fallback if window.location is not accessible
        console.warn("Could not access window.location.origin, using relative URL");
        return "";
      }
    }
    // For server-side, try to get from environment or use default
    // In server-side, we can use relative URLs which Next.js will resolve
    return "";
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

