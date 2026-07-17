-- 002_optimize: 数据库结构优化
-- 补齐前端所需字段、添加外键关联、增加索引、修正默认值

-- ===== 1. streams — 补齐前端使用的字段 =====
ALTER TABLE streams ADD COLUMN IF NOT EXISTS play_url         VARCHAR(500) NOT NULL DEFAULT '';
ALTER TABLE streams ADD COLUMN IF NOT EXISTS capture_interval INT          NOT NULL DEFAULT 5;
CREATE INDEX IF NOT EXISTS idx_streams_protocol ON streams(protocol);

-- ===== 2. detections — 补齐 data_type =====
ALTER TABLE detections ADD COLUMN IF NOT EXISTS data_type VARCHAR(50) NOT NULL DEFAULT '实时视频流';

-- ===== 3. alerts — 增加类型和组合索引 =====
CREATE INDEX IF NOT EXISTS idx_alerts_type           ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_stream_time    ON alerts(stream_id, created_at DESC);

-- ===== 4. tickets — 增加 assignee_id 外键 =====
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignee_id VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_assignee    ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at  ON tickets(created_at DESC);

-- ===== 5. users — 修正默认角色 =====
ALTER TABLE users ALTER COLUMN role SET DEFAULT '值班人员';

-- ===== 6. ticket_rules — 修正默认分配策略 =====
ALTER TABLE ticket_rules ALTER COLUMN assign_strategy SET DEFAULT '按技能组轮询';

-- ===== 7. streams — 增加 play_url PUT 更新（已有路由 PUT /:id 只更新 name/addr，此处仅做字段补齐） =====
-- 路由层面已在 streams.js 中处理，此处无需 SQL
