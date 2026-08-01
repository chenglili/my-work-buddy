update public.task_definitions
set completion_mode = 'auto',
    minimum_score = 0,
    minimum_duration = null
where id in ('chinese-morning-reading', 'chinese-night-reading');
