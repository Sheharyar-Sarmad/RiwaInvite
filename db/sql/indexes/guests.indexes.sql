-- 1. The most critical index. 
-- When a host views their dashboard, they query all guests for ONE invitation.
CREATE INDEX idx_guests_invitation ON guests(invitation_id);

-- 2. The RSVP Filter Index.
-- Hosts often want to see only the "Yes" responses to know the final headcount.
CREATE INDEX idx_guests_attendance ON guests(invitation_id, attendance);

-- 3. The Sorting Index.
-- When exporting to Excel or viewing the dashboard, you usually want the newest RSVPs at the top.
CREATE INDEX idx_guests_created_at ON guests(invitation_id, created_at DESC);