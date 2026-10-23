delete from session where id='01990000-0000-7000-8000-00000000f005';
insert into session (id,account_id,kind,expires_at,last_seen_at,mfa_state) values ('01990000-0000-7000-8000-00000000f005','01990000-0000-7000-8000-00000000a005','staff',now()+interval '1 day',now(),'done');
insert into account (id,email,pseudonym,gender,roles,status,age_attested,coc_version,civil_given_name,civil_family_name) values
('01990000-0000-7000-8000-00000000a007','qa-mahram@example.bf','QA_Mahram','sister','{mahram}','Active',true,'FR-089','Ma','Hram');
insert into session (id,account_id,kind,expires_at,last_seen_at) values ('01990000-0000-7000-8000-00000000f007','01990000-0000-7000-8000-00000000a007','mahram',now()+interval '1 day',now());
