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
--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
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
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--
--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
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
-- Data for Name: db_meta; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."db_meta" ("key", "value")
values
	('seeded_at', now()::text);

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

reset all;
