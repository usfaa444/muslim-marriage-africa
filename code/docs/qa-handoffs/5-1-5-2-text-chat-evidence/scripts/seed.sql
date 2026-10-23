-- ids: uuid v7-like
insert into account (id,email,pseudonym,gender,roles,status,age_attested,coc_version,civil_given_name,civil_family_name) values
('01990000-0000-7000-8000-00000000a001','qa-bro@example.bf','QA_Frere','brother','{member}','Active',true,'FR-089','Ali','Test'),
('01990000-0000-7000-8000-00000000a002','qa-sis@example.bf','QA_Soeur','sister','{member}','Active',true,'FR-089','Awa','Test'),
('01990000-0000-7000-8000-00000000a003','qa-c@example.bf','QA_Autre','brother','{member}','Active',true,'FR-089','Cc','Test'),
('01990000-0000-7000-8000-00000000a004','qa-d@example.bf','QA_Autre2','sister','{member}','Active',true,'FR-089','Dd','Test'),
('01990000-0000-7000-8000-00000000a005','qa-staff@example.bf','QA_Staff','none','{moderator}','Active',true,'FR-089','St','Aff'),
('01990000-0000-7000-8000-00000000a006','qa-nolist@example.bf','QA_Brouillon','brother','{member}','Active',true,'FR-089','Nn','Test');
insert into profile (account_id,dob,city,visibility) values
('01990000-0000-7000-8000-00000000a001','1994-03-01','ouagadougou','public'),
('01990000-0000-7000-8000-00000000a002','1996-05-01','bobo-dioulasso','public'),
('01990000-0000-7000-8000-00000000a003','1990-03-01','ouagadougou','public'),
('01990000-0000-7000-8000-00000000a004','1995-03-01','ouagadougou','public');
insert into invite (id,from_id,to_id,state,created_at) values
('01990000-0000-7000-8000-00000000b001','01990000-0000-7000-8000-00000000a001','01990000-0000-7000-8000-00000000a002','accepted',now()),
('01990000-0000-7000-8000-00000000b002','01990000-0000-7000-8000-00000000a003','01990000-0000-7000-8000-00000000a004','accepted',now());
insert into conversation (id,invite_id,stage) values
('01990000-0000-7000-8000-00000000c001','01990000-0000-7000-8000-00000000b001','chat'),
('01990000-0000-7000-8000-00000000c002','01990000-0000-7000-8000-00000000b002','chat');
insert into session (id,account_id,kind,expires_at,last_seen_at) values
('01990000-0000-7000-8000-00000000f001','01990000-0000-7000-8000-00000000a001','web',now()+interval '1 day',now()),
('01990000-0000-7000-8000-00000000f002','01990000-0000-7000-8000-00000000a002','web',now()+interval '1 day',now()),
('01990000-0000-7000-8000-00000000f003','01990000-0000-7000-8000-00000000a003','web',now()+interval '1 day',now()),
('01990000-0000-7000-8000-00000000f005','01990000-0000-7000-8000-00000000a005','web',now()+interval '1 day',now()),
('01990000-0000-7000-8000-00000000f006','01990000-0000-7000-8000-00000000a006','web',now()+interval '1 day',now());
