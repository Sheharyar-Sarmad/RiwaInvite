CREATE INDEX idx_templates_category ON templates(category_id);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_templates_is_premium ON templates(is_premium) WHERE is_premium = TRUE;