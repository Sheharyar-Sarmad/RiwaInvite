-- updated_at triggers
CREATE TRIGGER trg_update_orders_updated_at
BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_gift_transactions_updated_at
BEFORE UPDATE ON gift_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_payouts_updated_at
BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_user_credits_updated_at
BEFORE UPDATE ON user_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Salami 5% Fee Auto-Calculator
CREATE TRIGGER trg_calculate_salami_split
BEFORE UPDATE OR INSERT ON gift_transactions
FOR EACH ROW EXECUTE FUNCTION calculate_salami_split();