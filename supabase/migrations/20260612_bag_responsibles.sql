with desired_responsibles (bag_slug, email) as (
  values
    ('bolsa-1', 'lourdes@maservicios.ar'),
    ('bolsa-2', 'victoria@maservicios.ar'),
    ('bolsa-3', 'antonella@maservicios.ar'),
    ('bolsa-4', 'roman@maservicios.ar'),
    ('bolsa-5', 'rocio@maservicios.ar')
),
resolved as (
  select
    b.id as bag_id,
    p.id as user_id
  from desired_responsibles dr
  join public.bags b on b.slug = dr.bag_slug
  join public.profiles p on p.email = dr.email
)
update public.bags b
set responsible_user_id = r.user_id
from resolved r
where b.id = r.bag_id;

with desired_responsibles (bag_slug, email) as (
  values
    ('bolsa-1', 'lourdes@maservicios.ar'),
    ('bolsa-2', 'victoria@maservicios.ar'),
    ('bolsa-3', 'antonella@maservicios.ar'),
    ('bolsa-4', 'roman@maservicios.ar'),
    ('bolsa-5', 'rocio@maservicios.ar')
),
resolved as (
  select
    b.id as bag_id,
    p.id as user_id
  from desired_responsibles dr
  join public.bags b on b.slug = dr.bag_slug
  join public.profiles p on p.email = dr.email
)
insert into public.bag_assignments (bag_id, user_id, status)
select bag_id, user_id, 'active'
from resolved
on conflict (bag_id, user_id) do update
set status = excluded.status;

with desired_responsibles (bag_slug, email) as (
  values
    ('bolsa-1', 'lourdes@maservicios.ar'),
    ('bolsa-2', 'victoria@maservicios.ar'),
    ('bolsa-3', 'antonella@maservicios.ar'),
    ('bolsa-4', 'roman@maservicios.ar'),
    ('bolsa-5', 'rocio@maservicios.ar')
),
resolved as (
  select
    b.id as bag_id,
    p.id as user_id
  from desired_responsibles dr
  join public.bags b on b.slug = dr.bag_slug
  join public.profiles p on p.email = dr.email
)
update public.bag_assignments ba
set status = 'inactive'
where exists (
  select 1
  from resolved r
  where r.bag_id = ba.bag_id
    and r.user_id <> ba.user_id
);
