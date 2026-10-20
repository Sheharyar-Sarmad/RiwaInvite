CREATE OR REPLACE FUNCTION validate_invitation_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invitation_date > (CURRENT_DATE + INTERVAL '2 months') THEN
        RAISE EXCEPTION 'Invitation date cannot be more than 2 months from today.';
    END IF;
    IF NEW.invitation_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Invitation date cannot be in the past.';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';