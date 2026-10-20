CREATE TRIGGER trg_update_template_categories_updated_at
BEFORE UPDATE ON template_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_invitations_updated_at
BEFORE UPDATE ON invitations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_set_invitation_expiry
BEFORE INSERT OR UPDATE OF invitation_date ON invitations
FOR EACH ROW EXECUTE FUNCTION set_invitation_expiry();

CREATE TRIGGER trg_validate_invitation_date
BEFORE INSERT OR UPDATE ON invitations
FOR EACH ROW EXECUTE FUNCTION validate_invitation_date();