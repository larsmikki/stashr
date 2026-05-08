CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('favorites_on_home', '0');
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('favorites_sort_order', '9999');
