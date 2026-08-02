update public.task_definitions
set minimum_score = 0
where id in ('game-hanzi', 'game-number', 'game-spot', 'game-logic');
