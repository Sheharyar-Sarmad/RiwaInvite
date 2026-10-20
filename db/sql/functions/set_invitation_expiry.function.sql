CREATE OR REPLACE FUNCTION set_invitation_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set expiry to 5 days after the invitation date
    NEW.expires_at := NEW.invitation_date + INTERVAL '5 days';
    RETURN NEW;
END;
$$ language 'plpgsql';