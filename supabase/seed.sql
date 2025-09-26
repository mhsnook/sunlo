set
	session_replication_role = replica;

--
-- PostgreSQL database dump
--
-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8
set
	statement_timeout = 0;

set
	lock_timeout = 0;

set
	idle_in_transaction_session_timeout = 0;

set
	client_encoding = 'UTF8';

set
	standard_conforming_strings = on;

select
	pg_catalog.set_config ('search_path', '', false);

set
	check_function_bodies = false;

set
	xmloption = content;

set
	client_min_messages = warning;

set
	row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
insert into
	"auth"."users" (
		"instance_id",
		"id",
		"aud",
		"role",
		"email",
		"encrypted_password",
		"email_confirmed_at",
		"invited_at",
		"confirmation_token",
		"confirmation_sent_at",
		"recovery_token",
		"recovery_sent_at",
		"email_change_token_new",
		"email_change",
		"email_change_sent_at",
		"last_sign_in_at",
		"raw_app_meta_data",
		"raw_user_meta_data",
		"is_super_admin",
		"created_at",
		"updated_at",
		"phone",
		"phone_confirmed_at",
		"phone_change",
		"phone_change_token",
		"phone_change_sent_at",
		"email_change_token_current",
		"email_change_confirm_status",
		"banned_until",
		"reauthentication_token",
		"reauthentication_sent_at",
		"is_sso_user",
		"deleted_at",
		"is_anonymous"
	)
values
	(
		'00000000-0000-0000-0000-000000000000',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'authenticated',
		'authenticated',
		'sunloapp+friend@gmail.com',
		'$2a$10$HulXzOjX35MG0pOGEz4b/.R6xvTUr6XJH0RmGwUJ1Y1R9iD1cBoRq',
		now() - interval '3 days',
		null,
		'',
		null,
		'',
		null,
		'',
		'',
		null,
		now() - interval '1 hour',
		'{"provider": "email", "providers": ["email"]}',
		'{"email_verified": true}',
		null,
		now() - interval '3 days',
		now() - interval '1 hour',
		null,
		null,
		'',
		'',
		null,
		'',
		0,
		null,
		'',
		null,
		false,
		null,
		false
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'authenticated',
		'authenticated',
		'sunloapp+2@gmail.com',
		'$2a$10$fxbf2./iFAbvsiVyQiJcDuANSPubSC/W2uoQRecBk9MYaFP2DeRaq',
		now() - interval '60 days',
		null,
		'',
		null,
		'',
		null,
		'',
		'',
		null,
		null,
		'{"provider": "email", "providers": ["email"]}',
		'{"email_verified": true}',
		null,
		now() - interval '2 days',
		now() - interval '2 days',
		null,
		null,
		'',
		'',
		null,
		'',
		0,
		null,
		'',
		null,
		false,
		null,
		false
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'authenticated',
		'authenticated',
		'sunloapp+1@gmail.com',
		'$2a$10$S2uR7jPdbYRdtVA57dFn5exhn6TcwqKqCIwlndmbDwalJ.rZClyRK',
		now() - interval '5 days',
		null,
		'',
		null,
		'',
		null,
		'',
		'',
		null,
		now() - interval '5 days',
		'{"provider": "email", "providers": ["email"]}',
		'{"email_verified": true}',
		null,
		now() - interval '5 days',
		now() - interval '5 days',
		null,
		null,
		'',
		'',
		null,
		'',
		0,
		null,
		'',
		null,
		false,
		null,
		false
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'authenticated',
		'authenticated',
		'sunloapp@gmail.com',
		'$2a$10$nbkbcyoLi.buagd2DyyT0u4kpYoV.VZh6fSqRWvNxmZkea0XUcybG',
		now() - interval '30 days',
		null,
		'',
		now() - interval '30 days',
		'',
		null,
		'',
		'',
		null,
		now() - interval '2 hours',
		'{"provider": "email", "providers": ["email"]}',
		'{"sub": "cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18", "role": "learner", "email": "sunloapp@gmail.com", "email_verified": true, "phone_verified": false}',
		null,
		now() - interval '30 days',
		now() - interval '2 hours',
		null,
		null,
		'',
		'',
		null,
		'',
		0,
		null,
		'',
		null,
		false,
		null,
		false
	);

--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
insert into
	"auth"."identities" (
		"provider_id",
		"user_id",
		"identity_data",
		"provider",
		"last_sign_in_at",
		"created_at",
		"updated_at",
		"id"
	)
values
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'{"sub": "cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18", "role": "learner", "email": "sunloapp@gmail.com", "email_verified": true, "phone_verified": false}',
		'email',
		now() - interval '30 days',
		now() - interval '30 days',
		now() - interval '30 days',
		'2afbf148-aaf2-4583-80fd-188cfc0410f3'
	),
	(
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'{"sub": "7ad846a9-d55b-4035-8be2-dbcc70074f74", "email": "sunloapp+friend@gmail.com", "email_verified": false, "phone_verified": false}',
		'email',
		now() - interval '3 days',
		now() - interval '3 days',
		now() - interval '3 days',
		'4404ec5d-b62e-4a76-abb7-51a6a9f79695'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'{"sub": "a2dfa256-ef7b-41b0-b05a-d97afab8dd21", "email": "sunloapp+1@gmail.com", "email_verified": false, "phone_verified": false}',
		'email',
		now() - interval '2 days',
		now() - interval '2 days',
		now() - interval '2 days',
		'42e47091-e1a1-41a7-8a4f-7147c72e9fa5'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'{"sub": "a32f65e7-a496-4afc-abd3-798d8e6d9ec5", "email": "sunloapp+2@gmail.com", "email_verified": false, "phone_verified": false}',
		'email',
		now() - interval '1 days',
		now() - interval '1 days',
		now() - interval '1 days',
		'c8e68f48-8d91-426e-a1fc-4aefb8d690d3'
	);

--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: language; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."language" ("name", "lang", "alias_of")
values
	('Zulu', 'zul', null),
	('Chuvash', 'chv', null),
	('Cornish', 'cor', null),
	('Corsican', 'cos', null),
	('Amharic', 'amh', null),
	('Zhuang', 'zha', null),
	('Cree', 'cre', null),
	('Danish', 'dan', null),
	('Divehi, Dhivehi, Maldivian', 'div', null),
	('Dzongkha', 'dzo', null),
	('Esperanto', 'epo', null),
	('Estonian', 'est', null),
	('Ewe', 'ewe', null),
	('Faroese', 'fao', null),
	('Fijian', 'fij', null),
	('Finnish', 'fin', null),
	('Fulah', 'ful', null),
	('Irish', 'gle', null),
	('Galician', 'glg', null),
	('Manx', 'glv', null),
	('Guarani', 'grn', null),
	('Gujarati', 'guj', null),
	('Haitian, Haitian Creole', 'hat', null),
	('Hausa', 'hau', null),
	('Hebrew', 'heb', null),
	('Herero', 'her', null),
	('Hiri Motu', 'hmo', null),
	('Hindi', 'hin', null),
	('English', 'eng', null),
	('French', 'fra', null),
	('Marathi', 'mar', null),
	('Punjabi', 'pan', null),
	('Arabic', 'ara', null),
	('Italian', 'ita', null),
	('Konkani', 'kok', null),
	('Spanish', 'spa', null),
	('Polish', 'pol', null),
	('Tamil', 'tam', null),
	('Thai', 'tha', null),
	('German', 'deu', null),
	('Armenian', 'arm', 'hye'),
	('Urdu', 'urd', null),
	('Kannada', 'kan', null),
	('Croatian', 'hrv', null),
	('Malayalam', 'mal', null),
	('Hungarian', 'hun', null),
	('Igbo', 'ibo', null),
	('Ido', 'ido', null),
	('Sichuan Yi, Nuosu', 'iii', null),
	('Inuktitut', 'iku', null),
	('Interlingue, Occidental', 'ile', null),
	('Interlingua (IALA)', 'ina', null),
	('Indonesian', 'ind', null),
	('Inupiaq', 'ipk', null),
	('Javanese', 'jav', null),
	('Japanese', 'jpn', null),
	('Kalaallisut, Greenlandic', 'kal', null),
	('Kashmiri', 'kas', null),
	('Kanuri', 'kau', null),
	('Kazakh', 'kaz', null),
	('Central Khmer', 'khm', null),
	('Kikuyu, Gikuyu', 'kik', null),
	('Kinyarwanda', 'kin', null),
	('Kirghiz, Kyrgyz', 'kir', null),
	('Komi', 'kom', null),
	('Kongo', 'kon', null),
	('Korean', 'kor', null),
	('Kuanyama, Kwanyama', 'kua', null),
	('Kurdish', 'kur', null),
	('Lao', 'lao', null),
	('Latin', 'lat', null),
	('Latvian', 'lav', null),
	('Limburgan, Limburger, Limburgish', 'lim', null),
	('Lingala', 'lin', null),
	('Lithuanian', 'lit', null),
	('Welsh', 'cym', null),
	('Greek', 'ell', null),
	('Farsi (Persian)', 'fas', null),
	('Luxembourgish, Letzeburgesch', 'ltz', null),
	('Luba-Katanga', 'lub', null),
	('Ganda', 'lug', null),
	('Marshallese', 'mah', null),
	('Malagasy', 'mlg', null),
	('Maltese', 'mlt', null),
	('Mongolian', 'mon', null),
	('Nauru', 'nau', null),
	('Navajo', 'nav', null),
	('Ndebele, South', 'nbl', null),
	('Ndebele, North', 'nde', null),
	('Ndonga', 'ndo', null),
	('Nepali', 'nep', null),
	('Norwegian', 'nor', null),
	('Chichewa, Chewa, Nyanja', 'nya', null),
	('Occitan', 'oci', null),
	('Ojibwa', 'oji', null),
	('Oriya', 'ori', null),
	('Oromo', 'orm', null),
	('Ossetian, Ossetic', 'oss', null),
	('Pali', 'pli', null),
	('Tagalog', 'tgl', null),
	('Icelandic', 'isl', null),
	('Georgian', 'kat', null),
	('Macedonian', 'mkd', null),
	('Māori', 'mri', null),
	('Malay', 'msa', null),
	('Flemish (Dutch)', 'nld', null),
	('Slovak', 'slk', null),
	('Afar', 'aar', null),
	('Abkhazian', 'abk', null),
	('Afrikaans', 'afr', null),
	('Akan', 'aka', null),
	('Tigrinya', 'tir', null),
	('Tonga', 'ton', null),
	('Tswana', 'tsn', null),
	('Tsonga', 'tso', null),
	('Turkmen', 'tuk', null),
	('Turkish', 'tur', null),
	('Twi', 'twi', null),
	('Uyghur', 'uig', null),
	('Ukrainian', 'ukr', null),
	('Uzbek', 'uzb', null),
	('Venda', 'ven', null),
	('Vietnamese', 'vie', null),
	('Volapük', 'vol', null),
	('Walloon', 'wln', null),
	('Wolof', 'wol', null),
	('Xhosa', 'xho', null),
	('Yiddish', 'yid', null),
	('Yoruba', 'yor', null),
	('Portuguese', 'por', null),
	('Quechua', 'que', null),
	('Romansh', 'roh', null),
	('Rundi', 'run', null),
	('Russian', 'rus', null),
	('Sango', 'sag', null),
	('Sanskrit', 'san', null),
	('Slovenian', 'slv', null),
	('Samoan', 'smo', null),
	('Shona', 'sna', null),
	('Sindhi', 'snd', null),
	('Basque', 'baq', 'eus'),
	('Chinese', 'zho', null),
	('Chinese', 'chi', 'zho'),
	('Czech', 'cze', 'ces'),
	('Farsi (Persian)', 'per', 'far'),
	('Flemish (Dutch)', 'dut', 'nld'),
	('Albanian', 'alb', 'sqi'),
	('Basque', 'eus', null),
	('Burmese', 'bur', 'mya'),
	('Burmese', 'mya', null),
	('Czech', 'ces', null),
	('Georgian', 'geo', 'kat'),
	('French', 'fre', 'fra'),
	('German', 'ger', 'deu'),
	('Greek', 'gre', 'ell'),
	('Macedonian', 'mac', 'mkd'),
	('Malay', 'may', 'msa'),
	('Māori', 'mao', 'mri'),
	('Slovak', 'slo', 'slk'),
	('Romanian', 'ron', null),
	('Romanian', 'rum', 'ron'),
	('Bokmål, Norwegian, Norwegian Bokmål', 'nob', 'nor'),
	('Welsh', 'wel', 'cym'),
	('Pashto', 'pus', null),
	('Frisian, Western', 'fry', null),
	('Sami, Northern', 'sme', null),
	('Gaelic, Scottish', 'gla', null),
	('Sinhala', 'sin', null),
	('Tibetan (Lhasa)', 'bod', null),
	('Tibetan (Lhasa)', 'tib', 'bod'),
	('Norwegian Nynorsk, Nynorsk, Norwegian', 'nno', 'nor'),
	('Somali', 'som', null),
	('Sotho, Southern', 'sot', null),
	('Sardinian', 'srd', null),
	('Serbian', 'srp', null),
	('Swati', 'ssw', null),
	('Sundanese', 'sun', null),
	('Swahili', 'swa', null),
	('Swedish', 'swe', null),
	('Tahitian', 'tah', null),
	('Tatar', 'tat', null),
	('Telugu', 'tel', null),
	('Tajik', 'tgk', null),
	('Aragonese', 'arg', null),
	('Assamese', 'asm', null),
	('Avaric', 'ava', null),
	('Avestan', 'ave', null),
	('Aymara', 'aym', null),
	('Azerbaijani', 'aze', null),
	('Bashkir', 'bak', null),
	('Bambara', 'bam', null),
	('Belarusian', 'bel', null),
	('Bislama', 'bis', null),
	('Bosnian', 'bos', null),
	('Breton', 'bre', null),
	('Bulgarian', 'bul', null),
	('Catalan, Valencian', 'cat', null),
	('Chamorro', 'cha', null),
	('Chechen', 'che', null),
	('Church Slavic', 'chu', null),
	('Albanian', 'sqi', null),
	('Armenian', 'hye', null),
	('Icelandic', 'ice', 'isl'),
	('Bangla (Bengali)', 'ben', null),
	('Model language', 'mod', null);

--
-- Data for Name: user_profile; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."user_profile" (
		"uid",
		"username",
		"updated_at",
		"created_at",
		"avatar_path",
		"languages_known"
	)
values
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'GarlicFace',
		null,
		now() - interval '30 days',
		'hyrax-197033.jpeg',
		'[{"lang": "eng", "level": "fluent"}, {"lang": "fra", "level": "proficient"}, {"lang": "fas", "level": "proficient"}]'
	),
	(
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'Lexigrine',
		null,
		now() - interval '3 days',
		'cartoon-face-288-1ac43e.png',
		'[{"lang": "eng", "level": "fluent"}]'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'Best Frin',
		null,
		now() - interval '2 days',
		'red-bowl-1ad6ab.jpeg',
		'[{"lang": "eng", "level": "fluent"}, {"lang": "fra", "level": "beginner"}, {"lang": "hin", "level": "beginner"}]'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'Work Andy',
		null,
		now() - interval '2 days',
		'pc-background-1ad6b1.jpg',
		'[{"lang": "tam", "level": "fluent"}, {"lang": "hin", "level": "fluent"}, {"lang": "kan", "level": "proficient"}, {"lang": "eng", "level": "fluent"}, {"lang": "deu", "level": "proficient"}]'
	);

--
-- Data for Name: phrase_request; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."phrase_request" (
		"id",
		"created_at",
		"requester_uid",
		"lang",
		"prompt",
		"status",
		"fulfilled_at"
	)
values
	(
		'26fc0561-2b17-4663-a017-b88257702e25',
		now() - interval '10 days',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'ibo',
		'I see a cab and driver waiting on the road and I want to ask them if they''re available to take me someplace, how do I say this? "Are you available for hire?" "Can you take me?" etc',
		'pending',
		null
	),
	(
		'bc2e2811-1a9b-4131-981d-f2d7d7b26411',
		now() - interval '5 days',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'tam',
		'How do I say "This is one of my favourite foods / I know and love this dish" like I''m being a little casual but someone is saying "oh should I get you something else?" and I''m saying "no I love this food! don''t worry, I''m just taking a minute" kind of like that.',
		'pending',
		null
	),
	(
		'e0d3a74e-4fe7-43c0-aa35-d05c83929986',
		now() - interval '3 days',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'hin',
		'How do I say "I''d like a cheeseburger?"',
		'fulfilled',
		now() - interval '2 days'
	);

--
-- Data for Name: phrase; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."phrase" (
		"text",
		"id",
		"added_by",
		"lang",
		"created_at",
		"text_script",
		"request_id"
	)
values
	(
		'Amele',
		'b9e3edac-de8b-4796-b436-a0cded08d2ae',
		null,
		'kan',
		now() - interval '60 days',
		null,
		null
	),
	(
		'edhu, idhu, adhu, adhunga',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'test',
		'2fbae84f-5b1d-43c2-8927-ef4d41c7e794',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'teen logue',
		'5f7ce03f-f6a1-48cf-bb59-6265faf2ea98',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Aoo thodee Konkani ooloyta',
		'a417afc8-6c80-4589-a314-55ac756b28f1',
		null,
		'kok',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Kitle',
		'd9da12a0-18f3-4836-af4b-8ea9423848ca',
		null,
		'kok',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kop khun [ka/krup]',
		'5b714f21-94e2-4345-88ca-7ea25a5bf988',
		null,
		'tha',
		now() - interval '60 days',
		null,
		null
	),
	(
		'gee baht [ka/krup]',
		'd546b14b-0bdf-48fa-9f55-0fa3ac1f3af7',
		null,
		'tha',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kop khun [ka/krup]',
		'faae3442-2957-431d-b055-e8910b3c26ad',
		null,
		'tha',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Je ne sais quoi',
		'de2f5e51-876d-4978-8a12-6146ece9202c',
		null,
		'fra',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Sir map location pe aajaiye?',
		'235ce61c-be21-4697-815d-d5aa1a4ff121',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Oui',
		'bb8b9a4c-ddff-470a-86d8-8cd1ac335501',
		null,
		'fra',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Aap log theek hain?',
		'f1f5234e-0426-44f5-a007-b67329a70a81',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kuch nahi',
		'170f5fd4-58f8-4b05-aba4-23522f35800f',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'aur kuch?',
		'90108f59-7968-457f-9744-2e3b44e980dd',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'barish ho rahi hai',
		'9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'barish nahi ho rahi hai',
		'5b5cc7ec-702e-4dc1-a568-0dcc660c25bb',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'nahi',
		'f878e60f-9647-4728-a368-fc8681b0acbb',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'onnu, rendu, moonu, naalu, anju, aaru, yaelu, ettu, onbathu, pathtu',
		'295fbba3-892c-43f9-84ba-85cf15fd28a5',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'yallo',
		'06e117d1-1b43-4047-996f-a298aad53823',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'test',
		'9e2fef5c-d144-4ea9-9b31-0bd4cefb7ee8',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'test',
		'a8fbdb84-24bf-456e-836c-b355355caa45',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'test',
		'7f412edd-af7c-486e-a35f-3b2a7803efc9',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'haanji',
		'1395ae94-46d9-4a54-92f5-fb8b76db896b',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'signal se left',
		'4d3207d1-a0bf-4504-831e-bfadb834d315',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'aur kuch batao',
		'ded8028a-493f-438f-8b72-316c769a66b9',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kyuki',
		'e060237f-1744-427a-8e8e-53da29582d35',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'ye kya hai?',
		'c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kya hua',
		'cc3847f3-b151-401e-80c9-4aef221c54b5',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kya ho raha hai?',
		'f6b69f3b-09b9-41a7-a9f2-255da0697015',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'grazi',
		'bca7ad96-44f4-4d58-b5b0-004f4450209a',
		null,
		'ita',
		now() - interval '60 days',
		null,
		null
	),
	(
		'bas',
		'7e01d5e8-d3ab-4cc1-8e7a-b5861f1742cd',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'thodisi dhoop hai aaj!',
		'a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'ho gaya aajka',
		'c3d00086-6d8c-431d-b2a0-df5757457a5e',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kitna?',
		'8167b776-fc93-4e3f-b06e-5fa5818f2d3b',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Sunlo',
		'78057374-cf85-4940-91d1-7d04c156abfb',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Il fait frois',
		'57ddf6f6-d655-4fef-832d-b13650b26b82',
		null,
		'fra',
		now() - interval '60 days',
		null,
		null
	),
	(
		'dhat',
		'80b03361-25d1-434b-8935-4a2a762d2353',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'madarchod',
		'43a760da-65af-400e-b3f0-fbed7a6b338e',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kai paije?',
		'99d430c1-5cbf-45aa-a95b-993e867ed668',
		null,
		'mar',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kai',
		'e9e0cdff-30b0-48fb-9816-285464943466',
		null,
		'mar',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Tumhala kuthe zaichay?',
		'025301d1-00ef-45da-a1a0-d8382c4e5660',
		null,
		'mar',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Hé kiti la aahë?',
		'3282e79e-3041-4adb-89fc-35d61f2f9eb8',
		null,
		'mar',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Tumchyasathi mi kai karu?',
		'd155ec89-6bd2-411f-877f-51e96513dbc7',
		null,
		'mar',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Aai chi gaand',
		'7d1461c8-a158-4633-b650-de7f83c7e436',
		null,
		'mar',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Kahan Ja Rahey Ho?',
		'83daad8e-f64f-4e8d-81f7-63aedd829c11',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Patta hai',
		'903817a7-168a-4b99-87a1-79b3e3e14d84',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Hum puchhengey',
		'ee0fb561-8e07-413b-ac5c-65ec7041c17d',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kya chal raha hai?',
		'fae20b24-42dc-4b9e-aebc-22afcdfc4689',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'aapka naam kya hai?',
		'1d44afd2-1274-47ec-8107-36bd09861c3d',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'tumhara naam kya hai?',
		'fdd62764-2438-42bb-af7f-9eb378082899',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kya khana khaya aapne?',
		'184170d9-3717-427e-b347-35533ea52a02',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'suno iski baat',
		'ca8af1e7-304a-4aef-a22e-26d9376b6313',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'chalta hai?',
		'0823546b-d240-4f14-9d51-8dfae5fcddc3',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'chalo',
		'48edc28c-1530-4549-b48c-f678033a6892',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'chale?',
		'24746d12-8a65-47e7-97c5-87c828585db6',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'main tum se pyaar karta hoon',
		'52851577-c8ba-4254-9c74-6edd310d6971',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Polama',
		'fd535752-d602-4ab8-8656-9e11692f30fc',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'main aah raha hoon',
		'd4b66bd6-52fc-438d-afc5-3d35be9995c2',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'main ja raha hoon',
		'46ed187a-c132-4781-822f-ebb056ddf960',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'aap kaise ho?',
		'48fe0624-f586-4812-a1a5-33c634995671',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'main theek hoon',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'namaste',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'eik, do, teen, chaar, paanch, che, saht, aht, no, das',
		'8133abe3-f908-445a-b8ae-6f01db3c18d7',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kyu?',
		'267acd7c-65f2-4aad-bf5c-58e01c0f69f8',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Main aur kha nahi sakta hoon',
		'1174699b-deac-480a-94af-555018da33fb',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Chaep',
		'14fd9a81-be8c-44b2-a8f7-8a2bf5c9c8e6',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Kal kaafi fun ho gaya ta',
		'f7454ec3-5673-4858-a2f9-65925083ecbf',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Main vo Kar sakta hoon',
		'0fd8b810-237a-4a38-a972-2d26706854ce',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Jo bhi chahiye order karo',
		'1b6c63dd-177f-411e-8f87-bf2b3fe7c927',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'rehene do',
		'e24dd614-0033-4c9c-a72a-475f96dcfca6',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'jaane do',
		'd40c50fd-fd7b-4c47-af68-c85ef6879ac9',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Yennaku avalova Thamil theriyadhu',
		'12536684-0b35-4aff-80cd-f4ce56c866b6',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Rassi jal gayi, bal nahi gaya',
		'b53afc7f-1349-4f28-aafb-3f471009dd97',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Inshallah',
		'f250e23f-0aee-48d8-bb6f-1be22c0df7c7',
		null,
		'ara',
		now() - interval '60 days',
		null,
		null
	),
	(
		'essa bhi kuch hota hai?',
		'7b396c7b-18c4-4e58-97a0-bc4687e67427',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Sirf ek',
		'4c55ff26-b29e-48ce-8b72-0c28cd37d0c9',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Yeh bata de',
		'de1df463-8186-4748-9557-0de18c1a16ef',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Woh bata de',
		'ae43221d-6be8-468c-9af8-71bbab95c1ec',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Kya main boloonga?',
		'ee043244-9de8-4419-aee8-8ba2f3f5edcc',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Kya main bolun?',
		'bbe138a2-1bec-44a0-afb5-679ecc0b2214',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Din, hafta, mahina, sal',
		'f45c7d8a-acbe-42e0-8308-b2207c07eec1',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Du Kapitalistenschweinefrisör',
		'e0eef035-e5bd-45be-902a-62002512673b',
		null,
		'deu',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Tumhe yadh hai?',
		'ffc9e2ca-7c33-4c6f-a64a-9a8d67fe2e30',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Bhul gaya',
		'37dd6e13-d915-4c41-8767-17cdd74beb96',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Entschuldigen Sie mich',
		'288676f6-d224-4cf2-8ab1-abae8076f24b',
		null,
		'deu',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Ich spreche kein Deutsch',
		'7d9a7e8b-4e6c-412d-8adb-7923dff1e04f',
		null,
		'deu',
		now() - interval '60 days',
		null,
		null
	),
	(
		'main ne 200 rupees bola ta',
		'a9b7300d-5599-42f0-b573-8c5a54f0f299',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Yalla',
		'0dd3a1d6-6a2c-4061-b6c0-51f6fb829082',
		null,
		'ara',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Enjoy your meal',
		'95b1a0d4-666f-423d-a2b5-e7f27b5ea65c',
		null,
		'eng',
		now() - interval '60 days',
		null,
		null
	),
	(
		'I''m hungry',
		'674b81c7-eb26-4247-96cb-0c02378ee004',
		null,
		'eng',
		now() - interval '60 days',
		null,
		null
	),
	(
		'I promise',
		'b97d6fed-d12f-4272-b92c-7d8525550207',
		null,
		'eng',
		now() - interval '60 days',
		null,
		null
	),
	(
		'koi na',
		'222e15d2-e94d-4369-912e-89186e222863',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Shari',
		'a3532d81-0870-4e51-927c-59497d348fc9',
		null,
		'mal',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'f83954c3-864d-46c7-a4b8-d996bd5cb517',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'21ed1ee9-af6f-46e1-8f7e-7669b96db0ae',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'c6726b7d-d1b6-4e32-802f-c2352889d1fc',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'a925dd57-384c-44c2-8c8f-67ad05a05819',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'f54f8a2a-dce8-401d-badf-b3d4ab36809f',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'aa9f28b1-3481-40dd-a926-946ed4048f1a',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'469e1199-82e3-46da-8da7-c9ae60efca41',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'24971c85-e336-4af4-821e-74bc6f9c9099',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'1989b6d7-2904-4e4d-88de-a0bc7f0ecaa0',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'asdf',
		'6dacfd10-fb5f-4b48-a21b-43b13b591d03',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'70182dec-e235-4aa5-9364-5d1c7c91fa59',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Adengappa',
		'4677f15a-1cd9-40a3-876c-30662c5eec3f',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Teriya ille',
		'163d7f57-a76f-4e5b-9346-1de5cfeba7d8',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'something',
		'7b915b5e-f8d2-4324-8d40-a2f00212875a',
		null,
		'aar',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Guten abend',
		'2e398135-21f9-4843-a8c7-273c986979c7',
		null,
		'deu',
		now() - interval '60 days',
		null,
		null
	),
	(
		'something test',
		'1b33c04e-016e-4d12-a938-aa4ce8cd7596',
		null,
		'aar',
		now() - interval '60 days',
		null,
		null
	),
	(
		'chitti, periamma',
		'1f6bac22-b32a-4b77-9857-d2de02b538de',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'hallo',
		'76402538-688d-4757-bdd9-c07d09c124dc',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'good luck',
		'7280cf0c-a394-40ee-92f4-0b68f08b16a2',
		null,
		'eng',
		now() - interval '60 days',
		null,
		null
	),
	(
		'good evening',
		'802bbec9-1c6c-49b8-8550-5efb71c39f54',
		null,
		'eng',
		now() - interval '60 days',
		null,
		null
	),
	(
		'It''s bad',
		'a29cea29-acbf-4ef9-bd00-8fab74c30335',
		null,
		'eng',
		now() - interval '60 days',
		null,
		null
	),
	(
		'I''m looking',
		'6eaf6b05-d83f-424b-9269-fd80611ecc4c',
		null,
		'eng',
		now() - interval '60 days',
		null,
		null
	),
	(
		'hello',
		'c545194f-b50f-4a44-bc75-a9f90a3538da',
		null,
		'eng',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Idhar ya udhar?',
		'2b15b306-52f0-4493-bab5-634287a7fb47',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Idhar ya udhar',
		'3d0e57a6-eaf2-4eab-922d-f2055c611418',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'13a8cb15-f575-461a-afe3-bbca427a7c0b',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'5c5c5c0c-324a-42eb-8e06-461ee63c4b5f',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'23fbf5e9-fabe-4da0-9175-0b0f462216af',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'cbcff06c-4a47-449b-a1c3-c37b4443df5b',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'0972c5a6-464a-4193-9f0d-b2fbcf0bd71d',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhar ya udhar',
		'909ae4d6-bd02-46b1-a9f1-93469ea9ea94',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'hindi phrase',
		'7ae6b46c-c7c8-480c-a242-0655a34b6aec',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'laet ja',
		'c8cca0b1-7176-4418-ba82-279e97278a1b',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Maria de illa',
		'c1cc1a36-1b77-41bf-9a05-6e7914d256e2',
		null,
		'kan',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Guten morgen',
		'22d2875f-1164-47a0-9572-e2d19137950d',
		null,
		'deu',
		now() - interval '60 days',
		null,
		null
	),
	(
		'es ist moglich?',
		'24730a53-1b7f-422c-83ab-0cd3a51c2fe3',
		null,
		'deu',
		now() - interval '60 days',
		null,
		null
	),
	(
		'theek hai',
		'bf1cee96-86f2-44e9-97e3-59897dd864ed',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'accha hai',
		'215b33a1-9277-4c19-ae85-788892019566',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'ho gaya',
		'2a710c3c-7f9f-462b-86df-41d08563c809',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'kya hai?',
		'2bf98841-7cde-493c-86b6-a47889303b65',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'khatham ho gaya',
		'2ed5fa12-40d1-4d22-88ee-5e52d373e3aa',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Sab theek?',
		'1a28066b-bfc7-4be8-ac51-87226527820e',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Haina?',
		'c952444c-c89f-4105-8e75-cd5156e6d925',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Main bimar hoon',
		'1269f7f0-d675-4f01-b378-7671b80b1fa7',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'It''s raining',
		'6875a165-77bc-40d4-8430-699f71c3018a',
		null,
		'eng',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Vandu tea kudhi ',
		'b7247f31-3758-47ea-bdf8-1c2a7ff161ed',
		null,
		'kan',
		now() - interval '60 days',
		null,
		null
	),
	(
		'main thaki hui hoon ',
		'1c1aaa6d-f49e-4dca-88a4-b2f417b352a5',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'mujhe bhookh lag rahi hai',
		'788c7250-6ce2-445d-85a0-1d13751d64bd',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'yār, enna, en, eppolutu, enge, eppati',
		'24a18665-a343-4960-99fc-7e5ed54accb0',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'Patthu, iruvathu, mubbathu, naapathu, aimbathu, arupathu, ezhupadhu, enpadhu, Tonoothu, noothu',
		'ed70550e-da8a-44dc-8bfd-69965375b7f9',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'test 1 ',
		'a76bcc62-879a-4da5-95c1-de11d64bac91',
		null,
		'hin',
		now() - interval '60 days',
		null,
		null
	),
	(
		'idhu irukē?',
		'fa26ba78-a7a3-49f8-8516-034424477dec',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'epudi irukē?',
		'c3c81fa4-9c63-4569-b9b6-9c931ee3154f',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'epadi irukeenge?',
		'b2736292-1137-41db-a453-ad203726d8c5',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'epadi irukeenge?',
		'4b7b3741-16ce-4ce8-a9b8-70556451a8e5',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'epadi irukeenge?',
		'ddd650c2-00e9-43f1-8624-5a97282087aa',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'epadi irukeenge?',
		'7aac8e8f-4de1-41a0-b910-a2c9b80e47f9',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'epadi irukeenge',
		'de2ea356-e63d-46f7-8123-2aa9370673ec',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'epadi irukeenge?',
		'a2777e37-b02e-4d8b-9a39-1a9ad56af4f2',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'comment ca va',
		'a875f6e4-a8cc-4f68-baf3-ca2aea273568',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'comment ca va',
		'44bcd224-b4b3-46ce-b260-2136712b0907',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'comment ca va',
		'a00febfd-e6d6-40bc-a3b8-e31563410db8',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'comment ca va',
		'c5c8cf9b-bf1a-4d4a-aff6-21b8dc86fcc9',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'comment ca va',
		'49066ea2-e608-42ab-8817-1f20b0eada03',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'comment ca va',
		'97f2f7cb-a1c5-4bb1-a93b-d475fa96ae68',
		null,
		'tam',
		now() - interval '60 days',
		null,
		null
	),
	(
		'[mujhe] ek cheeseburger chahiye',
		'dd039576-9798-422f-b946-ffe86e0d8324',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'hin',
		now() - interval '2 days',
		null,
		'e0d3a74e-4fe7-43c0-aa35-d05c83929986'
	);

--
-- Data for Name: chat_message; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."chat_message" (
		"id",
		"created_at",
		"sender_uid",
		"recipient_uid",
		"message_type",
		"phrase_id",
		"related_message_id",
		"content",
		"lang",
		"request_id"
	)
values
	(
		'9d88502f-9769-4e2d-86d1-ed948588fbbb',
		now() - interval '48 hours',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'recommendation',
		'4b7b3741-16ce-4ce8-a9b8-70556451a8e5',
		null,
		null,
		'tam',
		null
	),
	(
		'6cdc91b7-a7e6-4e7d-9769-868f16ae7361',
		now() - interval '47 hours',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'request',
		null,
		null,
		null,
		'tam',
		'bc2e2811-1a9b-4131-981d-f2d7d7b26411'
	),
	(
		'628f6f87-02d8-4f34-aeea-34b762bb6911',
		now() - interval '46 hours',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'recommendation',
		'e24dd614-0033-4c9c-a72a-475f96dcfca6',
		null,
		null,
		'hin',
		null
	),
	(
		'ad6409d7-0853-43ba-925d-daaa754de1b4',
		now() - interval '45 hours',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'request',
		null,
		null,
		null,
		'hin',
		'e0d3a74e-4fe7-43c0-aa35-d05c83929986'
	),
	(
		'208016d6-b27b-4c20-a4ed-ca6e9e9972e6',
		now() - interval '44 hours',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'request',
		null,
		null,
		null,
		'hin',
		'e0d3a74e-4fe7-43c0-aa35-d05c83929986'
	);

--
-- Data for Name: friend_request_action; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."friend_request_action" (
		"id",
		"uid_by",
		"uid_for",
		"created_at",
		"action_type",
		"uid_less",
		"uid_more"
	)
values
	(
		'b4ff7858-00c6-4d8e-8dc5-0053b1e23ef7',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		now() - interval '60 days',
		'invite',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'37e51055-991e-4559-b237-930c5e969b31',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		now() - interval '59 days',
		'accept',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'e9902b8c-54b6-4372-b6f6-fe25d499bd72',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		now() - interval '58 days',
		'invite',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
	),
	(
		'c944af50-942e-4522-a000-b2cf19927026',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		now() - interval '57 days',
		'invite',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'7fcadd99-7f75-48eb-b288-320c9ec9d33e',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		now() - interval '56 days',
		'accept',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
	),
	(
		'104f367e-058c-4e50-bfd1-e35827dda31b',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		now() - interval '55 days',
		'accept',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'4a29d11e-29f9-475f-a539-071bcc79f7ff',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		now() - interval '54 days',
		'invite',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'776e2fae-e83b-4fc8-88b9-a16ceb666045',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		now() - interval '53 days',
		'cancel',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'39b369c7-b6cb-4809-be89-60eb623ff5ba',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		now() - interval '52 days',
		'invite',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'23ff23c0-3d51-42bd-a4c9-28b9f00d607c',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		now() - interval '51 days',
		'accept',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'9335fd17-7943-4989-9058-e69671559bf1',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		now() - interval '50 days',
		'accept',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'4abd67bc-9b85-4ebd-b4ec-be7fc0e53e83',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		now() - interval '49 days',
		'accept',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	);

--
-- Data for Name: phrase_relation; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."phrase_relation" ("from_phrase_id", "to_phrase_id", "id", "added_by")
values
	(
		'bb8b9a4c-ddff-470a-86d8-8cd1ac335501',
		'1395ae94-46d9-4a54-92f5-fb8b76db896b',
		'5bc91753-e581-45c4-af60-f08130909167',
		null
	),
	(
		'bca7ad96-44f4-4d58-b5b0-004f4450209a',
		'90108f59-7968-457f-9744-2e3b44e980dd',
		'17ea0978-1fc2-4152-85f2-01ffd8740d75',
		null
	),
	(
		'170f5fd4-58f8-4b05-aba4-23522f35800f',
		'bca7ad96-44f4-4d58-b5b0-004f4450209a',
		'06fdfed9-f08e-41f0-b122-ae9777e2b2a4',
		null
	),
	(
		'90108f59-7968-457f-9744-2e3b44e980dd',
		'170f5fd4-58f8-4b05-aba4-23522f35800f',
		'0927945d-2130-41cc-bfe3-f04d2e6d360c',
		null
	),
	(
		'90108f59-7968-457f-9744-2e3b44e980dd',
		'ded8028a-493f-438f-8b72-316c769a66b9',
		'a92b67bc-7c8c-4a28-9a0c-2a0b6437355b',
		null
	),
	(
		'7e01d5e8-d3ab-4cc1-8e7a-b5861f1742cd',
		'90108f59-7968-457f-9744-2e3b44e980dd',
		'b420e475-0fed-4a43-a557-d3e565437cbb',
		null
	),
	(
		'9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471',
		'5b5cc7ec-702e-4dc1-a568-0dcc660c25bb',
		'686a747d-8a10-4416-94c1-a4e241414031',
		null
	),
	(
		'f6b69f3b-09b9-41a7-a9f2-255da0697015',
		'9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471',
		'85e1d11f-025c-4a16-83b0-dd60fa95fbfa',
		null
	),
	(
		'a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9',
		'9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471',
		'36ab2882-75eb-4f60-b03b-9c7a3fba7815',
		null
	),
	(
		'a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9',
		'5b5cc7ec-702e-4dc1-a568-0dcc660c25bb',
		'717dd2b5-99a1-4898-a2e4-59324bb7cd27',
		null
	),
	(
		'f878e60f-9647-4728-a368-fc8681b0acbb',
		'1395ae94-46d9-4a54-92f5-fb8b76db896b',
		'62d36374-5fce-4273-8a5e-a03565ca886d',
		null
	),
	(
		'1d44afd2-1274-47ec-8107-36bd09861c3d',
		'fdd62764-2438-42bb-af7f-9eb378082899',
		'42941928-f78d-48c5-a0d3-636b7badbfe0',
		null
	),
	(
		'24746d12-8a65-47e7-97c5-87c828585db6',
		'48edc28c-1530-4549-b48c-f678033a6892',
		'dd1cd8a1-d7b8-4590-ac41-51f81186494d',
		null
	),
	(
		'46ed187a-c132-4781-822f-ebb056ddf960',
		'd4b66bd6-52fc-438d-afc5-3d35be9995c2',
		'77c33b91-4d44-4ed0-ad2c-61fd1019900c',
		null
	),
	(
		'48fe0624-f586-4812-a1a5-33c634995671',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		'45b04a26-7a9e-456d-8d4f-fcf8cf8d9557',
		null
	),
	(
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		'48fe0624-f586-4812-a1a5-33c634995671',
		'461612e9-416c-4401-88f9-901c6733d595',
		null
	),
	(
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		'bf1cee96-86f2-44e9-97e3-59897dd864ed',
		'6983bd12-86d3-41d3-a62c-d79603913e41',
		null
	),
	(
		'5f7ce03f-f6a1-48cf-bb59-6265faf2ea98',
		'8133abe3-f908-445a-b8ae-6f01db3c18d7',
		'1c619ab4-ffee-451d-8715-0634bb4d052b',
		null
	),
	(
		'bf1cee96-86f2-44e9-97e3-59897dd864ed',
		'1a28066b-bfc7-4be8-ac51-87226527820e',
		'9c02cebd-3578-43b4-8205-ba893b28a488',
		null
	),
	(
		'bf1cee96-86f2-44e9-97e3-59897dd864ed',
		'215b33a1-9277-4c19-ae85-788892019566',
		'c48d4288-9663-47ad-94cd-2ac71be2d1a4',
		null
	),
	(
		'267acd7c-65f2-4aad-bf5c-58e01c0f69f8',
		'e060237f-1744-427a-8e8e-53da29582d35',
		'07bc1ae3-43f7-41b9-80db-56b94f718785',
		null
	),
	(
		'2a710c3c-7f9f-462b-86df-41d08563c809',
		'2ed5fa12-40d1-4d22-88ee-5e52d373e3aa',
		'2032030b-ed83-417f-8e0f-51b1483efc5d',
		null
	),
	(
		'c3d00086-6d8c-431d-b2a0-df5757457a5e',
		'2a710c3c-7f9f-462b-86df-41d08563c809',
		'27347fc7-fea2-474c-a48d-0e95156a48ee',
		null
	),
	(
		'c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8',
		'cc3847f3-b151-401e-80c9-4aef221c54b5',
		'4c09e735-8e6b-4fce-af89-cdbbecb13fe3',
		null
	),
	(
		'c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8',
		'2bf98841-7cde-493c-86b6-a47889303b65',
		'c461b5fe-f582-4dad-9817-93d20adae8d4',
		null
	),
	(
		'c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8',
		'f6b69f3b-09b9-41a7-a9f2-255da0697015',
		'dd4be05d-1c1d-4594-bd1a-0e033ba3de73',
		null
	),
	(
		'cc3847f3-b151-401e-80c9-4aef221c54b5',
		'2bf98841-7cde-493c-86b6-a47889303b65',
		'07ee8e0b-2f86-471a-8fe2-6b8b9194e0f1',
		null
	),
	(
		'f6b69f3b-09b9-41a7-a9f2-255da0697015',
		'cc3847f3-b151-401e-80c9-4aef221c54b5',
		'd5f5e6d6-2242-4625-9806-448e5ddeb776',
		null
	),
	(
		'f6b69f3b-09b9-41a7-a9f2-255da0697015',
		'2bf98841-7cde-493c-86b6-a47889303b65',
		'14dd1325-1019-4a88-86aa-3ec040c1be23',
		null
	),
	(
		'c3d00086-6d8c-431d-b2a0-df5757457a5e',
		'a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9',
		'b0b4b951-eb67-46bf-a512-c36cc22666a9',
		null
	),
	(
		'2ed5fa12-40d1-4d22-88ee-5e52d373e3aa',
		'c3d00086-6d8c-431d-b2a0-df5757457a5e',
		'15542578-4c24-425c-b440-3f4dda73669f',
		null
	),
	(
		'bca7ad96-44f4-4d58-b5b0-004f4450209a',
		'ded8028a-493f-438f-8b72-316c769a66b9',
		'81def26f-5db6-4fbd-87a4-8e4654f1139e',
		null
	),
	(
		'bca7ad96-44f4-4d58-b5b0-004f4450209a',
		'7b396c7b-18c4-4e58-97a0-bc4687e67427',
		'49cd1858-1387-4a8b-bb5f-e6258b458e6b',
		null
	),
	(
		'1b6c63dd-177f-411e-8f87-bf2b3fe7c927',
		'7b396c7b-18c4-4e58-97a0-bc4687e67427',
		'd29c3648-17ba-4c3f-b84e-152e79219097',
		null
	),
	(
		'de1df463-8186-4748-9557-0de18c1a16ef',
		'ae43221d-6be8-468c-9af8-71bbab95c1ec',
		'289012dd-02c2-44cf-9c38-48d6556d2c39',
		null
	),
	(
		'ee043244-9de8-4419-aee8-8ba2f3f5edcc',
		'bbe138a2-1bec-44a0-afb5-679ecc0b2214',
		'4fafe902-ddb6-41c5-b2fe-c329166a7eff',
		null
	),
	(
		'8133abe3-f908-445a-b8ae-6f01db3c18d7',
		'f45c7d8a-acbe-42e0-8308-b2207c07eec1',
		'97095af8-7267-4f1e-824a-096a918215a0',
		null
	),
	(
		'9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471',
		'fae20b24-42dc-4b9e-aebc-22afcdfc4689',
		'554a726a-cdc1-4318-8479-ddb4f6b73690',
		null
	);

--
-- Data for Name: tag; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."tag" ("id", "created_at", "name", "lang", "added_by")
values
	(
		'11e1d399-1235-4dab-9a7a-f206cbbb99a0',
		now() - interval '29 days',
		'sfdghj',
		'tam',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'8a3d62c6-7f0d-4e96-8d59-b4f1d8d17224',
		now() - interval '29 days',
		'greeting',
		'tam',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'c2ed8619-b85f-4c8b-8395-16cfe4cdeb69',
		now() - interval '29 days',
		'hello',
		'tam',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'9b935ccd-58bd-4c1a-a05a-ff175e26d64d',
		now() - interval '29 days',
		'easy',
		'tam',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	);

--
-- Data for Name: phrase_tag; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."phrase_tag" ("phrase_id", "tag_id", "created_at", "added_by")
values
	(
		'49066ea2-e608-42ab-8817-1f20b0eada03',
		'11e1d399-1235-4dab-9a7a-f206cbbb99a0',
		now() - interval '29 days',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'49066ea2-e608-42ab-8817-1f20b0eada03',
		'8a3d62c6-7f0d-4e96-8d59-b4f1d8d17224',
		now() - interval '29 days',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'49066ea2-e608-42ab-8817-1f20b0eada03',
		'c2ed8619-b85f-4c8b-8395-16cfe4cdeb69',
		now() - interval '29 days',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	),
	(
		'49066ea2-e608-42ab-8817-1f20b0eada03',
		'9b935ccd-58bd-4c1a-a05a-ff175e26d64d',
		now() - interval '29 days',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
	);

--
-- Data for Name: phrase_translation; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."phrase_translation" (
		"text",
		"literal",
		"id",
		"phrase_id",
		"added_by",
		"lang",
		"text_script",
		"created_at"
	)
values
	(
		'Yes',
		null,
		'b40f1592-b292-485e-8c79-01b5223b8b0c',
		'bb8b9a4c-ddff-470a-86d8-8cd1ac335501',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Later',
		null,
		'94b79e23-f63f-4931-a8ba-4742c925c6a9',
		'b9e3edac-de8b-4796-b436-a0cded08d2ae',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'what is your name? (casual)',
		null,
		'21396316-538e-4fbf-8fa2-efc561cb8a7a',
		'fdd62764-2438-42bb-af7f-9eb378082899',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'what did you eat?',
		null,
		'ce47c6b8-134b-47b5-9fc9-9d234375ca64',
		'184170d9-3717-427e-b347-35533ea52a02',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'listen to him/her',
		null,
		'35dfa987-1dbd-47de-9ba5-c9ac4257cacc',
		'ca8af1e7-304a-4aef-a22e-26d9376b6313',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'does it work?',
		null,
		'e587beac-9d4f-409c-8aa2-0eb5e39c15b2',
		'0823546b-d240-4f14-9d51-8dfae5fcddc3',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'let''s go',
		null,
		'536053fc-09d1-4f93-8b43-ffbee2de649d',
		'48edc28c-1530-4549-b48c-f678033a6892',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'shall we go?',
		null,
		'abc1137e-b8d4-4819-b3b1-8e818beb3b8e',
		'24746d12-8a65-47e7-97c5-87c828585db6',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I love you',
		null,
		'e8b4b9ff-0208-4996-ae8d-f7aaa7dd98bd',
		'52851577-c8ba-4254-9c74-6edd310d6971',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I''m coming (presently)',
		null,
		'46dc7f3f-e92c-46d2-9be2-600b6d36a3ac',
		'd4b66bd6-52fc-438d-afc5-3d35be9995c2',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I''m going (presently)',
		null,
		'320e3f85-ca48-4198-b938-4c48c09d4313',
		'46ed187a-c132-4781-822f-ebb056ddf960',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'how are you? (formal)',
		null,
		'b9358716-5516-44f0-804a-dccaeb5e87e7',
		'48fe0624-f586-4812-a1a5-33c634995671',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I''m doing fine',
		null,
		'8fded3bb-e122-4dab-8b4b-0b923832325f',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'hello (formal)',
		null,
		'92efccec-2d3f-4e77-bf65-c7490acbb66c',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'three people',
		null,
		'364938a5-bc8b-40ff-95d0-6ab01a3d8c98',
		'5f7ce03f-f6a1-48cf-bb59-6265faf2ea98',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'one, two, three, four, five, six, seven, eight, nine, ten',
		null,
		'cbc86ddd-1294-4ca6-b303-765d28974771',
		'8133abe3-f908-445a-b8ae-6f01db3c18d7',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'okay',
		null,
		'7939b0cb-8f04-422f-81e3-56c11f5cc4fa',
		'bf1cee96-86f2-44e9-97e3-59897dd864ed',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'it''s good',
		null,
		'c47113cb-3b9c-4558-bdb1-72fb404e2fff',
		'215b33a1-9277-4c19-ae85-788892019566',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'why?',
		null,
		'65ae2ecc-e00a-4a78-813e-871d4fbdcc03',
		'267acd7c-65f2-4aad-bf5c-58e01c0f69f8',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'because',
		null,
		'daeabba1-7556-4629-979b-fa9b1c7dd88f',
		'e060237f-1744-427a-8e8e-53da29582d35',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'done',
		null,
		'fc2b6ce0-f5ae-4f75-8e00-3476da949d71',
		'2a710c3c-7f9f-462b-86df-41d08563c809',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'tell me something else',
		'more something tell me',
		'e8b926a6-2a6d-4089-a32d-39e19bc808f3',
		'ded8028a-493f-438f-8b72-316c769a66b9',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'what is this?',
		null,
		'35eac1f7-8eb9-41b9-a1b1-3da0bebb390f',
		'c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'what''s happening here?',
		null,
		'21cd648b-4f03-4212-8af2-037c916ff950',
		'c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'what''s happening?',
		null,
		'f9c6533a-2d0f-44eb-9f99-d49a6d952aed',
		'cc3847f3-b151-401e-80c9-4aef221c54b5',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'what is it?',
		null,
		'67058d88-7910-4e7b-be7b-b4a29eceb239',
		'2bf98841-7cde-493c-86b6-a47889303b65',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'what is happening?',
		null,
		'81500b34-e00c-4207-87d7-5e8d778f17d6',
		'f6b69f3b-09b9-41a7-a9f2-255da0697015',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'enough / that''s fine',
		null,
		'e17bb3f5-643e-49c2-9eda-1f0625b9635d',
		'7e01d5e8-d3ab-4cc1-8e7a-b5861f1742cd',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'it''s a little sunny out today!',
		null,
		'9d36a465-9f66-45c7-b2f5-39bcc58f94dc',
		'a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9',
		null,
		'hin',
		null,
		now() - interval '60 days'
	),
	(
		'done for today',
		null,
		'9c7cbbd4-053f-41b8-8263-7dc2c7644542',
		'c3d00086-6d8c-431d-b2a0-df5757457a5e',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'it''s all gone / empty',
		'it got over',
		'3af29496-4d83-4ad0-92dc-b7f779318f3c',
		'2ed5fa12-40d1-4d22-88ee-5e52d373e3aa',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'how much?',
		null,
		'f0711d8f-b2be-4822-be9e-5581522c88b4',
		'8167b776-fc93-4e3f-b06e-5fa5818f2d3b',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'combien?',
		null,
		'832d14ac-8469-4ef0-b9eb-fb7d0cb11ad3',
		'8167b776-fc93-4e3f-b06e-5fa5818f2d3b',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'qu''est-ce que tu as mangé?',
		null,
		'69ceef50-847f-4697-adba-6e9b52092d57',
		'184170d9-3717-427e-b347-35533ea52a02',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'everything OK?',
		null,
		'ffa121fb-948d-4e66-927f-f6f56ee964cd',
		'1a28066b-bfc7-4be8-ac51-87226527820e',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'N''est-ce pas?',
		'Isn''t it?',
		'9555f470-9419-4845-a6a2-3d2842031b0a',
		'c952444c-c89f-4105-8e75-cd5156e6d925',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'Écoute',
		null,
		'da61a198-4a5e-48f1-87a1-b5ac1dbb1039',
		'78057374-cf85-4940-91d1-7d04c156abfb',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'It''s cold',
		null,
		'77d9f182-105b-4813-a174-4b4065890e06',
		'57ddf6f6-d655-4fef-832d-b13650b26b82',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I am ill / unwell',
		null,
		'721a5032-5284-44aa-ae05-686a2a437628',
		'1269f7f0-d675-4f01-b378-7671b80b1fa7',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'shush',
		null,
		'04f4e2d9-4854-4eff-a1be-333032a8e6de',
		'80b03361-25d1-434b-8935-4a2a762d2353',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Il pleut',
		null,
		'33ca7093-0d4e-4a56-a991-65c64f9a16f0',
		'6875a165-77bc-40d4-8430-699f71c3018a',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'motherfucker',
		null,
		'29ac950d-0038-4422-b07f-3954b4f86d53',
		'43a760da-65af-400e-b3f0-fbed7a6b338e',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'kya chahiye?',
		null,
		'bb81540c-41c0-414a-8619-3030435b98dd',
		'99d430c1-5cbf-45aa-a95b-993e867ed668',
		null,
		'hin',
		null,
		now() - interval '60 days'
	),
	(
		'Kya',
		null,
		'4b9d819c-00eb-49ab-9e32-fdf93ebda1c6',
		'e9e0cdff-30b0-48fb-9816-285464943466',
		null,
		'hin',
		null,
		now() - interval '60 days'
	),
	(
		'Aapko kidhar jaana hai?',
		null,
		'4afcba0b-cbf6-4ac5-b655-1f34d2b213b9',
		'025301d1-00ef-45da-a1a0-d8382c4e5660',
		null,
		'hin',
		null,
		now() - interval '60 days'
	),
	(
		'Yeh kitne ka hai?',
		null,
		'76eaae1e-2896-47f5-9cf9-dc9469dda69f',
		'3282e79e-3041-4adb-89fc-35d61f2f9eb8',
		null,
		'hin',
		null,
		now() - interval '60 days'
	),
	(
		'What can I do for you?',
		null,
		'c334102b-b5fa-4d3c-be97-66a1ba09c21f',
		'd155ec89-6bd2-411f-877f-51e96513dbc7',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Give one tea',
		null,
		'0bc36882-0f12-428c-a5d3-a9ea05d0f58d',
		'b7247f31-3758-47ea-bdf8-1c2a7ff161ed',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Literal translation: Mother''s ass
Meaning: To be used in a manner in which "Oh shit" or "Oh fuck" is used.',
		null,
		'e6068589-3722-477d-8971-a855e8a2a6f1',
		'7d1461c8-a158-4633-b650-de7f83c7e436',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'random',
		null,
		'18034333-9e44-4248-a9ae-8bb85851304c',
		'bca7ad96-44f4-4d58-b5b0-004f4450209a',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I am tired',
		null,
		'ac99a731-8cca-4908-a255-48d4dcae21ba',
		'1c1aaa6d-f49e-4dca-88a4-b2f417b352a5',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Where are you going?',
		null,
		'9ff9dabb-879a-446e-a9c4-9d6b699cc0fe',
		'83daad8e-f64f-4e8d-81f7-63aedd829c11',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I am getting hungry',
		null,
		'4bd55cf4-f3b1-41ed-97a9-adca41183fcc',
		'788c7250-6ce2-445d-85a0-1d13751d64bd',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I know',
		null,
		'2965151f-61ec-4fbc-8e73-cdecf107debf',
		'903817a7-168a-4b99-87a1-79b3e3e14d84',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Je sais',
		null,
		'a7825012-4883-46b1-b5d6-b443f1a64628',
		'903817a7-168a-4b99-87a1-79b3e3e14d84',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'We will ask',
		null,
		'38ef56dd-ec97-4397-b4a7-75c54a14c485',
		'ee0fb561-8e07-413b-ac5c-65ec7041c17d',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I can''t eat any more',
		null,
		'40292dd7-9699-4d81-91d9-9f3873262d64',
		'1174699b-deac-480a-94af-555018da33fb',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Je ne peux plus manger',
		null,
		'49bc1d8c-547e-4ab5-8b74-1ba5efc92374',
		'1174699b-deac-480a-94af-555018da33fb',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'A clingy, solicitous, creepy guy',
		null,
		'6406dab7-35d7-4e3c-8998-0f193da2feb2',
		'14fd9a81-be8c-44b2-a8f7-8a2bf5c9c8e6',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Lots of fun was had yesterday',
		null,
		'6ee003e6-e055-4693-9264-ab7b81cd592c',
		'f7454ec3-5673-4858-a2f9-65925083ecbf',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Yesterday it was lots of fun',
		null,
		'342bca78-c144-4168-ac20-ed22b12e2f92',
		'f7454ec3-5673-4858-a2f9-65925083ecbf',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I can do that',
		null,
		'bb632a64-a914-4936-bbb8-d953e986fba4',
		'0fd8b810-237a-4a38-a972-2d26706854ce',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'hello',
		null,
		'3079ae53-a8b7-4691-8496-2e3c509cbd39',
		'76402538-688d-4757-bdd9-c07d09c124dc',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I told you 200 rupees',
		null,
		'd8258697-9c40-4f11-88a6-5635ebe5cfc8',
		'a9b7300d-5599-42f0-b573-8c5a54f0f299',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Bon appetit',
		null,
		'76e7af16-2ca9-4e61-8221-b723fc08e3e4',
		'95b1a0d4-666f-423d-a2b5-e7f27b5ea65c',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'bon soir',
		null,
		'7637e9c5-e669-4c52-8361-e3eecb383ccd',
		'802bbec9-1c6c-49b8-8550-5efb71c39f54',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'Je regards',
		null,
		'592627b7-0a0f-4c53-812c-23b4d5a70d6f',
		'6eaf6b05-d83f-424b-9269-fd80611ecc4c',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'Okay',
		null,
		'dc76c757-5223-4329-be60-5bed821798af',
		'a3532d81-0870-4e51-927c-59497d348fc9',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'here or there',
		null,
		'8e726206-8356-4092-8ef3-0bfd61f093a5',
		'1989b6d7-2904-4e4d-88de-a0bc7f0ecaa0',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'here or there',
		null,
		'd856c779-7bf4-45bf-8462-2aa38be315b8',
		'0972c5a6-464a-4193-9f0d-b2fbcf0bd71d',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'asdf',
		null,
		'cb6dbd6b-621d-4381-8373-3d13f2c1fdcb',
		'6dacfd10-fb5f-4b48-a21b-43b13b591d03',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Woah cool!',
		null,
		'db70ab10-1370-473e-85b6-f0bc8c57ce7d',
		'4677f15a-1cd9-40a3-876c-30662c5eec3f',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Don''t you have any honor?',
		null,
		'2ec0720e-6f0a-451e-bced-0a02dabf8aca',
		'c1cc1a36-1b77-41bf-9a05-6e7914d256e2',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'SOMETHING ELSE',
		null,
		'3e7b6b35-9b5e-4fb5-9575-5765241521a1',
		'7b915b5e-f8d2-4324-8d40-a2f00212875a',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'test something',
		null,
		'69339bc5-42e5-4327-9af6-c4ec1b2b600d',
		'1b33c04e-016e-4d12-a938-aa4ce8cd7596',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'idk',
		null,
		'25528686-db63-406e-8866-f2c12fb0c216',
		'163d7f57-a76f-4e5b-9346-1de5cfeba7d8',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'thanks',
		null,
		'347591a8-eb2a-4a1d-8e7b-8fc205ec9045',
		'bca7ad96-44f4-4d58-b5b0-004f4450209a',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'nothing',
		null,
		'16d1c7d3-a982-4d83-9514-dc3899791990',
		'170f5fd4-58f8-4b05-aba4-23522f35800f',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'anything else?',
		null,
		'6b9070ba-f799-48c4-b5cb-ff35015a174a',
		'90108f59-7968-457f-9744-2e3b44e980dd',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'it''s raining (currently)',
		null,
		'f2f668b7-79f4-447a-aa64-a04314920527',
		'9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'it''s not raining',
		null,
		'1b5bb3e8-4a2b-4f1a-971f-15ec6564a14f',
		'5b5cc7ec-702e-4dc1-a568-0dcc660c25bb',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'no',
		null,
		'a8f1054e-839c-4fec-b99b-cf84f21b5f03',
		'f878e60f-9647-4728-a368-fc8681b0acbb',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'yes',
		null,
		'748fe4d8-dff8-400a-8185-966a13349698',
		'1395ae94-46d9-4a54-92f5-fb8b76db896b',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'turn left at the signal',
		null,
		'f680cf5c-62af-4396-b588-9addf033dbe8',
		'4d3207d1-a0bf-4504-831e-bfadb834d315',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'what''s going on?',
		null,
		'b42e8cb4-e887-451c-95e3-5788a4c06cce',
		'fae20b24-42dc-4b9e-aebc-22afcdfc4689',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'what''s your name? (formal)',
		null,
		'7f2efa16-19e6-4ee5-bd12-c33d975db3c0',
		'1d44afd2-1274-47ec-8107-36bd09861c3d',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Hurry up / let''s go',
		null,
		'816036fc-ba5f-436b-9f05-76eff32d56a7',
		'0dd3a1d6-6a2c-4061-b6c0-51f6fb829082',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'J''ai faim',
		null,
		'15cf21ae-c5dd-45b9-a545-c6b80ceace30',
		'674b81c7-eb26-4247-96cb-0c02378ee004',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'Je te promet',
		null,
		'b28253e0-475b-4b9a-937a-a33affde75ce',
		'b97d6fed-d12f-4272-b92c-7d8525550207',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'C''est mal',
		null,
		'00cc153f-2f0a-4ac6-b504-e6f3c9b6a0d0',
		'a29cea29-acbf-4ef9-bd00-8fab74c30335',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'bonjour',
		null,
		'186fb585-3f29-4bd0-9f2b-5aa891dc8a39',
		'c545194f-b50f-4a44-bc75-a9f90a3538da',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'don''t worry (slang)',
		null,
		'82f70893-ed01-458d-9362-e3e48e6bbde0',
		'222e15d2-e94d-4369-912e-89186e222863',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'here or ethere',
		null,
		'2ecb1d4b-3f0c-43d8-bc29-d6fe209439f0',
		'70182dec-e235-4aa5-9364-5d1c7c91fa59',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'go lie down',
		null,
		'859cee3d-01b2-4fd7-b617-0122dfde3baa',
		'c8cca0b1-7176-4418-ba82-279e97278a1b',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'is it possible?',
		null,
		'93be8de2-ed9e-4625-86f9-3fbe93a3e18f',
		'24730a53-1b7f-422c-83ab-0cd3a51c2fe3',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'who, what, why, when, where, how',
		null,
		'5b2f3323-e201-42c9-ac9a-fbf1e2e4bb83',
		'24a18665-a343-4960-99fc-7e5ed54accb0',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'one, two, three, four, five, six, seven, eight, nine, ten',
		null,
		'2da0ebd1-3208-49c3-b811-739d6a37976b',
		'295fbba3-892c-43f9-84ba-85cf15fd28a5',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'here or there?',
		null,
		'049f2c58-cd5c-4059-913e-42f5a388a80a',
		'2b15b306-52f0-4493-bab5-634287a7fb47',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'seldom
',
		null,
		'35cacbea-8357-4680-83ef-035dbad7f03e',
		'222e15d2-e94d-4369-912e-89186e222863',
		null,
		'aar',
		null,
		now() - interval '60 days'
	),
	(
		'test',
		null,
		'87a7562c-d441-4453-b8e2-46a34fbb8897',
		'2fbae84f-5b1d-43c2-8927-ef4d41c7e794',
		null,
		'ben',
		null,
		now() - interval '60 days'
	),
	(
		'test',
		null,
		'28eed032-9c30-4c82-8af0-c82605b02db5',
		'a8fbdb84-24bf-456e-836c-b355355caa45',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Order whatever you want',
		null,
		'9636df03-4f07-4b6b-bfc4-6ed64e735ad7',
		'1b6c63dd-177f-411e-8f87-bf2b3fe7c927',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Idziemy',
		null,
		'83989c7a-43e5-4998-a169-2360570a8f60',
		'24746d12-8a65-47e7-97c5-87c828585db6',
		null,
		'pol',
		null,
		now() - interval '60 days'
	),
	(
		'let it be',
		null,
		'f3107fdb-f6c3-4fa7-9f72-4c445cecfc67',
		'e24dd614-0033-4c9c-a72a-475f96dcfca6',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'let it go',
		null,
		'b372ce01-adf1-4645-af67-27e2344f8d01',
		'd40c50fd-fd7b-4c47-af68-c85ef6879ac9',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I don''t know much Tamil',
		null,
		'c7c30719-ec21-4010-8ee4-a9308a861e1c',
		'12536684-0b35-4aff-80cd-f4ce56c866b6',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Je ne parle pas beaucoup de Tamil',
		null,
		'38e042a3-7bc7-4c0e-a034-c44d340a7355',
		'12536684-0b35-4aff-80cd-f4ce56c866b6',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'The rope has burned down, but the strength has not gone',
		null,
		'20acc9e2-6612-4a65-80ec-94964fa04676',
		'b53afc7f-1349-4f28-aafb-3f471009dd97',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'God willing',
		null,
		'054fae81-8e0c-42c3-a662-76d36cfe2052',
		'f250e23f-0aee-48d8-bb6f-1be22c0df7c7',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'is there anything else quite like this?',
		null,
		'3abeabf7-4ac6-49f5-97ae-d29b7884e524',
		'7b396c7b-18c4-4e58-97a0-bc4687e67427',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Je parle un peu de Konkani',
		null,
		'149899b5-7f76-44d4-8f21-69d4a3dfc061',
		'a417afc8-6c80-4589-a314-55ac756b28f1',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'I speak a little Konkani',
		null,
		'8b0144ea-a8ca-4e76-af0b-eae6ec6eeee5',
		'a417afc8-6c80-4589-a314-55ac756b28f1',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Only one',
		null,
		'5af5e7a9-38db-40c8-90a5-0184843a16c6',
		'4c55ff26-b29e-48ce-8b72-0c28cd37d0c9',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'How much',
		null,
		'e6dd474d-ee0e-4082-9aa2-34c0b9a25c33',
		'd9da12a0-18f3-4836-af4b-8ea9423848ca',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Combien',
		null,
		'1824c57a-c16d-40e1-b489-35f465723fd2',
		'd9da12a0-18f3-4836-af4b-8ea9423848ca',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'Kitna',
		null,
		'c3a18806-78fc-4903-909f-e93842861278',
		'd9da12a0-18f3-4836-af4b-8ea9423848ca',
		null,
		'hin',
		null,
		now() - interval '60 days'
	),
	(
		'Tell me this',
		null,
		'e102d4f0-e44c-40f8-8b47-cd75efb5aa5f',
		'de1df463-8186-4748-9557-0de18c1a16ef',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Tell me that',
		null,
		'de9fb404-8f20-48d2-9639-6fc41a5e9d5e',
		'ae43221d-6be8-468c-9af8-71bbab95c1ec',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'What will I say?',
		null,
		'a439af80-b7bf-4a7c-b6c6-c36b7c0892b0',
		'ee043244-9de8-4419-aee8-8ba2f3f5edcc',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'What do I say?',
		null,
		'08234f41-57c9-4705-9159-f5a76ea85720',
		'bbe138a2-1bec-44a0-afb5-679ecc0b2214',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Thank you',
		null,
		'5b219133-906c-4167-a0e8-980363e989ed',
		'5b714f21-94e2-4345-88ca-7ea25a5bf988',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Merci',
		null,
		'9c9f9b2c-b264-4667-a190-998130570523',
		'5b714f21-94e2-4345-88ca-7ea25a5bf988',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'How much (baht)? ',
		null,
		'46bdf4fa-b11c-41e4-8d4d-5fe077494e4e',
		'd546b14b-0bdf-48fa-9f55-0fa3ac1f3af7',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Thank you',
		null,
		'5cdfea65-27fb-4dbd-a138-c501ed67d4b4',
		'faae3442-2957-431d-b055-e8910b3c26ad',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Day, week, month, year',
		null,
		'aa2980a0-1c3c-4a5c-b471-b19adf3aaf37',
		'f45c7d8a-acbe-42e0-8308-b2207c07eec1',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Il ne pleut pas',
		null,
		'9fce1e24-ba42-4c26-8cdd-d4913a6cba28',
		'5b5cc7ec-702e-4dc1-a568-0dcc660c25bb',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'I don''t know what',
		null,
		'd5b6d5bc-8ec0-41c0-b102-8df73ec812c7',
		'de2f5e51-876d-4978-8a12-6146ece9202c',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Mujhe nahi pata',
		null,
		'9f3cff65-c6c8-496d-b060-431d6425ddf5',
		'de2f5e51-876d-4978-8a12-6146ece9202c',
		null,
		'hin',
		null,
		now() - interval '60 days'
	),
	(
		'Rien',
		null,
		'11cc05ee-4109-4a55-9def-13a5964c5e64',
		'bca7ad96-44f4-4d58-b5b0-004f4450209a',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'Let''s go',
		null,
		'0ce11cee-4687-4b06-b807-ec76d7728fb4',
		'fd535752-d602-4ab8-8656-9e11692f30fc',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'You hairdresser of capitalist pigs',
		null,
		'ea0cd14f-0add-4c66-a1b3-981159de43e9',
		'e0eef035-e5bd-45be-902a-62002512673b',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Sir are you coming to the map location?',
		null,
		'4ec5190e-8639-47a5-84e9-62b26580996f',
		'235ce61c-be21-4697-815d-d5aa1a4ff121',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Tu te rappelles?',
		null,
		'c2338647-30c8-4b3e-9ace-01a4ab35bdc5',
		'ffc9e2ca-7c33-4c6f-a64a-9a8d67fe2e30',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'J''ai oublié',
		null,
		'e9dbb869-dafd-4030-b67b-453f339e37b7',
		'37dd6e13-d915-4c41-8767-17cdd74beb96',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'I forgot',
		null,
		'4e2f31cc-c439-4f4e-b942-c37a42873fa6',
		'37dd6e13-d915-4c41-8767-17cdd74beb96',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Excuse me',
		null,
		'd52f6dd3-0e2e-4b82-85b8-5ca0b0a20199',
		'288676f6-d224-4cf2-8ab1-abae8076f24b',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Je ne parle pas Allemande',
		null,
		'072226ab-81ca-4640-8e07-a2361bd395c4',
		'7d9a7e8b-4e6c-412d-8adb-7923dff1e04f',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'I don''t speak German',
		null,
		'c2a37f9f-e9f7-4561-bff7-42b00f539586',
		'7d9a7e8b-4e6c-412d-8adb-7923dff1e04f',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'bon chance',
		null,
		'd001d4d4-be73-4150-9f09-4079a3b0125e',
		'7280cf0c-a394-40ee-92f4-0b68f08b16a2',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'Ici ou la bas?',
		null,
		'd9dfc6d5-5d9f-477e-935e-eadb2dcc09ee',
		'2b15b306-52f0-4493-bab5-634287a7fb47',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'here or there',
		null,
		'eeff2bad-6934-4a97-99bc-d2de27b38409',
		'909ae4d6-bd02-46b1-a9f1-93469ea9ea94',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'hindi translation',
		null,
		'83137d4f-a4fd-4535-bbd5-c494ae6fc448',
		'7ae6b46c-c7c8-480c-a242-0655a34b6aec',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'I don''t know',
		null,
		'7714b290-9cf9-4430-9af4-70c7ded6b746',
		'163d7f57-a76f-4e5b-9346-1de5cfeba7d8',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Good evening',
		null,
		'7caea27f-4ce9-4ef7-a2df-f1ab04f93a8b',
		'2e398135-21f9-4843-a8c7-273c986979c7',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Good morning',
		null,
		'75f21f65-6eec-47f3-ac17-1f0d1ebfd05b',
		'22d2875f-1164-47a0-9572-e2d19137950d',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'younger aunt, older aunt (for mom''s side)',
		null,
		'17cf77b8-4963-4264-8b1d-6e03095b9e58',
		'1f6bac22-b32a-4b77-9857-d2de02b538de',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'which one, this, that, those',
		null,
		'4a5a9cf8-2d68-488e-8102-f3127b351017',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'Ten, twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred',
		null,
		'9d9807d8-375d-4991-b0c9-d907eea3214a',
		'ed70550e-da8a-44dc-8bfd-69965375b7f9',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'idk ',
		null,
		'51479d8b-7ee7-4abf-9926-48d9487202ed',
		'163d7f57-a76f-4e5b-9346-1de5cfeba7d8',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'pourquois?',
		null,
		'c8d1ce25-ef8d-435f-a91f-3529205ae3de',
		'e060237f-1744-427a-8e8e-53da29582d35',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'Hallo (sarcastic)',
		null,
		'97f845d8-7937-408c-98b7-95401af9e890',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'test',
		null,
		'7662ae6d-0729-4d44-8a32-33f4a2f4fc39',
		'9e2fef5c-d144-4ea9-9b31-0bd4cefb7ee8',
		null,
		'ben',
		null,
		now() - interval '60 days'
	),
	(
		'test',
		null,
		'5707df67-252d-459b-a341-ab43b0b86179',
		'7f412edd-af7c-486e-a35f-3b2a7803efc9',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'test 1',
		null,
		'dd5e98f2-0500-407c-a855-44e6c53ff19a',
		'a76bcc62-879a-4da5-95c1-de11d64bac91',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'chalo',
		null,
		'6e4d652c-86c7-40c1-9ede-2964fd1ef688',
		'4677f15a-1cd9-40a3-876c-30662c5eec3f',
		null,
		'hin',
		null,
		now() - interval '60 days'
	),
	(
		'oi',
		null,
		'dfdfeea3-e935-4e5b-aaa8-02f58feefba7',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'df',
		null,
		'8e3bcbe3-536e-4f38-bd0e-e8d5626e4dba',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'mk',
		null,
		'2d3fdc88-e64e-4a33-ae2d-de4758bc5ebd',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		null,
		'afr',
		null,
		now() - interval '60 days'
	),
	(
		'je ne sais pas',
		null,
		'6c481733-c4fd-49df-887f-fe7540acc1f2',
		'163d7f57-a76f-4e5b-9346-1de5cfeba7d8',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'are you there?',
		null,
		'a17c507b-3d8e-4ea6-a2f8-a57761bfdee9',
		'fa26ba78-a7a3-49f8-8516-034424477dec',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'how are you?',
		null,
		'470a1169-b4fd-4c1f-b045-e5f928261de7',
		'c3c81fa4-9c63-4569-b9b6-9c931ee3154f',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'how are you? (formal)',
		null,
		'97364166-6850-43c6-ae23-f2f72856d207',
		'b2736292-1137-41db-a453-ad203726d8c5',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'comment ca va?',
		null,
		'9087b4da-be10-4558-8077-58503d11e073',
		'4b7b3741-16ce-4ce8-a9b8-70556451a8e5',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'was ist (wrong)',
		null,
		'a5a49d22-0ba5-4dc4-8e56-e4728fb46792',
		'ddd650c2-00e9-43f1-8624-5a97282087aa',
		null,
		'deu',
		null,
		now() - interval '60 days'
	),
	(
		'was ist (wrong)',
		null,
		'e3addd1d-1753-432a-a292-fa72155415f2',
		'7aac8e8f-4de1-41a0-b910-a2c9b80e47f9',
		null,
		'deu',
		null,
		now() - interval '60 days'
	),
	(
		'idk sorry (wrong)',
		null,
		'd832c5ff-df25-4ef1-aea7-f8715c7a7806',
		'de2ea356-e63d-46f7-8123-2aa9370673ec',
		null,
		'eus',
		null,
		now() - interval '60 days'
	),
	(
		'wrong translation',
		null,
		'2ba4ddc9-54da-4039-8c6e-09c963cea063',
		'a2777e37-b02e-4d8b-9a39-1a9ad56af4f2',
		null,
		'arg',
		null,
		now() - interval '60 days'
	),
	(
		'(wrong)',
		null,
		'2fcb0720-0fa5-4d26-a1ae-96a95aa656a6',
		'a875f6e4-a8cc-4f68-baf3-ca2aea273568',
		null,
		'fra',
		null,
		now() - interval '60 days'
	),
	(
		'how are ',
		null,
		'93e40296-23be-45d9-afcd-8c4339ca376c',
		'44bcd224-b4b3-46ce-b260-2136712b0907',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'how are you ',
		null,
		'0c708924-8308-4373-a47d-1a804d4854d0',
		'a00febfd-e6d6-40bc-a3b8-e31563410db8',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'how are oyu',
		null,
		'fcff4504-6e57-4b47-a35f-3cd62131a36a',
		'c5c8cf9b-bf1a-4d4a-aff6-21b8dc86fcc9',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'how are oyu',
		null,
		'101debe9-9e68-40ec-b69e-4af9a5b1e7a8',
		'49066ea2-e608-42ab-8817-1f20b0eada03',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'how you',
		null,
		'38f195d1-a882-4bef-84c3-a2e4739e1ad2',
		'97f2f7cb-a1c5-4bb1-a93b-d475fa96ae68',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'idk wdm',
		null,
		'db19febd-3aab-4fd6-950d-f8ac50b4a288',
		'4677f15a-1cd9-40a3-876c-30662c5eec3f',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'idk',
		null,
		'45da727a-0b5c-4aec-b456-3f8b9747f1b8',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		null,
		'eng',
		null,
		now() - interval '60 days'
	),
	(
		'est-ce que ça marche?',
		null,
		'023c359b-faa7-4240-8ce8-e046dc8e647d',
		'0823546b-d240-4f14-9d51-8dfae5fcddc3',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		null,
		now() - interval '15 days'
	),
	(
		'I want one cheeseburger',
		null,
		'80fc1f0c-e59e-4678-8988-e8d98482f971',
		'dd039576-9798-422f-b946-ffe86e0d8324',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'eng',
		null,
		now() - interval '2 days'
	),
	(
		'Je voudrais un cheeseburger',
		null,
		'642e0bc5-9d2d-4f63-bdfd-4f27138d6eb2',
		'dd039576-9798-422f-b946-ffe86e0d8324',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fra',
		null,
		now() - interval '2 days'
	);

--
-- Data for Name: user_deck; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."user_deck" (
		"id",
		"uid",
		"lang",
		"created_at",
		"learning_goal",
		"archived",
		"daily_review_goal"
	)
values
	(
		'dfa6cb07-5f8a-43d8-bc9f-5a9f474719c4',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aka',
		now() - interval '30 days',
		'moving',
		true,
		15
	),
	(
		'e0b23bba-fe8c-4dfb-bdd6-65b2c60644f0',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'tam',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'02be6d52-2f23-498d-ab24-a7cc0975c075',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'hin',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'8b73b2e9-8e32-4f9e-8044-67486e5e0399',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'mya',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'05000e6e-9b26-4632-b971-0df96a35c2bc',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fra',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'7df47220-4003-43ad-99ba-0e9de75ace0b',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'ibo',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'c7053b11-4f34-4153-ad5a-9278d452949c',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'tam',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'e9259fbf-a94f-48f9-b8e6-5edfefc9c878',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'hin',
		now() - interval '30 days',
		'moving',
		false,
		15
	);

--
-- Data for Name: user_card; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."user_card" (
		"uid",
		"id",
		"phrase_id",
		"updated_at",
		"created_at",
		"status",
		"lang"
	)
values
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'0e379159-9bc3-4781-ab61-4d4c96f472b0',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		now() - interval '27 days',
		now() - interval '27 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'1e78e62a-f20c-4532-b326-16027ccf1064',
		'295fbba3-892c-43f9-84ba-85cf15fd28a5',
		now() - interval '27 days',
		now() - interval '27 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'ec8836e2-d1a7-4c44-ad30-0ba16f1903bf',
		'fd535752-d602-4ab8-8656-9e11692f30fc',
		now() - interval '27 days',
		now() - interval '27 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'9096824e-4aee-49d7-9d18-ca14a89127c2',
		'12536684-0b35-4aff-80cd-f4ce56c866b6',
		now() - interval '27 days',
		now() - interval '27 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'3e26c6bd-37af-45c4-ac37-d0e9c0ee99de',
		'235ce61c-be21-4697-815d-d5aa1a4ff121',
		now() - interval '27 days',
		now() - interval '27 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'5d01f16c-d980-4aee-85f7-06acb124977d',
		'9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471',
		now() - interval '26 days',
		now() - interval '26 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'326afe26-b402-4f99-8d00-70825108d3ea',
		'90108f59-7968-457f-9744-2e3b44e980dd',
		now() - interval '26 days',
		now() - interval '26 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'b211a041-abbc-4beb-a886-25042d053351',
		'170f5fd4-58f8-4b05-aba4-23522f35800f',
		now() - interval '26 days',
		now() - interval '26 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'3645d9ae-ac1d-42b9-9c5a-30b9df195912',
		'f1f5234e-0426-44f5-a007-b67329a70a81',
		now() - interval '25 days',
		now() - interval '25 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'df82c504-993d-4fe0-b363-edad3b9cc50a',
		'5b5cc7ec-702e-4dc1-a568-0dcc660c25bb',
		now() - interval '25 days',
		now() - interval '25 days',
		'learned',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'4396f3d7-4d63-41ae-bae1-dfa57862f9b5',
		'1395ae94-46d9-4a54-92f5-fb8b76db896b',
		now() - interval '25 days',
		now() - interval '25 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'9df1baf5-e5d6-46b7-bfcc-33c7c593ef53',
		'ded8028a-493f-438f-8b72-316c769a66b9',
		now() - interval '24 days',
		now() - interval '24 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'2867c983-4698-46f7-94fc-19e3384c40eb',
		'ed70550e-da8a-44dc-8bfd-69965375b7f9',
		now() - interval '24 days',
		now() - interval '24 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'1bcaf19a-3596-4723-9fab-14d2fe97e3df',
		'24a18665-a343-4960-99fc-7e5ed54accb0',
		now() - interval '23 days',
		now() - interval '23 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'bdb20ec0-11d9-4f11-aea8-5b1f434f5193',
		'1f6bac22-b32a-4b77-9857-d2de02b538de',
		now() - interval '23 days',
		now() - interval '23 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'd71741f6-2e9d-4c09-b685-ddb369a1f574',
		'163d7f57-a76f-4e5b-9346-1de5cfeba7d8',
		now() - interval '23 days',
		now() - interval '23 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'374c8a92-0bf4-4a45-821d-a3c1dbc92474',
		'b2736292-1137-41db-a453-ad203726d8c5',
		now() - interval '20 days',
		now() - interval '20 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'2ec6d4be-6e08-48e2-9be4-d452b96fd795',
		'c3c81fa4-9c63-4569-b9b6-9c931ee3154f',
		now() - interval '20 days',
		now() - interval '20 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'2bd796a6-9c74-420d-b00c-72acb6e8aedd',
		'fa26ba78-a7a3-49f8-8516-034424477dec',
		now() - interval '20 days',
		now() - interval '20 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'91edd7d5-932c-4963-b03b-48832138041c',
		'4677f15a-1cd9-40a3-876c-30662c5eec3f',
		now() - interval '19 days',
		now() - interval '19 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'd9eadce9-e576-4e7b-a0dc-f2fb947a30df',
		'f6b69f3b-09b9-41a7-a9f2-255da0697015',
		now() - interval '18 days',
		now() - interval '18 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'4f0674aa-b14e-4807-89d4-25dd23116e89',
		'8167b776-fc93-4e3f-b06e-5fa5818f2d3b',
		now() - interval '18 days',
		now() - interval '18 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'375b9dbd-6c83-4f25-b960-f97b12844301',
		'43a760da-65af-400e-b3f0-fbed7a6b338e',
		now() - interval '17 days',
		now() - interval '17 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'6b711281-c2d0-464d-b99a-bea57d73e4f8',
		'0823546b-d240-4f14-9d51-8dfae5fcddc3',
		now() - interval '17 days',
		now() - interval '17 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'76de47db-2383-48d1-9da1-5bef74a3c23a',
		'a2777e37-b02e-4d8b-9a39-1a9ad56af4f2',
		now() - interval '17 days',
		now() - interval '17 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'e7cdf0dd-31ba-4181-8295-46e831f52e8e',
		'a875f6e4-a8cc-4f68-baf3-ca2aea273568',
		now() - interval '17 days',
		now() - interval '17 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'e61e7352-bc64-4971-aba7-9eee832751c2',
		'ddd650c2-00e9-43f1-8624-5a97282087aa',
		now() - interval '16 days',
		now() - interval '16 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'08d46d01-2be4-4e8c-9117-9f446722033f',
		'7aac8e8f-4de1-41a0-b910-a2c9b80e47f9',
		now() - interval '16 days',
		now() - interval '16 days',
		'active',
		'tam'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'2384890a-0cbd-41b3-a584-e838968a7ab6',
		'ffc9e2ca-7c33-4c6f-a64a-9a8d67fe2e30',
		now() - interval '15 days',
		now() - interval '15 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'6cf926f6-7e59-4781-9d70-f2dcbad32ddf',
		'fdd62764-2438-42bb-af7f-9eb378082899',
		now() - interval '15 days',
		now() - interval '15 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'1ca79915-0355-4b49-9c20-bea40dec1fee',
		'fae20b24-42dc-4b9e-aebc-22afcdfc4689',
		now() - interval '14 days',
		now() - interval '14 days',
		'active',
		'hin'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'917f667f-686d-4d29-9619-4f80bdd8f462',
		'f878e60f-9647-4728-a368-fc8681b0acbb',
		now() - interval '14 days',
		now() - interval '14 days',
		'active',
		'hin'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'f7c8afa2-1c9c-4c01-bca5-ad36f0404361',
		'fd535752-d602-4ab8-8656-9e11692f30fc',
		now() - interval '14 days',
		now() - interval '14 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'67e205eb-92e0-4a21-bba4-ea042939f96f',
		'fa26ba78-a7a3-49f8-8516-034424477dec',
		now() - interval '13 days',
		now() - interval '13 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'd9122d48-bdb7-4051-a664-41cfb40c97e6',
		'163d7f57-a76f-4e5b-9346-1de5cfeba7d8',
		now() - interval '13 days',
		now() - interval '13 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'9ee86f88-2592-40d0-b20a-a131bf25e9f0',
		'c3c81fa4-9c63-4569-b9b6-9c931ee3154f',
		now() - interval '13 days',
		now() - interval '13 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'67273551-7e60-45d5-a1f6-942204572189',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		now() - interval '12 days',
		now() - interval '12 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'c6b56b0b-b7f5-46a5-858b-23afbe541147',
		'ed70550e-da8a-44dc-8bfd-69965375b7f9',
		now() - interval '12 days',
		now() - interval '12 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'16f9635e-1ab4-485c-ac63-74fe75ec26af',
		'c5c8cf9b-bf1a-4d4a-aff6-21b8dc86fcc9',
		now() - interval '12 days',
		now() - interval '12 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'8e00d18c-69e0-4904-a215-1c78bc6489a8',
		'b2736292-1137-41db-a453-ad203726d8c5',
		now() - interval '12 days',
		now() - interval '12 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'd144c388-d91a-4fa2-b6d4-1b75f883fdcf',
		'a875f6e4-a8cc-4f68-baf3-ca2aea273568',
		now() - interval '11 days',
		now() - interval '11 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'022d6520-f0e7-4e18-850f-17cbaa69c955',
		'a00febfd-e6d6-40bc-a3b8-e31563410db8',
		now() - interval '11 days',
		now() - interval '11 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'9f3043a9-76cb-42e1-8be1-a9a8c4e9a7cf',
		'97f2f7cb-a1c5-4bb1-a93b-d475fa96ae68',
		now() - interval '11 days',
		now() - interval '11 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'cf931635-9ee9-4c0d-8121-2e45f689f070',
		'4b7b3741-16ce-4ce8-a9b8-70556451a8e5',
		now() - interval '11 days',
		now() - interval '11 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'36f4a25e-9c83-4097-92f8-eedcd257dc6e',
		'49066ea2-e608-42ab-8817-1f20b0eada03',
		now() - interval '10 days',
		now() - interval '10 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'dcb85422-64a0-4259-8045-f762dec33eb2',
		'4677f15a-1cd9-40a3-876c-30662c5eec3f',
		now() - interval '10 days',
		now() - interval '10 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'50268ee8-93d7-432e-81f6-757707c062a7',
		'44bcd224-b4b3-46ce-b260-2136712b0907',
		now() - interval '10 days',
		now() - interval '10 days',
		'active',
		'tam'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'b52272b7-0f3d-46d6-b28f-917ee538a829',
		'dd039576-9798-422f-b946-ffe86e0d8324',
		now() - interval '10 days',
		now() - interval '10 days',
		'active',
		'hin'
	);

--
-- Data for Name: user_deck_review_state; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."user_deck_review_state" ("lang", "uid", "day_session", "created_at", "manifest")
values
	(
		'hin',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		(current_date - 4 + interval '30 minute' - interval '4 hour')::date,
		current_date - 4 + interval '30 minute',
		'["9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471", "1395ae94-46d9-4a54-92f5-fb8b76db896b", "43a760da-65af-400e-b3f0-fbed7a6b338e", "0823546b-d240-4f14-9d51-8dfae5fcddc3", "f1f5234e-0426-44f5-a007-b67329a70a81", "8167b776-fc93-4e3f-b06e-5fa5818f2d3b", "ded8028a-493f-438f-8b72-316c769a66b9", "235ce61c-be21-4697-815d-d5aa1a4ff121", "f6b69f3b-09b9-41a7-a9f2-255da0697015", "90108f59-7968-457f-9744-2e3b44e980dd", "170f5fd4-58f8-4b05-aba4-23522f35800f", "ffc9e2ca-7c33-4c6f-a64a-9a8d67fe2e30", "fdd62764-2438-42bb-af7f-9eb378082899", "fae20b24-42dc-4b9e-aebc-22afcdfc4689", "f878e60f-9647-4728-a368-fc8681b0acbb"]'
	),
	(
		'tam',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		(current_date - 4 + interval '30 hour' - interval '4 hour')::date,
		current_date - 4 + interval '30 hour',
		'["fd535752-d602-4ab8-8656-9e11692f30fc", "163d7f57-a76f-4e5b-9346-1de5cfeba7d8", "93d5d050-e9af-4652-9c76-9dc2a232640a", "fa26ba78-a7a3-49f8-8516-034424477dec", "c3c81fa4-9c63-4569-b9b6-9c931ee3154f", "ed70550e-da8a-44dc-8bfd-69965375b7f9", "c5c8cf9b-bf1a-4d4a-aff6-21b8dc86fcc9", "b2736292-1137-41db-a453-ad203726d8c5", "a875f6e4-a8cc-4f68-baf3-ca2aea273568", "a00febfd-e6d6-40bc-a3b8-e31563410db8", "97f2f7cb-a1c5-4bb1-a93b-d475fa96ae68", "4b7b3741-16ce-4ce8-a9b8-70556451a8e5", "49066ea2-e608-42ab-8817-1f20b0eada03", "4677f15a-1cd9-40a3-876c-30662c5eec3f", "44bcd224-b4b3-46ce-b260-2136712b0907"]'
	);

--
-- Data for Name: user_card_review; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."user_card_review" (
		"id",
		"uid",
		"score",
		"difficulty",
		"stability",
		"review_time_retrievability",
		"created_at",
		"updated_at",
		"day_session",
		"lang",
		"phrase_id",
		"day_first_review"
	)
values
	(
		'4d828aaf-119c-48c8-89c4-c1747e4a6745',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '2 minute',
		current_date - 4 + interval '2 minute',
		(current_date - 4 + interval '2 minute' - interval '4 hour')::date,
		'tam',
		'1f6bac22-b32a-4b77-9857-d2de02b538de',
		true
	),
	(
		'7b837436-f8e8-4459-85d1-af1366f03887',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '3 minute',
		current_date - 4 + interval '3 minute',
		(current_date - 4 + interval '3 minute' - interval '4 hour')::date,
		'tam',
		'12536684-0b35-4aff-80cd-f4ce56c866b6',
		true
	),
	(
		'd6355a75-8842-47ec-8417-262f060c1309',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '4 minute',
		current_date - 4 + interval '4 minute',
		(current_date - 4 + interval '4 minute' - interval '4 hour')::date,
		'tam',
		'163d7f57-a76f-4e5b-9346-1de5cfeba7d8',
		true
	),
	(
		'9e587800-834f-40c0-ab2e-dd08a2044d04',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '5 minute',
		current_date - 4 + interval '5 minute',
		(current_date - 4 + interval '5 minute' - interval '4 hour')::date,
		'tam',
		'24a18665-a343-4960-99fc-7e5ed54accb0',
		true
	),
	(
		'e0f40ad4-62d8-478d-80ee-09b98263d670',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.27296793128744,
		3.17579415198756,
		0.999963038938466,
		current_date - 4 + interval '6 minute',
		current_date - 4 + interval '6 minute',
		(current_date - 4 + interval '6 minute' - interval '4 hour')::date,
		'tam',
		'24a18665-a343-4960-99fc-7e5ed54accb0',
		true
	),
	(
		'ee22e0bf-5826-43a5-8b60-2e2220417ef9',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '7 minute',
		current_date - 4 + interval '7 minute',
		(current_date - 4 + interval '7 minute' - interval '4 hour')::date,
		'tam',
		'295fbba3-892c-43f9-84ba-85cf15fd28a5',
		true
	),
	(
		'd51d56ca-9e9d-452c-826a-0e00b46dac91',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '8 minute',
		current_date - 4 + interval '8 minute',
		(current_date - 4 + interval '8 minute' - interval '4 hour')::date,
		'tam',
		'4677f15a-1cd9-40a3-876c-30662c5eec3f',
		true
	),
	(
		'2b341982-61fd-4a7f-9c2d-48150ddba547',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '9 minute',
		current_date - 4 + interval '9 minute',
		(current_date - 4 + interval '9 minute' - interval '4 hour')::date,
		'tam',
		'fa26ba78-a7a3-49f8-8516-034424477dec',
		true
	),
	(
		'df1878c1-c5a3-419a-84cc-31f71f6a46cb',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		3.22450158937137,
		15.69105,
		null,
		current_date - 4 + interval '10 minute',
		current_date - 4 + interval '10 minute',
		(current_date - 4 + interval '10 minute' - interval '4 hour')::date,
		'tam',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		true
	),
	(
		'f5eda65e-1d59-49b4-aa38-651640631b29',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		3.22450158937137,
		15.69105,
		null,
		current_date - 4 + interval '11 minute',
		current_date - 4 + interval '11 minute',
		(current_date - 4 + interval '11 minute' - interval '4 hour')::date,
		'tam',
		'b2736292-1137-41db-a453-ad203726d8c5',
		true
	),
	(
		'14b26464-4442-48ad-b614-ca82209d0b97',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		2.13012145996701,
		15.69105,
		1,
		current_date - 4 + interval '12 minute',
		current_date - 4 + interval '12 minute',
		(current_date - 4 + interval '12 minute' - interval '4 hour')::date,
		'tam',
		'b2736292-1137-41db-a453-ad203726d8c5',
		true
	),
	(
		'8334fd09-6ae8-472e-8a64-9603d6832ec7',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		1,
		15.69105,
		1,
		current_date - 4 + interval '13 minute',
		current_date - 4 + interval '13 minute',
		(current_date - 4 + interval '13 minute' - interval '4 hour')::date,
		'tam',
		'b2736292-1137-41db-a453-ad203726d8c5',
		true
	),
	(
		'0627dafe-bee7-4e8a-8ab8-e77abc2d54e0',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		1,
		15.69105,
		1,
		current_date - 4 + interval '14 minute',
		current_date - 4 + interval '14 minute',
		(current_date - 4 + interval '14 minute' - interval '4 hour')::date,
		'tam',
		'b2736292-1137-41db-a453-ad203726d8c5',
		true
	),
	(
		'218dbc64-6574-40c0-9ca3-a69b48712d1e',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		2,
		6.48830526847145,
		1.18385,
		null,
		current_date - 4 + interval '15 minute',
		current_date - 4 + interval '15 minute',
		(current_date - 4 + interval '15 minute' - interval '4 hour')::date,
		'tam',
		'ed70550e-da8a-44dc-8bfd-69965375b7f9',
		true
	),
	(
		'36109500-45e0-4682-9db1-dac8e3a93bb4',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		2,
		7.04050154739082,
		1.18385,
		1,
		current_date - 4 + interval '16 minute',
		current_date - 4 + interval '16 minute',
		(current_date - 4 + interval '16 minute' - interval '4 hour')::date,
		'tam',
		'ed70550e-da8a-44dc-8bfd-69965375b7f9',
		true
	),
	(
		'049cdf96-8267-4fd7-9d58-1bb298ef21f3',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		2,
		7.50096684792899,
		1.18385,
		1,
		current_date - 4 + interval '17 minute',
		current_date - 4 + interval '17 minute',
		(current_date - 4 + interval '17 minute' - interval '4 hour')::date,
		'tam',
		'ed70550e-da8a-44dc-8bfd-69965375b7f9',
		true
	),
	(
		'e34bfe2e-9762-407f-b796-299a69dd725a',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '18 minute',
		current_date - 4 + interval '18 minute',
		(current_date - 4 + interval '18 minute' - interval '4 hour')::date,
		'tam',
		'c3c81fa4-9c63-4569-b9b6-9c931ee3154f',
		true
	),
	(
		'deb887de-e869-4615-94d2-0acdafadaea6',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '19 minute',
		current_date - 4 + interval '19 minute',
		(current_date - 4 + interval '19 minute' - interval '4 hour')::date,
		'tam',
		'fd535752-d602-4ab8-8656-9e11692f30fc',
		true
	),
	(
		'b21dfcb6-db0c-44c8-a7c3-ad8d3fb4921f',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		2,
		6.03495025561022,
		3.17364684618512,
		0.999963038938466,
		current_date - 4 + interval '20 minute',
		current_date - 4 + interval '20 minute',
		(current_date - 4 + interval '20 minute' - interval '4 hour')::date,
		'tam',
		'c3c81fa4-9c63-4569-b9b6-9c931ee3154f',
		true
	),
	(
		'2ea384a4-007a-482c-adcb-9e2f855c4372',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.27296793128744,
		3.20930802809924,
		0.999519825632093,
		current_date - 4 + interval '21 minute',
		current_date - 4 + interval '21 minute',
		(current_date - 4 + interval '21 minute' - interval '4 hour')::date,
		'tam',
		'fd535752-d602-4ab8-8656-9e11692f30fc',
		true
	),
	(
		'b2e60078-4bad-4a8d-a390-ef240ad908c6',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.26354498611463,
		3.2400417534011,
		0.999598247960939,
		current_date - 4 + interval '22 minute',
		current_date - 4 + interval '22 minute',
		(current_date - 4 + interval '22 minute' - interval '4 hour')::date,
		'tam',
		'fd535752-d602-4ab8-8656-9e11692f30fc',
		true
	),
	(
		'0a73db77-687d-4987-9d8f-af9a22b478a1',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'fd535752-d602-4ab8-8656-9e11692f30fc',
		true
	),
	(
		'9c97bcd0-c5c9-40bb-aff1-78ce3b1d024d',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'163d7f57-a76f-4e5b-9346-1de5cfeba7d8',
		true
	),
	(
		'2e4f7ec0-b795-4080-aa90-45cdbce470dc',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'93d5d050-e9af-4652-9c76-9dc2a232640a',
		true
	),
	(
		'cafb615a-19fb-4055-995d-746bd31b86f5',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'fa26ba78-a7a3-49f8-8516-034424477dec',
		true
	),
	(
		'5f34841d-77fa-4511-986b-313031a8002d',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'c3c81fa4-9c63-4569-b9b6-9c931ee3154f',
		true
	),
	(
		'eb144ddf-65ff-47ad-90ec-01c9d9b0fa8b',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'ed70550e-da8a-44dc-8bfd-69965375b7f9',
		true
	),
	(
		'46089470-856a-4b47-b797-fd93cc81d999',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'c5c8cf9b-bf1a-4d4a-aff6-21b8dc86fcc9',
		true
	),
	(
		'61032c94-65e0-45ab-a60a-79ab00693dd9',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'b2736292-1137-41db-a453-ad203726d8c5',
		true
	),
	(
		'a8c23998-bbbc-4b3f-9401-72e9e1e00374',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'a875f6e4-a8cc-4f68-baf3-ca2aea273568',
		true
	),
	(
		'4ca014e2-87c6-4939-a358-476ea8f57781',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'a00febfd-e6d6-40bc-a3b8-e31563410db8',
		true
	),
	(
		'43881316-0867-43fd-a4df-f8a7c315066b',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'97f2f7cb-a1c5-4bb1-a93b-d475fa96ae68',
		true
	),
	(
		'15101dbe-876f-42a2-8771-0a98c17819ad',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'4b7b3741-16ce-4ce8-a9b8-70556451a8e5',
		true
	),
	(
		'34eb7ece-d6e1-4e8f-a677-225019cf942b',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'49066ea2-e608-42ab-8817-1f20b0eada03',
		true
	),
	(
		'55e9dde7-43a1-40c3-b898-d035b8e92134',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'4677f15a-1cd9-40a3-876c-30662c5eec3f',
		true
	),
	(
		'b96b1427-1172-4548-a78f-80a5eba33c25',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 4 + interval '29 hour',
		current_date - 4 + interval '29 hour',
		(current_date - 4 + interval '29 hour' - interval '4 hour')::date,
		'tam',
		'44bcd224-b4b3-46ce-b260-2136712b0907',
		true
	);

--
-- Data for Name: user_client_event; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."user_client_event" ("id", "created_at", "uid", "message", "context", "url")
values
	(
		'a1441c46-2916-452e-9346-747b38154f45',
		'2025-09-26 16:53:08.763577+00',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'new row violates row-level security policy for table "user_card"',
		'{"code": "42501", "message": "new row violates row-level security policy for table \"user_card\""}',
		'http://localhost:5173/learn/hin/requests/e0d3a74e-4fe7-43c0-aa35-d05c83929986'
	),
	(
		'41b1f0e3-cb7d-4dd6-bb51-8d04bcf47cad',
		'2025-09-26 16:53:08.763568+00',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'new row violates row-level security policy for table "user_card"',
		'{"code": "42501", "message": "new row violates row-level security policy for table \"user_card\""}',
		'http://localhost:5173/learn/hin/requests/e0d3a74e-4fe7-43c0-aa35-d05c83929986'
	);

--
--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--
select
	pg_catalog.setval ('"auth"."refresh_tokens_id_seq"', 2813, true);

--
-- PostgreSQL database dump complete
--
reset all;