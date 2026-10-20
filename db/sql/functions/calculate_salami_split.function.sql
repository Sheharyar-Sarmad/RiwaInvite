CREATE OR REPLACE FUNCTION calculate_salami_split()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if payment is completed and we haven't calculated the split yet
    IF NEW.status = 'completed' AND NEW.platform_fee IS NULL THEN
        NEW.platform_fee := NEW.total_amount * 0.05; -- 5% Platform Fee
        NEW.host_payout_amount := NEW.total_amount - NEW.platform_fee; -- 95% Host Share
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';