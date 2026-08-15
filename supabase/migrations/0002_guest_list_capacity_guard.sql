-- 0002_guest_list_capacity_guard.sql
-- Enforces guest_lists.max_men/max_women at the database level, closing a race
-- condition where two concurrent public submissions could both pass the
-- application-level capacity check (lib/domain/guestList.ts's canAddEntry)
-- and both insert, overshooting the configured cap.

create or replace function enforce_guest_list_capacity()
returns trigger as $$
declare
  v_max_men int;
  v_max_women int;
  v_current int;
begin
  -- Lock the parent guest_lists row so concurrent inserts for the same list
  -- serialize here: the second transaction blocks until the first commits
  -- (or rolls back), then re-reads a count that reflects the first's result.
  select max_men, max_women into v_max_men, v_max_women
    from guest_lists
    where id = new.guest_list_id
    for update;

  select count(*) into v_current
    from guest_list_entries
    where guest_list_id = new.guest_list_id and gender = new.gender;

  if new.gender = 'male' and v_current >= v_max_men then
    raise exception 'guest_list_capacity_exceeded' using errcode = 'P0001';
  end if;

  if new.gender = 'female' and v_current >= v_max_women then
    raise exception 'guest_list_capacity_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger guest_list_capacity_guard
  before insert on guest_list_entries
  for each row execute function enforce_guest_list_capacity();
