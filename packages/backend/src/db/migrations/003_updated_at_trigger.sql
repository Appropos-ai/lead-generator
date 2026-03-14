CREATE TRIGGER IF NOT EXISTS leads_updated_at
AFTER UPDATE ON leads
FOR EACH ROW
BEGIN
  UPDATE leads SET updated_at = datetime('now') WHERE id = NEW.id;
END;
