-- Advisor fix: pin search_path on the daily-limit constants (no behaviour change).
alter function private.daily_like_limit() set search_path = '';
alter function private.daily_treat_limit() set search_path = '';
