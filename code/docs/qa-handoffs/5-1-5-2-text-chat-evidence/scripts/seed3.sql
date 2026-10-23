insert into credential (id,account_id,kind,secret_hash,email_verified_at)
select ('01990000-0000-7000-8000-0000000d'||right(id::text,4))::uuid, id, 'password', 'x', now() from account where email like 'qa-%' and 'member'=any(roles);
insert into verification_record (id,account_id,kind,status,expires_at)
select gen_random_uuid(), id, k, 'granted', now()+interval '1 year' from account, unnest(array['phone_otp','id_document']) k where email like 'qa-%' and 'member'=any(roles);
insert into verification_record (id,account_id,kind,status,pose)
select gen_random_uuid(), id, 'liveness', 'granted', 'raise_right_hand' from account where email like 'qa-%' and 'member'=any(roles);
