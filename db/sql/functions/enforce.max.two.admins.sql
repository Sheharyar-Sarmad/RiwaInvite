-- 1. Create the function that checks the count
CREATE OR REPLACE FUNCTION enforce_max_two_admins()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM admins) >= 2 THEN
        RAISE EXCEPTION 'Hard limit reached: Maximum of 2 admin accounts are allowed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop the trigger if it already exists (this is what caused the notice)
DROP TRIGGER IF EXISTS trigger_max_two_admins ON admins;

-- 3. Create the actual trigger that fires the function before an insert
CREATE TRIGGER trigger_max_two_admins
BEFORE INSERT ON admins
FOR EACH ROW EXECUTE FUNCTION enforce_max_two_admins();