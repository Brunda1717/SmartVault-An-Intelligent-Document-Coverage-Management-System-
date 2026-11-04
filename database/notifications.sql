USE smartvault;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  asset_id INT NULL,
  coverage_id INT NULL,
  notification_type VARCHAR(20) NOT NULL,   -- expiry | expired | overlap
  severity VARCHAR(10) DEFAULT 'info',      -- info | warning | critical
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  email_status VARCHAR(10) DEFAULT 'pending',  -- sent | failed | skipped
  dedupe_key VARCHAR(150) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
  FOREIGN KEY (coverage_id) REFERENCES coverage(coverage_id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read)
);