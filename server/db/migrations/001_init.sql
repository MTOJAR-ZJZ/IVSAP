-- Initial schema for Stream Analyzer

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===== Users & Auth =====
CREATE TABLE IF NOT EXISTS users (
  id        VARCHAR(10) PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  account   VARCHAR(100) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL DEFAULT '',
  role      VARCHAR(50) NOT NULL DEFAULT '值班工程师',
  dept      VARCHAR(200) NOT NULL DEFAULT '',
  phone     VARCHAR(30) NOT NULL DEFAULT '',
  email     VARCHAR(200) NOT NULL DEFAULT '',
  status    VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id      VARCHAR(10) PRIMARY KEY,
  name    VARCHAR(100) NOT NULL UNIQUE,
  preset  BOOLEAN DEFAULT false,
  perms   TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS depts (
  id        VARCHAR(20) PRIMARY KEY,
  name      VARCHAR(200) NOT NULL,
  parent_id VARCHAR(20) REFERENCES depts(id) ON DELETE CASCADE
);

-- ===== Streams =====
CREATE TABLE IF NOT EXISTS streams (
  id         VARCHAR(10) PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  addr       VARCHAR(500) NOT NULL,
  protocol   VARCHAR(20) NOT NULL DEFAULT 'RTSP',
  res        VARCHAR(10) NOT NULL DEFAULT '1080P',
  fps        INT NOT NULL DEFAULT 25,
  codec      VARCHAR(20) NOT NULL DEFAULT 'H.264',
  status     VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online','offline','error')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status);

-- ===== Detections =====
CREATE TABLE IF NOT EXISTS detections (
  id          VARCHAR(10) PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  stream_id   VARCHAR(10) REFERENCES streams(id) ON DELETE CASCADE,
  algo        VARCHAR(100) NOT NULL,
  roi         TEXT NOT NULL DEFAULT '',
  sensitivity NUMERIC(4,2) NOT NULL DEFAULT 0.65 CHECK (sensitivity >= 0.1 AND sensitivity <= 0.9),
  status      VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running','stopped')),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detections_stream ON detections(stream_id);

-- ===== Algorithms =====
CREATE TABLE IF NOT EXISTS algo_types (
  id      SERIAL PRIMARY KEY,
  name    VARCHAR(100) NOT NULL UNIQUE,
  prompt  TEXT NOT NULL DEFAULT ''
);

-- ===== Alerts =====
CREATE TABLE IF NOT EXISTS alerts (
  id          VARCHAR(10) PRIMARY KEY,
  stream_id   VARCHAR(10) REFERENCES streams(id) ON DELETE SET NULL,
  type        VARCHAR(100) NOT NULL,
  confidence  INT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','ignored','false')),
  note        TEXT NOT NULL DEFAULT '',
  img_url     VARCHAR(500) NOT NULL DEFAULT '',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- ===== Tickets =====
CREATE TABLE IF NOT EXISTS tickets (
  id          VARCHAR(30) PRIMARY KEY,
  title       VARCHAR(500) NOT NULL,
  priority    VARCHAR(10) NOT NULL DEFAULT 'mid' CHECK (priority IN ('high','mid','low')),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending_assign' CHECK (status IN ('pending_assign','processing','review','closed')),
  assignee    VARCHAR(100) NOT NULL DEFAULT '-',
  sla         VARCHAR(50) NOT NULL DEFAULT '-',
  desc_text   TEXT NOT NULL DEFAULT '',
  photos      TEXT[] DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ===== Ticket-Alert Join =====
CREATE TABLE IF NOT EXISTS ticket_alerts (
  ticket_id VARCHAR(30) REFERENCES tickets(id) ON DELETE CASCADE,
  alert_id  VARCHAR(10) REFERENCES alerts(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, alert_id)
);

-- ===== Schedules =====
CREATE TABLE IF NOT EXISTS schedules (
  id      SERIAL PRIMARY KEY,
  year    INT NOT NULL,
  month   INT NOT NULL,
  date    INT NOT NULL,
  user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
  shift   VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(year, month, date);

-- ===== Operation Logs =====
CREATE TABLE IF NOT EXISTS operation_logs (
  id        SERIAL PRIMARY KEY,
  date      DATE NOT NULL DEFAULT CURRENT_DATE,
  shift     VARCHAR(50) NOT NULL DEFAULT '',
  operator  VARCHAR(100) NOT NULL DEFAULT '',
  action    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===== API Models =====
CREATE TABLE IF NOT EXISTS api_models (
  id         VARCHAR(10) PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  provider   VARCHAR(100) NOT NULL DEFAULT '',
  api_url    VARCHAR(500) NOT NULL DEFAULT '',
  api_key    VARCHAR(500) NOT NULL DEFAULT '',
  is_default BOOLEAN DEFAULT false
);

-- ===== System Config =====
CREATE TABLE IF NOT EXISTS system_config (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

-- ===== Alert-Ticket Rules =====
CREATE TABLE IF NOT EXISTS ticket_rules (
  id              SERIAL PRIMARY KEY,
  algo_type       VARCHAR(100) NOT NULL DEFAULT '全部',
  confidence      INT NOT NULL DEFAULT 80,
  hit_count       INT NOT NULL DEFAULT 3,
  assign_strategy VARCHAR(50) NOT NULL DEFAULT '按人员忙闲度'
);
