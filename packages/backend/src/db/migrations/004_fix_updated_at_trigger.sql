DROP TRIGGER IF EXISTS leads_updated_at;

CREATE TRIGGER leads_updated_at
AFTER UPDATE ON leads
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE leads SET updated_at = datetime('now') WHERE id = NEW.id;
END;
