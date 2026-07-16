import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'stream_analyzer',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  console.log('Seeding database...');

  // ---- Departments ----
  await pool.query(`DELETE FROM depts`);
  await pool.query(`INSERT INTO depts (id, name, parent_id) VALUES ('DEPT1','信息技术部',NULL)`);
  await pool.query(`INSERT INTO depts (id, name, parent_id) VALUES ('DEPT2','运维部',NULL)`);
  await pool.query(`INSERT INTO depts (id, name, parent_id) VALUES ('DEPT2-1','一值班组','DEPT2')`);
  await pool.query(`INSERT INTO depts (id, name, parent_id) VALUES ('DEPT2-2','二值班组','DEPT2')`);
  console.log('  depts OK');

  // ---- Roles ----
  await pool.query(`DELETE FROM roles`);
  await pool.query(`INSERT INTO roles (id, name, preset, perms) VALUES
    ('R001','系统管理员',true, ARRAY['dashboard','streams','detection','algorithms','alerts','tickets','users','system']),
    ('R002','运维主管',true, ARRAY['dashboard','streams','detection','algorithms','alerts','tickets','users']),
    ('R003','值班工程师',true, ARRAY['dashboard','alerts','tickets']),
    ('R004','业务分析师',true, ARRAY['dashboard','alerts'])`);
  console.log('  roles OK');

  // ---- Users ----
  await pool.query(`DELETE FROM users`);
  const hp = await bcrypt.hash('123456', 10);
  await pool.query(`INSERT INTO users (id, name, account, password, role, dept, phone, email, status) VALUES
    ('U001','管理员','admin',    $1,'系统管理员','信息技术部','13800001111','admin@sa.com','active'),
    ('U002','张工',  'zhang',   $1,'值班工程师','运维部-一值班组','13800001122','zhang@sa.com','active'),
    ('U003','李工',  'li',      $1,'值班工程师','运维部-一值班组','13800001133','li@sa.com','active'),
    ('U004','王工',  'wang',    $1,'值班工程师','运维部-二值班组','13800001144','wang@sa.com','active'),
    ('U005','赵主管','zhao',    $1,'运维主管',   '运维部','13800001155','zhao@sa.com','active'),
    ('U006','刘工',  'liu',     $1,'值班工程师','运维部-二值班组','13800001166','liu@sa.com','disabled')`, [hp]);
  console.log('  users OK');

  // ---- Streams ----
  await pool.query(`DELETE FROM streams`);
  await pool.query(`INSERT INTO streams (id, name, addr, protocol, res, fps, codec, status) VALUES
    ('S001','园区北门主入口','rtsp://192.168.1.10:554/stream1','RTSP','1080P',25,'H.264','online'),
    ('S002','仓库A区东侧','rtsp://192.168.1.11:554/stream2','RTSP','1080P',25,'H.265','online'),
    ('S003','厂房西门通道','rtmp://192.168.1.12/live/stream3','RTMP','720P',30,'H.264','offline'),
    ('S004','停车场监控','rtsp://192.168.1.13:554/stream4','RTSP','1080P',25,'H.264','error'),
    ('S005','办公楼大厅','http-flv://192.168.1.14:8080/live/stream5','HTTP-FLV','720P',15,'H.264','online'),
    ('S006','研发中心走廊','rtsp://192.168.1.15:554/stream6','RTSP','1080P',25,'H.265','online')`);
  console.log('  streams OK');

  // ---- Algorithm Types ----
  await pool.query(`DELETE FROM algo_types`);
  await pool.query(`INSERT INTO algo_types (name, prompt) VALUES
    ('人员入侵','检测画面中是否有人员闯入禁区，描述闯入者的位置、数量和行为。'),
    ('烟火检测','检测画面中是否有火焰或烟雾，描述火势大小、烟雾颜色和具体位置。'),
    ('物品遗留','检测画面中是否有被遗留的物品，描述物品类型、大小和位置。'),
    ('区域越界','检测画面中是否有人员或物体越过设定的边界线，描述越界方向和目标。')`);
  console.log('  algo_types OK');

  // ---- Detections ----
  await pool.query(`DELETE FROM detections`);
  await pool.query(`INSERT INTO detections (id, name, stream_id, algo, roi, sensitivity, status) VALUES
    ('D001','周界入侵检测-北门','S001','人员入侵','多边形(8点)',0.75,'running'),
    ('D002','仓库烟火监测','S002','烟火检测','矩形',0.65,'running'),
    ('D003','厂房区域越界','S003','区域越界','矩形+排除区域',0.8,'stopped'),
    ('D004','停车场物品遗留','S004','物品遗留','多边形(6点)',0.7,'running')`);
  console.log('  detections OK');

  // ---- Tickets ----
  await pool.query(`DELETE FROM tickets`);
  await pool.query(`INSERT INTO tickets (id, title, priority, status, assignee, sla, desc_text) VALUES
    ('WO-20260714-00001','北门人员入侵告警','high','processing','张工','剩余 22min',''),
    ('WO-20260714-00002','仓库A区烟雾告警','high','pending_assign','-','-',''),
    ('WO-20260714-00003','停车场可疑包裹处置','mid','review','李工','剩余 1h 12min','已清理可疑包裹，现场无异常'),
    ('WO-20260713-00004','研发中心晚间越界','low','closed','王工','已完成','确认为加班人员，已登记'),
    ('WO-20260713-00005','北门人员入侵(低置信)','low','closed','张工','已完成','树叶晃动误报，已忽略')`);
  console.log('  tickets OK');

  // ---- Alerts ----
  await pool.query(`DELETE FROM alerts`);
  await pool.query(`INSERT INTO alerts (id, stream_id, type, confidence, status, note, created_at) VALUES
    ('A001','S001','人员入侵',92,'pending','','2026-07-14 14:52:03'),
    ('A002','S002','烟火检测',87,'pending','','2026-07-14 14:48:15'),
    ('A003','S001','人员入侵',65,'ignored','树叶晃动','2026-07-14 14:30:00'),
    ('A004','S004','物品遗留',95,'confirmed','可疑包裹已清理','2026-07-14 13:15:22'),
    ('A005','S005','区域越界',78,'pending','','2026-07-14 12:00:00'),
    ('A006','S002','烟火检测',45,'false','施工灰尘','2026-07-14 10:20:00'),
    ('A007','S001','人员入侵',88,'pending','','2026-07-14 09:05:00'),
    ('A008','S006','区域越界',72,'confirmed','加班人员进入','2026-07-13 22:30:00')`);
  console.log('  alerts OK');

  // ---- Ticket-Alerts join ----
  await pool.query(`DELETE FROM ticket_alerts`);
  await pool.query(`INSERT INTO ticket_alerts (ticket_id, alert_id) VALUES
    ('WO-20260714-00001','A001'),
    ('WO-20260714-00002','A002'),
    ('WO-20260714-00003','A004'),
    ('WO-20260713-00004','A008'),
    ('WO-20260713-00005','A003')`);
  console.log('  ticket_alerts OK');

  // ---- API Models ----
  await pool.query(`DELETE FROM api_models`);
  await pool.query(`INSERT INTO api_models (id, name, provider, api_url, api_key, is_default) VALUES
    ('M001','GPT-4o','OpenAI','https://api.openai.com/v1/chat/completions','',true),
    ('M002','通义千问','阿里云','https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions','',false),
    ('M003','DeepSeek-V3','DeepSeek','https://api.deepseek.com/v1/chat/completions','',false)`);
  console.log('  api_models OK');

  // ---- System Config ----
  await pool.query(`DELETE FROM system_config`);
  await pool.query(`INSERT INTO system_config (key, value) VALUES
    ('logRetentionDays','90'),
    ('screenshotRetentionDays','7'),
    ('websocketHeartbeat','30'),
    ('globalSensitivity','0.65')`);
  console.log('  system_config OK');

  // ---- Schedules ----
  await pool.query(`DELETE FROM schedules`);
  await pool.query(`INSERT INTO schedules (year, month, date, user_id, shift) VALUES
    (2026,7,14,'U002','早班 08-16'),
    (2026,7,14,'U003','中班 16-00'),
    (2026,7,15,'U004','早班 08-16'),
    (2026,7,15,'U006','夜班 00-08'),
    (2026,7,16,'U002','中班 16-00')`);
  console.log('  schedules OK');

  await pool.end();
  console.log('Seed complete.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
