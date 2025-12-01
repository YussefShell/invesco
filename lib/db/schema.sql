-- Database Schema for Invesco Regulatory Risk Management System
-- Compatible with PostgreSQL (Vercel Postgres, Supabase, etc.)

-- FIX Messages table for audit trail
CREATE TABLE IF NOT EXISTS fix_messages (
    id SERIAL PRIMARY KEY,
    raw_message TEXT NOT NULL,
    msg_type VARCHAR(10),
    symbol VARCHAR(20),
    quantity DECIMAL(18, 2),
    price DECIMAL(18, 6),
    side VARCHAR(10),
    checksum_valid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fix_symbol (symbol),
    INDEX idx_fix_created_at (created_at),
    INDEX idx_fix_msg_type (msg_type)
);

-- Audit Log Entries
CREATE TABLE IF NOT EXISTS audit_log_entries (
    id SERIAL PRIMARY KEY,
    entry_text TEXT NOT NULL,
    system_id VARCHAR(100),
    level VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_system_id (system_id),
    INDEX idx_audit_level (level),
    INDEX idx_audit_created_at (created_at)
);

-- Notification History
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_id VARCHAR(100) NOT NULL,
    recipient_name VARCHAR(255),
    channel VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    severity VARCHAR(50),
    status VARCHAR(50) DEFAULT 'sent',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_recipient (recipient_id),
    INDEX idx_notifications_channel (channel),
    INDEX idx_notifications_sent_at (sent_at),
    INDEX idx_notifications_status (status)
);

-- Breach Events
CREATE TABLE IF NOT EXISTS breach_events (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    jurisdiction VARCHAR(50) NOT NULL,
    ownership_percent DECIMAL(10, 4) NOT NULL,
    threshold DECIMAL(10, 4) NOT NULL,
    status VARCHAR(50) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    INDEX idx_breach_ticker (ticker),
    INDEX idx_breach_jurisdiction (jurisdiction),
    INDEX idx_breach_status (status),
    INDEX idx_breach_detected_at (detected_at)
);

-- Holding Snapshots (historical data)
CREATE TABLE IF NOT EXISTS holding_snapshots (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    jurisdiction VARCHAR(50) NOT NULL,
    shares_owned DECIMAL(18, 2) NOT NULL,
    total_shares_outstanding DECIMAL(18, 2) NOT NULL,
    ownership_percent DECIMAL(10, 4) NOT NULL,
    buying_velocity DECIMAL(18, 2) DEFAULT 0,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_snapshots_ticker (ticker),
    INDEX idx_snapshots_jurisdiction (jurisdiction),
    INDEX idx_snapshots_time (snapshot_time)
);

