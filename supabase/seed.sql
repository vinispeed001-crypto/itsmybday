-- seed.sql
insert into venues (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', '300 Sky Bar', '300-sky-bar')
on conflict (slug) do nothing;

insert into house_rules (venue_id, content)
values (
  '00000000-0000-0000-0000-000000000001',
  E'Dress code: esporte fino.\nTaxa de rolha: consulte a equipe.\nTolerância de horário: 30 minutos após o horário reservado.\nNo-show: reservas não confirmadas até o horário limite perdem a prioridade.'
)
on conflict (venue_id) do nothing;

insert into availability_slots (venue_id, event_date, time, is_open)
values
  ('00000000-0000-0000-0000-000000000001', current_date + interval '7 day', '22:00', true),
  ('00000000-0000-0000-0000-000000000001', current_date + interval '7 day', '23:00', true),
  ('00000000-0000-0000-0000-000000000001', current_date + interval '14 day', '22:00', true)
on conflict do nothing;
