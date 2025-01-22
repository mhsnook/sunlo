SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 'authenticated', 'authenticated', 'sunloapp@gmail.com', '$2a$10$nbkbcyoLi.buagd2DyyT0u4kpYoV.VZh6fSqRWvNxmZkea0XUcybG', '2025-01-20 07:29:08.707402+00', NULL, '', '2025-01-20 07:27:21.005514+00', '', NULL, '', '', NULL, '2025-01-20 12:50:55.255456+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18", "role": "learner", "email": "sunloapp@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-01-20 07:27:20.992634+00', '2025-01-20 17:01:24.864657+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', '{"sub": "cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18", "role": "learner", "email": "sunloapp@gmail.com", "email_verified": true, "phone_verified": false}', 'email', '2025-01-20 07:27:20.999528+00', '2025-01-20 07:27:20.999597+00', '2025-01-20 07:27:20.999597+00', '2afbf148-aaf2-4583-80fd-188cfc0410f3');


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
-- Data for Name: key; Type: TABLE DATA; Schema: pgsodium; Owner: supabase_admin
--



--
-- Data for Name: user_profile; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_profile" ("uid", "username", "avatar_url", "updated_at", "created_at", "languages_spoken", "language_primary") VALUES
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 'garlic', 'https://hepudeougzlgnuqvybrj.supabase.co/storage/v1/object/public/avatars/Screenshot from 2025-01-20 22-38-24-1a82b1.png', NULL, '2025-01-20 07:42:48.704054+00', '{}', 'aar');


--
-- Data for Name: friend_request_action; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: language; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."language" ("name", "lang", "alias_of") VALUES
	('Zulu', 'zul', NULL),
	('Chuvash', 'chv', NULL),
	('Cornish', 'cor', NULL),
	('Corsican', 'cos', NULL),
	('Amharic', 'amh', NULL),
	('Zhuang', 'zha', NULL),
	('Cree', 'cre', NULL),
	('Danish', 'dan', NULL),
	('Divehi, Dhivehi, Maldivian', 'div', NULL),
	('Dzongkha', 'dzo', NULL),
	('Esperanto', 'epo', NULL),
	('Estonian', 'est', NULL),
	('Ewe', 'ewe', NULL),
	('Faroese', 'fao', NULL),
	('Fijian', 'fij', NULL),
	('Finnish', 'fin', NULL),
	('Fulah', 'ful', NULL),
	('Irish', 'gle', NULL),
	('Galician', 'glg', NULL),
	('Manx', 'glv', NULL),
	('Guarani', 'grn', NULL),
	('Gujarati', 'guj', NULL),
	('Haitian, Haitian Creole', 'hat', NULL),
	('Hausa', 'hau', NULL),
	('Hebrew', 'heb', NULL),
	('Herero', 'her', NULL),
	('Hiri Motu', 'hmo', NULL),
	('Hindi', 'hin', NULL),
	('English', 'eng', NULL),
	('French', 'fra', NULL),
	('Marathi', 'mar', NULL),
	('Punjabi', 'pan', NULL),
	('Arabic', 'ara', NULL),
	('Italian', 'ita', NULL),
	('Konkani', 'kok', NULL),
	('Spanish', 'spa', NULL),
	('Polish', 'pol', NULL),
	('Tamil', 'tam', NULL),
	('Thai', 'tha', NULL),
	('German', 'deu', NULL),
	('Armenian', 'arm', 'hye'),
	('Urdu', 'urd', NULL),
	('Kannada', 'kan', NULL),
	('Croatian', 'hrv', NULL),
	('Malayalam', 'mal', NULL),
	('Hungarian', 'hun', NULL),
	('Igbo', 'ibo', NULL),
	('Ido', 'ido', NULL),
	('Sichuan Yi, Nuosu', 'iii', NULL),
	('Inuktitut', 'iku', NULL),
	('Interlingue, Occidental', 'ile', NULL),
	('Interlingua (IALA)', 'ina', NULL),
	('Indonesian', 'ind', NULL),
	('Inupiaq', 'ipk', NULL),
	('Javanese', 'jav', NULL),
	('Japanese', 'jpn', NULL),
	('Kalaallisut, Greenlandic', 'kal', NULL),
	('Kashmiri', 'kas', NULL),
	('Kanuri', 'kau', NULL),
	('Kazakh', 'kaz', NULL),
	('Central Khmer', 'khm', NULL),
	('Kikuyu, Gikuyu', 'kik', NULL),
	('Kinyarwanda', 'kin', NULL),
	('Kirghiz, Kyrgyz', 'kir', NULL),
	('Komi', 'kom', NULL),
	('Kongo', 'kon', NULL),
	('Korean', 'kor', NULL),
	('Kuanyama, Kwanyama', 'kua', NULL),
	('Kurdish', 'kur', NULL),
	('Lao', 'lao', NULL),
	('Latin', 'lat', NULL),
	('Latvian', 'lav', NULL),
	('Limburgan, Limburger, Limburgish', 'lim', NULL),
	('Lingala', 'lin', NULL),
	('Lithuanian', 'lit', NULL),
	('Welsh', 'cym', NULL),
	('Greek', 'ell', NULL),
	('Farsi (Persian)', 'fas', NULL),
	('Luxembourgish, Letzeburgesch', 'ltz', NULL),
	('Luba-Katanga', 'lub', NULL),
	('Ganda', 'lug', NULL),
	('Marshallese', 'mah', NULL),
	('Malagasy', 'mlg', NULL),
	('Maltese', 'mlt', NULL),
	('Mongolian', 'mon', NULL),
	('Nauru', 'nau', NULL),
	('Navajo', 'nav', NULL),
	('Ndebele, South', 'nbl', NULL),
	('Ndebele, North', 'nde', NULL),
	('Ndonga', 'ndo', NULL),
	('Nepali', 'nep', NULL),
	('Norwegian', 'nor', NULL),
	('Chichewa, Chewa, Nyanja', 'nya', NULL),
	('Occitan', 'oci', NULL),
	('Ojibwa', 'oji', NULL),
	('Oriya', 'ori', NULL),
	('Oromo', 'orm', NULL),
	('Ossetian, Ossetic', 'oss', NULL),
	('Pali', 'pli', NULL),
	('Tagalog', 'tgl', NULL),
	('Icelandic', 'isl', NULL),
	('Georgian', 'kat', NULL),
	('Macedonian', 'mkd', NULL),
	('Māori', 'mri', NULL),
	('Malay', 'msa', NULL),
	('Flemish (Dutch)', 'nld', NULL),
	('Slovak', 'slk', NULL),
	('Afar', 'aar', NULL),
	('Abkhazian', 'abk', NULL),
	('Afrikaans', 'afr', NULL),
	('Akan', 'aka', NULL),
	('Tigrinya', 'tir', NULL),
	('Tonga', 'ton', NULL),
	('Tswana', 'tsn', NULL),
	('Tsonga', 'tso', NULL),
	('Turkmen', 'tuk', NULL),
	('Turkish', 'tur', NULL),
	('Twi', 'twi', NULL),
	('Uyghur', 'uig', NULL),
	('Ukrainian', 'ukr', NULL),
	('Uzbek', 'uzb', NULL),
	('Venda', 'ven', NULL),
	('Vietnamese', 'vie', NULL),
	('Volapük', 'vol', NULL),
	('Walloon', 'wln', NULL),
	('Wolof', 'wol', NULL),
	('Xhosa', 'xho', NULL),
	('Yiddish', 'yid', NULL),
	('Yoruba', 'yor', NULL),
	('Portuguese', 'por', NULL),
	('Quechua', 'que', NULL),
	('Romansh', 'roh', NULL),
	('Rundi', 'run', NULL),
	('Russian', 'rus', NULL),
	('Sango', 'sag', NULL),
	('Sanskrit', 'san', NULL),
	('Slovenian', 'slv', NULL),
	('Samoan', 'smo', NULL),
	('Shona', 'sna', NULL),
	('Sindhi', 'snd', NULL),
	('Basque', 'baq', 'eus'),
	('Chinese', 'zho', NULL),
	('Chinese', 'chi', 'zho'),
	('Czech', 'cze', 'ces'),
	('Farsi (Persian)', 'per', 'far'),
	('Flemish (Dutch)', 'dut', 'nld'),
	('Albanian', 'alb', 'sqi'),
	('Basque', 'eus', NULL),
	('Burmese', 'bur', 'mya'),
	('Burmese', 'mya', NULL),
	('Czech', 'ces', NULL),
	('Georgian', 'geo', 'kat'),
	('French', 'fre', 'fra'),
	('German', 'ger', 'deu'),
	('Greek', 'gre', 'ell'),
	('Macedonian', 'mac', 'mkd'),
	('Malay', 'may', 'msa'),
	('Māori', 'mao', 'mri'),
	('Slovak', 'slo', 'slk'),
	('Romanian', 'ron', NULL),
	('Romanian', 'rum', 'ron'),
	('Bokmål, Norwegian, Norwegian Bokmål', 'nob', 'nor'),
	('Welsh', 'wel', 'cym'),
	('Pashto', 'pus', NULL),
	('Frisian, Western', 'fry', NULL),
	('Sami, Northern', 'sme', NULL),
	('Gaelic, Scottish', 'gla', NULL),
	('Sinhala', 'sin', NULL),
	('Tibetan (Lhasa)', 'bod', NULL),
	('Tibetan (Lhasa)', 'tib', 'bod'),
	('Norwegian Nynorsk, Nynorsk, Norwegian', 'nno', 'nor'),
	('Somali', 'som', NULL),
	('Sotho, Southern', 'sot', NULL),
	('Sardinian', 'srd', NULL),
	('Serbian', 'srp', NULL),
	('Swati', 'ssw', NULL),
	('Sundanese', 'sun', NULL),
	('Swahili', 'swa', NULL),
	('Swedish', 'swe', NULL),
	('Tahitian', 'tah', NULL),
	('Tatar', 'tat', NULL),
	('Telugu', 'tel', NULL),
	('Tajik', 'tgk', NULL),
	('Aragonese', 'arg', NULL),
	('Assamese', 'asm', NULL),
	('Avaric', 'ava', NULL),
	('Avestan', 'ave', NULL),
	('Aymara', 'aym', NULL),
	('Azerbaijani', 'aze', NULL),
	('Bashkir', 'bak', NULL),
	('Bambara', 'bam', NULL),
	('Belarusian', 'bel', NULL),
	('Bislama', 'bis', NULL),
	('Bosnian', 'bos', NULL),
	('Breton', 'bre', NULL),
	('Bulgarian', 'bul', NULL),
	('Catalan, Valencian', 'cat', NULL),
	('Chamorro', 'cha', NULL),
	('Chechen', 'che', NULL),
	('Church Slavic', 'chu', NULL),
	('Albanian', 'sqi', NULL),
	('Armenian', 'hye', NULL),
	('Icelandic', 'ice', 'isl'),
	('Bangla (Bengali)', 'ben', NULL),
	('Model language', 'mod', NULL);


--
-- Data for Name: phrase; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."phrase" ("text", "id", "added_by", "lang", "created_at") VALUES
	('Amele', 'b9e3edac-de8b-4796-b436-a0cded08d2ae', NULL, 'kan', '2023-06-29 04:13:20.005818+00'),
	('edhu, idhu, adhu, adhunga', '93d5d050-e9af-4652-9c76-9dc2a232640a', NULL, 'tam', '2024-06-18 11:39:43.363057+00'),
	('test', '2fbae84f-5b1d-43c2-8927-ef4d41c7e794', NULL, 'hin', '2024-08-10 10:29:28.462359+00'),
	('teen logue', '5f7ce03f-f6a1-48cf-bb59-6265faf2ea98', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('Aoo thodee Konkani ooloyta', 'a417afc8-6c80-4589-a314-55ac756b28f1', NULL, 'kok', '2024-06-18 11:10:48.114464+00'),
	('Kitle', 'd9da12a0-18f3-4836-af4b-8ea9423848ca', NULL, 'kok', '2024-06-18 11:10:48.114464+00'),
	('kop khun [ka/krup]', '5b714f21-94e2-4345-88ca-7ea25a5bf988', NULL, 'tha', '2024-06-18 11:10:48.114464+00'),
	('gee baht [ka/krup]', 'd546b14b-0bdf-48fa-9f55-0fa3ac1f3af7', NULL, 'tha', '2024-06-18 11:10:48.114464+00'),
	('kop khun [ka/krup]', 'faae3442-2957-431d-b055-e8910b3c26ad', NULL, 'tha', '2024-06-18 11:10:48.114464+00'),
	('Je ne sais quoi', 'de2f5e51-876d-4978-8a12-6146ece9202c', NULL, 'fra', '2024-06-18 11:10:48.114464+00'),
	('Sir map location pe aajaiye?', '235ce61c-be21-4697-815d-d5aa1a4ff121', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('Oui', 'bb8b9a4c-ddff-470a-86d8-8cd1ac335501', NULL, 'fra', '2024-06-18 11:10:48.114464+00'),
	('Aap log theek hain?', 'f1f5234e-0426-44f5-a007-b67329a70a81', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('kuch nahi', '170f5fd4-58f8-4b05-aba4-23522f35800f', NULL, 'hin', '2023-03-12 12:18:49.761408+00'),
	('aur kuch?', '90108f59-7968-457f-9744-2e3b44e980dd', NULL, 'hin', '2023-06-04 19:43:11.278741+00'),
	('barish ho rahi hai', '9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471', NULL, 'hin', '2023-06-04 19:51:24.278871+00'),
	('barish nahi ho rahi hai', '5b5cc7ec-702e-4dc1-a568-0dcc660c25bb', NULL, 'hin', '2023-06-04 19:52:16.685193+00'),
	('nahi', 'f878e60f-9647-4728-a368-fc8681b0acbb', NULL, 'hin', '2023-06-04 20:02:53.132406+00'),
	('onnu, rendu, moonu, naalu, anju, aaru, yaelu, ettu, onbathu, pathtu', '295fbba3-892c-43f9-84ba-85cf15fd28a5', NULL, 'tam', '2024-06-27 10:57:35.131929+00'),
	('yallo', '06e117d1-1b43-4047-996f-a298aad53823', NULL, 'hin', '2024-08-07 22:35:55.371124+00'),
	('test', '9e2fef5c-d144-4ea9-9b31-0bd4cefb7ee8', NULL, 'hin', '2024-08-10 17:12:29.29458+00'),
	('test', 'a8fbdb84-24bf-456e-836c-b355355caa45', NULL, 'hin', '2024-08-10 17:13:28.951208+00'),
	('test', '7f412edd-af7c-486e-a35f-3b2a7803efc9', NULL, 'hin', '2024-08-10 17:13:57.12768+00'),
	('haanji', '1395ae94-46d9-4a54-92f5-fb8b76db896b', NULL, 'hin', '2023-03-12 12:31:31.651169+00'),
	('signal se left', '4d3207d1-a0bf-4504-831e-bfadb834d315', NULL, 'hin', '2023-03-14 19:29:03.764689+00'),
	('aur kuch batao', 'ded8028a-493f-438f-8b72-316c769a66b9', NULL, 'hin', '2023-07-10 10:14:37.061692+00'),
	('kyuki', 'e060237f-1744-427a-8e8e-53da29582d35', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('ye kya hai?', 'c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('kya hua', 'cc3847f3-b151-401e-80c9-4aef221c54b5', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('kya ho raha hai?', 'f6b69f3b-09b9-41a7-a9f2-255da0697015', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('grazi', 'bca7ad96-44f4-4d58-b5b0-004f4450209a', NULL, 'ita', '2024-06-18 11:10:48.114464+00'),
	('bas', '7e01d5e8-d3ab-4cc1-8e7a-b5861f1742cd', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('thodisi dhoop hai aaj!', 'a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('ho gaya aajka', 'c3d00086-6d8c-431d-b2a0-df5757457a5e', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('kitna?', '8167b776-fc93-4e3f-b06e-5fa5818f2d3b', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('Sunlo', '78057374-cf85-4940-91d1-7d04c156abfb', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('Il fait frois', '57ddf6f6-d655-4fef-832d-b13650b26b82', NULL, 'fra', '2024-06-18 11:10:48.114464+00'),
	('dhat', '80b03361-25d1-434b-8935-4a2a762d2353', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('madarchod', '43a760da-65af-400e-b3f0-fbed7a6b338e', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('kai paije?', '99d430c1-5cbf-45aa-a95b-993e867ed668', NULL, 'mar', '2024-06-18 11:10:48.114464+00'),
	('kai', 'e9e0cdff-30b0-48fb-9816-285464943466', NULL, 'mar', '2024-06-18 11:10:48.114464+00'),
	('Tumhala kuthe zaichay?', '025301d1-00ef-45da-a1a0-d8382c4e5660', NULL, 'mar', '2024-06-18 11:10:48.114464+00'),
	('Hé kiti la aahë?', '3282e79e-3041-4adb-89fc-35d61f2f9eb8', NULL, 'mar', '2024-06-18 11:10:48.114464+00'),
	('Tumchyasathi mi kai karu?', 'd155ec89-6bd2-411f-877f-51e96513dbc7', NULL, 'mar', '2024-06-18 11:10:48.114464+00'),
	('Aai chi gaand', '7d1461c8-a158-4633-b650-de7f83c7e436', NULL, 'mar', '2024-06-18 11:10:48.114464+00'),
	('Kahan Ja Rahey Ho?', '83daad8e-f64f-4e8d-81f7-63aedd829c11', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('Patta hai', '903817a7-168a-4b99-87a1-79b3e3e14d84', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('Hum puchhengey', 'ee0fb561-8e07-413b-ac5c-65ec7041c17d', NULL, 'hin', '2024-06-18 11:10:48.114464+00'),
	('kya chal raha hai?', 'fae20b24-42dc-4b9e-aebc-22afcdfc4689', NULL, 'hin', '2023-07-10 10:06:59.440163+00'),
	('aapka naam kya hai?', '1d44afd2-1274-47ec-8107-36bd09861c3d', NULL, 'hin', '2023-03-14 19:26:33.416638+00'),
	('tumhara naam kya hai?', 'fdd62764-2438-42bb-af7f-9eb378082899', NULL, 'hin', '2023-07-10 10:05:08.778952+00'),
	('kya khana khaya aapne?', '184170d9-3717-427e-b347-35533ea52a02', NULL, 'hin', '2023-03-12 12:18:12.542964+00'),
	('suno iski baat', 'ca8af1e7-304a-4aef-a22e-26d9376b6313', NULL, 'hin', '2023-07-10 10:02:07.474975+00'),
	('chalta hai?', '0823546b-d240-4f14-9d51-8dfae5fcddc3', NULL, 'hin', '2023-03-12 12:10:22.96858+00'),
	('chalo', '48edc28c-1530-4549-b48c-f678033a6892', NULL, 'hin', '2023-04-04 18:27:02.949681+00'),
	('chale?', '24746d12-8a65-47e7-97c5-87c828585db6', NULL, 'hin', '2023-03-14 12:47:13.533543+00'),
	('main tum se pyaar karta hoon', '52851577-c8ba-4254-9c74-6edd310d6971', NULL, 'hin', '2023-07-10 09:58:05.330497+00'),
	('Polama', 'fd535752-d602-4ab8-8656-9e11692f30fc', NULL, 'tam', '2023-07-24 10:27:51.06103+00'),
	('main aah raha hoon', 'd4b66bd6-52fc-438d-afc5-3d35be9995c2', NULL, 'hin', '2023-07-10 08:29:43.691552+00'),
	('main ja raha hoon', '46ed187a-c132-4781-822f-ebb056ddf960', NULL, 'hin', '2023-06-26 09:24:30.385027+00'),
	('aap kaise ho?', '48fe0624-f586-4812-a1a5-33c634995671', NULL, 'hin', '2023-03-16 17:07:30.348716+00'),
	('main theek hoon', '7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb', NULL, 'hin', '2023-06-06 19:57:53.0483+00'),
	('namaste', '0e33be07-6d4a-4c99-8282-921038188cbf', NULL, 'hin', '2023-03-12 11:46:07.496146+00'),
	('eik, do, teen, chaar, paanch, che, saht, aht, no, das', '8133abe3-f908-445a-b8ae-6f01db3c18d7', NULL, 'hin', '2023-07-10 10:07:45.821623+00'),
	('kyu?', '267acd7c-65f2-4aad-bf5c-58e01c0f69f8', NULL, 'hin', '2024-05-28 20:26:59.8678+00'),
	('Main aur kha nahi sakta hoon', '1174699b-deac-480a-94af-555018da33fb', NULL, 'hin', '2023-03-12 12:30:17.726447+00'),
	('Chaep', '14fd9a81-be8c-44b2-a8f7-8a2bf5c9c8e6', NULL, 'hin', '2023-03-12 12:31:41.370517+00'),
	('Kal kaafi fun ho gaya ta', 'f7454ec3-5673-4858-a2f9-65925083ecbf', NULL, 'hin', '2023-06-05 21:37:44.237305+00'),
	('Main vo Kar sakta hoon', '0fd8b810-237a-4a38-a972-2d26706854ce', NULL, 'hin', '2023-03-12 12:20:07.866818+00'),
	('Jo bhi chahiye order karo', '1b6c63dd-177f-411e-8f87-bf2b3fe7c927', NULL, 'hin', '2023-03-21 11:14:45.652967+00'),
	('rehene do', 'e24dd614-0033-4c9c-a72a-475f96dcfca6', NULL, 'hin', '2024-05-28 20:34:14.978668+00'),
	('jaane do', 'd40c50fd-fd7b-4c47-af68-c85ef6879ac9', NULL, 'hin', '2023-07-10 10:16:55.439122+00'),
	('Yennaku avalova Thamil theriyadhu', '12536684-0b35-4aff-80cd-f4ce56c866b6', NULL, 'tam', '2023-07-24 10:28:34.660621+00'),
	('Rassi jal gayi, bal nahi gaya', 'b53afc7f-1349-4f28-aafb-3f471009dd97', NULL, 'hin', '2024-05-28 20:41:04.114987+00'),
	('Inshallah', 'f250e23f-0aee-48d8-bb6f-1be22c0df7c7', NULL, 'ara', '2024-05-28 21:12:27.723303+00'),
	('essa bhi kuch hota hai?', '7b396c7b-18c4-4e58-97a0-bc4687e67427', NULL, 'hin', '2024-05-28 20:33:36.579201+00'),
	('Sirf ek', '4c55ff26-b29e-48ce-8b72-0c28cd37d0c9', NULL, 'hin', '2024-05-27 20:46:06.961219+00'),
	('Yeh bata de', 'de1df463-8186-4748-9557-0de18c1a16ef', NULL, 'hin', '2023-07-10 10:14:59.0836+00'),
	('Woh bata de', 'ae43221d-6be8-468c-9af8-71bbab95c1ec', NULL, 'hin', '2023-07-10 11:35:08.65715+00'),
	('Kya main boloonga?', 'ee043244-9de8-4419-aee8-8ba2f3f5edcc', NULL, 'hin', '2023-07-10 10:17:14.212212+00'),
	('Kya main bolun?', 'bbe138a2-1bec-44a0-afb5-679ecc0b2214', NULL, 'hin', '2023-07-10 10:13:37.319303+00'),
	('Din, hafta, mahina, sal', 'f45c7d8a-acbe-42e0-8308-b2207c07eec1', NULL, 'hin', '2024-05-28 20:25:13.779076+00'),
	('Du Kapitalistenschweinefrisör', 'e0eef035-e5bd-45be-902a-62002512673b', NULL, 'deu', '2023-03-14 19:58:20.494213+00'),
	('Tumhe yadh hai?', 'ffc9e2ca-7c33-4c6f-a64a-9a8d67fe2e30', NULL, 'hin', '2023-07-10 11:35:15.025582+00'),
	('Bhul gaya', '37dd6e13-d915-4c41-8767-17cdd74beb96', NULL, 'hin', '2023-03-14 20:10:28.785051+00'),
	('Entschuldigen Sie mich', '288676f6-d224-4cf2-8ab1-abae8076f24b', NULL, 'deu', '2023-03-14 18:45:43.944988+00'),
	('Ich spreche kein Deutsch', '7d9a7e8b-4e6c-412d-8adb-7923dff1e04f', NULL, 'deu', '2023-03-14 18:46:20.94941+00'),
	('main ne 200 rupees bola ta', 'a9b7300d-5599-42f0-b573-8c5a54f0f299', NULL, 'hin', '2023-06-06 19:58:28.776715+00'),
	('Yalla', '0dd3a1d6-6a2c-4061-b6c0-51f6fb829082', NULL, 'ara', '2024-05-28 21:12:03.211837+00'),
	('Enjoy your meal', '95b1a0d4-666f-423d-a2b5-e7f27b5ea65c', NULL, 'eng', '2023-03-20 12:54:19.448761+00'),
	('I''m hungry', '674b81c7-eb26-4247-96cb-0c02378ee004', NULL, 'eng', '2023-03-20 12:56:09.561347+00'),
	('I promise', 'b97d6fed-d12f-4272-b92c-7d8525550207', NULL, 'eng', '2023-03-20 12:57:58.62318+00'),
	('koi na', '222e15d2-e94d-4369-912e-89186e222863', NULL, 'hin', '2023-03-22 12:28:36.225762+00'),
	('Shari', 'a3532d81-0870-4e51-927c-59497d348fc9', NULL, 'mal', '2023-03-23 15:18:18.07224+00'),
	('idhar ya udhar', 'f83954c3-864d-46c7-a4b8-d996bd5cb517', NULL, 'hin', '2023-03-23 17:21:34.321239+00'),
	('idhar ya udhar', '21ed1ee9-af6f-46e1-8f7e-7669b96db0ae', NULL, 'hin', '2023-03-23 19:17:01.034865+00'),
	('idhar ya udhar', 'c6726b7d-d1b6-4e32-802f-c2352889d1fc', NULL, 'hin', '2023-03-23 19:22:25.311997+00'),
	('idhar ya udhar', 'a925dd57-384c-44c2-8c8f-67ad05a05819', NULL, 'hin', '2023-03-23 19:27:34.619297+00'),
	('idhar ya udhar', 'f54f8a2a-dce8-401d-badf-b3d4ab36809f', NULL, 'hin', '2023-03-23 19:33:45.565153+00'),
	('idhar ya udhar', 'aa9f28b1-3481-40dd-a926-946ed4048f1a', NULL, 'hin', '2023-03-23 19:37:46.703388+00'),
	('idhar ya udhar', '469e1199-82e3-46da-8da7-c9ae60efca41', NULL, 'hin', '2023-03-23 19:38:21.158021+00'),
	('idhar ya udhar', '24971c85-e336-4af4-821e-74bc6f9c9099', NULL, 'hin', '2023-03-23 19:44:58.628384+00'),
	('idhar ya udhar', '1989b6d7-2904-4e4d-88de-a0bc7f0ecaa0', NULL, 'hin', '2023-03-23 19:50:12.990866+00'),
	('asdf', '6dacfd10-fb5f-4b48-a21b-43b13b591d03', NULL, 'hin', '2023-03-23 19:58:42.673377+00'),
	('idhar ya udhar', '70182dec-e235-4aa5-9364-5d1c7c91fa59', NULL, 'hin', '2023-03-25 09:50:06.759172+00'),
	('Adengappa', '4677f15a-1cd9-40a3-876c-30662c5eec3f', NULL, 'tam', '2023-07-24 10:28:50.110381+00'),
	('Teriya ille', '163d7f57-a76f-4e5b-9346-1de5cfeba7d8', NULL, 'tam', '2023-08-28 13:40:48.193962+00'),
	('something', '7b915b5e-f8d2-4324-8d40-a2f00212875a', NULL, 'aar', '2024-05-25 13:41:16.152519+00'),
	('Guten abend', '2e398135-21f9-4843-a8c7-273c986979c7', NULL, 'deu', '2024-05-28 22:48:57.301378+00'),
	('something test', '1b33c04e-016e-4d12-a938-aa4ce8cd7596', NULL, 'aar', '2024-05-28 23:21:22.621249+00'),
	('chitti, periamma', '1f6bac22-b32a-4b77-9857-d2de02b538de', NULL, 'tam', '2024-06-15 09:42:04.393222+00'),
	('hallo', '76402538-688d-4757-bdd9-c07d09c124dc', NULL, 'hin', '2023-03-20 09:27:04.931281+00'),
	('good luck', '7280cf0c-a394-40ee-92f4-0b68f08b16a2', NULL, 'eng', '2023-03-20 12:52:55.565509+00'),
	('good evening', '802bbec9-1c6c-49b8-8550-5efb71c39f54', NULL, 'eng', '2023-03-20 12:55:23.321258+00'),
	('It''s bad', 'a29cea29-acbf-4ef9-bd00-8fab74c30335', NULL, 'eng', '2023-03-20 13:01:39.214559+00'),
	('I''m looking', '6eaf6b05-d83f-424b-9269-fd80611ecc4c', NULL, 'eng', '2023-03-20 13:04:01.350321+00'),
	('hello', 'c545194f-b50f-4a44-bc75-a9f90a3538da', NULL, 'eng', '2023-03-20 13:11:26.146166+00'),
	('Idhar ya udhar?', '2b15b306-52f0-4493-bab5-634287a7fb47', NULL, 'hin', '2023-03-23 16:34:14.39966+00'),
	('Idhar ya udhar', '3d0e57a6-eaf2-4eab-922d-f2055c611418', NULL, 'hin', '2023-03-23 17:13:28.099969+00'),
	('idhar ya udhar', '13a8cb15-f575-461a-afe3-bbca427a7c0b', NULL, 'hin', '2023-03-23 18:06:37.891613+00'),
	('idhar ya udhar', '5c5c5c0c-324a-42eb-8e06-461ee63c4b5f', NULL, 'hin', '2023-03-23 18:44:00.701148+00'),
	('idhar ya udhar', '23fbf5e9-fabe-4da0-9175-0b0f462216af', NULL, 'hin', '2023-03-23 19:31:52.234331+00'),
	('idhar ya udhar', 'cbcff06c-4a47-449b-a1c3-c37b4443df5b', NULL, 'hin', '2023-03-23 19:38:39.811643+00'),
	('idhar ya udhar', '0972c5a6-464a-4193-9f0d-b2fbcf0bd71d', NULL, 'hin', '2023-03-23 19:56:09.232373+00'),
	('idhar ya udhar', '909ae4d6-bd02-46b1-a9f1-93469ea9ea94', NULL, 'hin', '2023-03-23 19:56:53.746901+00'),
	('hindi phrase', '7ae6b46c-c7c8-480c-a242-0655a34b6aec', NULL, 'hin', '2023-06-04 21:21:32.922827+00'),
	('laet ja', 'c8cca0b1-7176-4418-ba82-279e97278a1b', NULL, 'hin', '2023-07-26 09:36:51.535842+00'),
	('Maria de illa', 'c1cc1a36-1b77-41bf-9a05-6e7914d256e2', NULL, 'kan', '2023-09-23 15:46:04.061184+00'),
	('Guten morgen', '22d2875f-1164-47a0-9572-e2d19137950d', NULL, 'deu', '2024-05-28 22:49:44.406286+00'),
	('es ist moglich?', '24730a53-1b7f-422c-83ab-0cd3a51c2fe3', NULL, 'deu', '2024-06-02 09:07:43.44018+00'),
	('theek hai', 'bf1cee96-86f2-44e9-97e3-59897dd864ed', NULL, 'hin', '2023-05-06 13:23:24.375954+00'),
	('accha hai', '215b33a1-9277-4c19-ae85-788892019566', NULL, 'hin', '2023-03-14 14:49:26.41246+00'),
	('ho gaya', '2a710c3c-7f9f-462b-86df-41d08563c809', NULL, 'hin', '2023-03-25 17:15:13.018153+00'),
	('kya hai?', '2bf98841-7cde-493c-86b6-a47889303b65', NULL, 'hin', '2023-03-16 19:11:31.062478+00'),
	('khatham ho gaya', '2ed5fa12-40d1-4d22-88ee-5e52d373e3aa', NULL, 'hin', '2023-05-06 13:48:26.126165+00'),
	('Sab theek?', '1a28066b-bfc7-4be8-ac51-87226527820e', NULL, 'hin', '2023-03-14 15:01:24.124218+00'),
	('Haina?', 'c952444c-c89f-4105-8e75-cd5156e6d925', NULL, 'hin', '2024-05-28 20:50:44.269228+00'),
	('Main bimar hoon', '1269f7f0-d675-4f01-b378-7671b80b1fa7', NULL, 'hin', '2023-03-12 12:19:41.457553+00'),
	('It''s raining', '6875a165-77bc-40d4-8430-699f71c3018a', NULL, 'eng', '2023-03-14 15:55:25.577641+00'),
	('Vandu tea kudhi ', 'b7247f31-3758-47ea-bdf8-1c2a7ff161ed', NULL, 'kan', '2023-03-12 20:37:51.461978+00'),
	('main thaki hui hoon ', '1c1aaa6d-f49e-4dca-88a4-b2f417b352a5', NULL, 'hin', '2023-03-12 12:18:37.924501+00'),
	('mujhe bhookh lag rahi hai', '788c7250-6ce2-445d-85a0-1d13751d64bd', NULL, 'hin', '2024-05-11 13:51:18.544978+00'),
	('yār, enna, en, eppolutu, enge, eppati', '24a18665-a343-4960-99fc-7e5ed54accb0', NULL, 'tam', '2024-06-18 10:59:04.00879+00'),
	('Patthu, iruvathu, mubbathu, naapathu, aimbathu, arupathu, ezhupadhu, enpadhu, Tonoothu, noothu', 'ed70550e-da8a-44dc-8bfd-69965375b7f9', NULL, 'tam', '2024-06-28 12:44:43.30066+00'),
	('test 1 ', 'a76bcc62-879a-4da5-95c1-de11d64bac91', NULL, 'hin', '2024-08-10 17:14:17.407787+00'),
	('idhu irukē?', 'fa26ba78-a7a3-49f8-8516-034424477dec', NULL, 'tam', '2025-01-14 10:28:26.091941+00'),
	('epudi irukē?', 'c3c81fa4-9c63-4569-b9b6-9c931ee3154f', NULL, 'tam', '2025-01-14 11:12:26.466709+00'),
	('epadi irukeenge?', 'b2736292-1137-41db-a453-ad203726d8c5', NULL, 'tam', '2025-01-14 11:13:40.193466+00'),
	('epadi irukeenge?', '4b7b3741-16ce-4ce8-a9b8-70556451a8e5', NULL, 'tam', '2025-01-14 11:18:19.188811+00'),
	('epadi irukeenge?', 'ddd650c2-00e9-43f1-8624-5a97282087aa', NULL, 'tam', '2025-01-14 11:19:14.68468+00'),
	('epadi irukeenge?', '7aac8e8f-4de1-41a0-b910-a2c9b80e47f9', NULL, 'tam', '2025-01-14 11:19:29.494985+00'),
	('epadi irukeenge', 'de2ea356-e63d-46f7-8123-2aa9370673ec', NULL, 'tam', '2025-01-14 11:20:05.207829+00'),
	('epadi irukeenge?', 'a2777e37-b02e-4d8b-9a39-1a9ad56af4f2', NULL, 'tam', '2025-01-14 11:20:55.39083+00'),
	('comment ca va', 'a875f6e4-a8cc-4f68-baf3-ca2aea273568', NULL, 'tam', '2025-01-14 11:21:42.148914+00'),
	('comment ca va', '44bcd224-b4b3-46ce-b260-2136712b0907', NULL, 'tam', '2025-01-14 11:22:04.760494+00'),
	('comment ca va', 'a00febfd-e6d6-40bc-a3b8-e31563410db8', NULL, 'tam', '2025-01-14 11:22:38.926452+00'),
	('comment ca va', 'c5c8cf9b-bf1a-4d4a-aff6-21b8dc86fcc9', NULL, 'tam', '2025-01-14 11:24:22.975587+00'),
	('comment ca va', '49066ea2-e608-42ab-8817-1f20b0eada03', NULL, 'tam', '2025-01-14 11:24:42.842563+00'),
	('comment ca va', '97f2f7cb-a1c5-4bb1-a93b-d475fa96ae68', NULL, 'tam', '2025-01-14 11:25:39.544716+00');


--
-- Data for Name: phrase_relation; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."phrase_relation" ("from_phrase_id", "to_phrase_id", "id", "added_by") VALUES
	('bb8b9a4c-ddff-470a-86d8-8cd1ac335501', '1395ae94-46d9-4a54-92f5-fb8b76db896b', '5bc91753-e581-45c4-af60-f08130909167', NULL),
	('bca7ad96-44f4-4d58-b5b0-004f4450209a', '90108f59-7968-457f-9744-2e3b44e980dd', '17ea0978-1fc2-4152-85f2-01ffd8740d75', NULL),
	('170f5fd4-58f8-4b05-aba4-23522f35800f', 'bca7ad96-44f4-4d58-b5b0-004f4450209a', '06fdfed9-f08e-41f0-b122-ae9777e2b2a4', NULL),
	('90108f59-7968-457f-9744-2e3b44e980dd', '170f5fd4-58f8-4b05-aba4-23522f35800f', '0927945d-2130-41cc-bfe3-f04d2e6d360c', NULL),
	('90108f59-7968-457f-9744-2e3b44e980dd', 'ded8028a-493f-438f-8b72-316c769a66b9', 'a92b67bc-7c8c-4a28-9a0c-2a0b6437355b', NULL),
	('7e01d5e8-d3ab-4cc1-8e7a-b5861f1742cd', '90108f59-7968-457f-9744-2e3b44e980dd', 'b420e475-0fed-4a43-a557-d3e565437cbb', NULL),
	('9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471', '5b5cc7ec-702e-4dc1-a568-0dcc660c25bb', '686a747d-8a10-4416-94c1-a4e241414031', NULL),
	('f6b69f3b-09b9-41a7-a9f2-255da0697015', '9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471', '85e1d11f-025c-4a16-83b0-dd60fa95fbfa', NULL),
	('a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9', '9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471', '36ab2882-75eb-4f60-b03b-9c7a3fba7815', NULL),
	('a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9', '5b5cc7ec-702e-4dc1-a568-0dcc660c25bb', '717dd2b5-99a1-4898-a2e4-59324bb7cd27', NULL),
	('f878e60f-9647-4728-a368-fc8681b0acbb', '1395ae94-46d9-4a54-92f5-fb8b76db896b', '62d36374-5fce-4273-8a5e-a03565ca886d', NULL),
	('1d44afd2-1274-47ec-8107-36bd09861c3d', 'fdd62764-2438-42bb-af7f-9eb378082899', '42941928-f78d-48c5-a0d3-636b7badbfe0', NULL),
	('24746d12-8a65-47e7-97c5-87c828585db6', '48edc28c-1530-4549-b48c-f678033a6892', 'dd1cd8a1-d7b8-4590-ac41-51f81186494d', NULL),
	('46ed187a-c132-4781-822f-ebb056ddf960', 'd4b66bd6-52fc-438d-afc5-3d35be9995c2', '77c33b91-4d44-4ed0-ad2c-61fd1019900c', NULL),
	('48fe0624-f586-4812-a1a5-33c634995671', '7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb', '45b04a26-7a9e-456d-8d4f-fcf8cf8d9557', NULL),
	('0e33be07-6d4a-4c99-8282-921038188cbf', '48fe0624-f586-4812-a1a5-33c634995671', '461612e9-416c-4401-88f9-901c6733d595', NULL),
	('7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb', 'bf1cee96-86f2-44e9-97e3-59897dd864ed', '6983bd12-86d3-41d3-a62c-d79603913e41', NULL),
	('5f7ce03f-f6a1-48cf-bb59-6265faf2ea98', '8133abe3-f908-445a-b8ae-6f01db3c18d7', '1c619ab4-ffee-451d-8715-0634bb4d052b', NULL),
	('bf1cee96-86f2-44e9-97e3-59897dd864ed', '1a28066b-bfc7-4be8-ac51-87226527820e', '9c02cebd-3578-43b4-8205-ba893b28a488', NULL),
	('bf1cee96-86f2-44e9-97e3-59897dd864ed', '215b33a1-9277-4c19-ae85-788892019566', 'c48d4288-9663-47ad-94cd-2ac71be2d1a4', NULL),
	('267acd7c-65f2-4aad-bf5c-58e01c0f69f8', 'e060237f-1744-427a-8e8e-53da29582d35', '07bc1ae3-43f7-41b9-80db-56b94f718785', NULL),
	('2a710c3c-7f9f-462b-86df-41d08563c809', '2ed5fa12-40d1-4d22-88ee-5e52d373e3aa', '2032030b-ed83-417f-8e0f-51b1483efc5d', NULL),
	('c3d00086-6d8c-431d-b2a0-df5757457a5e', '2a710c3c-7f9f-462b-86df-41d08563c809', '27347fc7-fea2-474c-a48d-0e95156a48ee', NULL),
	('c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8', 'cc3847f3-b151-401e-80c9-4aef221c54b5', '4c09e735-8e6b-4fce-af89-cdbbecb13fe3', NULL),
	('c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8', '2bf98841-7cde-493c-86b6-a47889303b65', 'c461b5fe-f582-4dad-9817-93d20adae8d4', NULL),
	('c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8', 'f6b69f3b-09b9-41a7-a9f2-255da0697015', 'dd4be05d-1c1d-4594-bd1a-0e033ba3de73', NULL),
	('cc3847f3-b151-401e-80c9-4aef221c54b5', '2bf98841-7cde-493c-86b6-a47889303b65', '07ee8e0b-2f86-471a-8fe2-6b8b9194e0f1', NULL),
	('f6b69f3b-09b9-41a7-a9f2-255da0697015', 'cc3847f3-b151-401e-80c9-4aef221c54b5', 'd5f5e6d6-2242-4625-9806-448e5ddeb776', NULL),
	('f6b69f3b-09b9-41a7-a9f2-255da0697015', '2bf98841-7cde-493c-86b6-a47889303b65', '14dd1325-1019-4a88-86aa-3ec040c1be23', NULL),
	('c3d00086-6d8c-431d-b2a0-df5757457a5e', 'a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9', 'b0b4b951-eb67-46bf-a512-c36cc22666a9', NULL),
	('2ed5fa12-40d1-4d22-88ee-5e52d373e3aa', 'c3d00086-6d8c-431d-b2a0-df5757457a5e', '15542578-4c24-425c-b440-3f4dda73669f', NULL),
	('bca7ad96-44f4-4d58-b5b0-004f4450209a', 'ded8028a-493f-438f-8b72-316c769a66b9', '81def26f-5db6-4fbd-87a4-8e4654f1139e', NULL),
	('bca7ad96-44f4-4d58-b5b0-004f4450209a', '7b396c7b-18c4-4e58-97a0-bc4687e67427', '49cd1858-1387-4a8b-bb5f-e6258b458e6b', NULL),
	('1b6c63dd-177f-411e-8f87-bf2b3fe7c927', '7b396c7b-18c4-4e58-97a0-bc4687e67427', 'd29c3648-17ba-4c3f-b84e-152e79219097', NULL),
	('de1df463-8186-4748-9557-0de18c1a16ef', 'ae43221d-6be8-468c-9af8-71bbab95c1ec', '289012dd-02c2-44cf-9c38-48d6556d2c39', NULL),
	('ee043244-9de8-4419-aee8-8ba2f3f5edcc', 'bbe138a2-1bec-44a0-afb5-679ecc0b2214', '4fafe902-ddb6-41c5-b2fe-c329166a7eff', NULL),
	('8133abe3-f908-445a-b8ae-6f01db3c18d7', 'f45c7d8a-acbe-42e0-8308-b2207c07eec1', '97095af8-7267-4f1e-824a-096a918215a0', NULL),
	('9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471', 'fae20b24-42dc-4b9e-aebc-22afcdfc4689', '554a726a-cdc1-4318-8479-ddb4f6b73690', NULL);


--
-- Data for Name: phrase_translation; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."phrase_translation" ("text", "literal", "id", "phrase_id", "added_by", "lang") VALUES
	('Yes', NULL, 'b40f1592-b292-485e-8c79-01b5223b8b0c', 'bb8b9a4c-ddff-470a-86d8-8cd1ac335501', NULL, 'eng'),
	('Later', NULL, '94b79e23-f63f-4931-a8ba-4742c925c6a9', 'b9e3edac-de8b-4796-b436-a0cded08d2ae', NULL, 'eng'),
	('what is your name? (casual)', NULL, '21396316-538e-4fbf-8fa2-efc561cb8a7a', 'fdd62764-2438-42bb-af7f-9eb378082899', NULL, 'eng'),
	('what did you eat?', NULL, 'ce47c6b8-134b-47b5-9fc9-9d234375ca64', '184170d9-3717-427e-b347-35533ea52a02', NULL, 'eng'),
	('listen to him/her', NULL, '35dfa987-1dbd-47de-9ba5-c9ac4257cacc', 'ca8af1e7-304a-4aef-a22e-26d9376b6313', NULL, 'eng'),
	('does it work?', NULL, 'e587beac-9d4f-409c-8aa2-0eb5e39c15b2', '0823546b-d240-4f14-9d51-8dfae5fcddc3', NULL, 'eng'),
	('let''s go', NULL, '536053fc-09d1-4f93-8b43-ffbee2de649d', '48edc28c-1530-4549-b48c-f678033a6892', NULL, 'eng'),
	('shall we go?', NULL, 'abc1137e-b8d4-4819-b3b1-8e818beb3b8e', '24746d12-8a65-47e7-97c5-87c828585db6', NULL, 'eng'),
	('I love you', NULL, 'e8b4b9ff-0208-4996-ae8d-f7aaa7dd98bd', '52851577-c8ba-4254-9c74-6edd310d6971', NULL, 'eng'),
	('I''m coming (presently)', NULL, '46dc7f3f-e92c-46d2-9be2-600b6d36a3ac', 'd4b66bd6-52fc-438d-afc5-3d35be9995c2', NULL, 'eng'),
	('I''m going (presently)', NULL, '320e3f85-ca48-4198-b938-4c48c09d4313', '46ed187a-c132-4781-822f-ebb056ddf960', NULL, 'eng'),
	('how are you? (formal)', NULL, 'b9358716-5516-44f0-804a-dccaeb5e87e7', '48fe0624-f586-4812-a1a5-33c634995671', NULL, 'eng'),
	('I''m doing fine', NULL, '8fded3bb-e122-4dab-8b4b-0b923832325f', '7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb', NULL, 'eng'),
	('hello (formal)', NULL, '92efccec-2d3f-4e77-bf65-c7490acbb66c', '0e33be07-6d4a-4c99-8282-921038188cbf', NULL, 'eng'),
	('three people', NULL, '364938a5-bc8b-40ff-95d0-6ab01a3d8c98', '5f7ce03f-f6a1-48cf-bb59-6265faf2ea98', NULL, 'eng'),
	('one, two, three, four, five, six, seven, eight, nine, ten', NULL, 'cbc86ddd-1294-4ca6-b303-765d28974771', '8133abe3-f908-445a-b8ae-6f01db3c18d7', NULL, 'eng'),
	('okay', NULL, '7939b0cb-8f04-422f-81e3-56c11f5cc4fa', 'bf1cee96-86f2-44e9-97e3-59897dd864ed', NULL, 'eng'),
	('it''s good', NULL, 'c47113cb-3b9c-4558-bdb1-72fb404e2fff', '215b33a1-9277-4c19-ae85-788892019566', NULL, 'eng'),
	('why?', NULL, '65ae2ecc-e00a-4a78-813e-871d4fbdcc03', '267acd7c-65f2-4aad-bf5c-58e01c0f69f8', NULL, 'eng'),
	('because', NULL, 'daeabba1-7556-4629-979b-fa9b1c7dd88f', 'e060237f-1744-427a-8e8e-53da29582d35', NULL, 'eng'),
	('done', NULL, 'fc2b6ce0-f5ae-4f75-8e00-3476da949d71', '2a710c3c-7f9f-462b-86df-41d08563c809', NULL, 'eng'),
	('tell me something else', 'more something tell me', 'e8b926a6-2a6d-4089-a32d-39e19bc808f3', 'ded8028a-493f-438f-8b72-316c769a66b9', NULL, 'eng'),
	('what is this?', NULL, '35eac1f7-8eb9-41b9-a1b1-3da0bebb390f', 'c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8', NULL, 'eng'),
	('what''s happening here?', NULL, '21cd648b-4f03-4212-8af2-037c916ff950', 'c412f03e-a014-4aaa-b0e8-0e1a58f5c6e8', NULL, 'eng'),
	('what''s happening?', NULL, 'f9c6533a-2d0f-44eb-9f99-d49a6d952aed', 'cc3847f3-b151-401e-80c9-4aef221c54b5', NULL, 'eng'),
	('what is it?', NULL, '67058d88-7910-4e7b-be7b-b4a29eceb239', '2bf98841-7cde-493c-86b6-a47889303b65', NULL, 'eng'),
	('what is happening?', NULL, '81500b34-e00c-4207-87d7-5e8d778f17d6', 'f6b69f3b-09b9-41a7-a9f2-255da0697015', NULL, 'eng'),
	('enough / that''s fine', NULL, 'e17bb3f5-643e-49c2-9eda-1f0625b9635d', '7e01d5e8-d3ab-4cc1-8e7a-b5861f1742cd', NULL, 'eng'),
	('it''s a little sunny out today!', NULL, '9d36a465-9f66-45c7-b2f5-39bcc58f94dc', 'a8d4b1f5-bdf1-4aa2-b04c-bdb8b35b27b9', NULL, 'hin'),
	('done for today', NULL, '9c7cbbd4-053f-41b8-8263-7dc2c7644542', 'c3d00086-6d8c-431d-b2a0-df5757457a5e', NULL, 'eng'),
	('it''s all gone / empty', 'it got over', '3af29496-4d83-4ad0-92dc-b7f779318f3c', '2ed5fa12-40d1-4d22-88ee-5e52d373e3aa', NULL, 'eng'),
	('how much?', NULL, 'f0711d8f-b2be-4822-be9e-5581522c88b4', '8167b776-fc93-4e3f-b06e-5fa5818f2d3b', NULL, 'eng'),
	('combien?', NULL, '832d14ac-8469-4ef0-b9eb-fb7d0cb11ad3', '8167b776-fc93-4e3f-b06e-5fa5818f2d3b', NULL, 'fra'),
	('qu''est-ce que tu as mangé?', NULL, '69ceef50-847f-4697-adba-6e9b52092d57', '184170d9-3717-427e-b347-35533ea52a02', NULL, 'fra'),
	('everything OK?', NULL, 'ffa121fb-948d-4e66-927f-f6f56ee964cd', '1a28066b-bfc7-4be8-ac51-87226527820e', NULL, 'eng'),
	('N''est-ce pas?', 'Isn''t it?', '9555f470-9419-4845-a6a2-3d2842031b0a', 'c952444c-c89f-4105-8e75-cd5156e6d925', NULL, 'fra'),
	('Écoute', NULL, 'da61a198-4a5e-48f1-87a1-b5ac1dbb1039', '78057374-cf85-4940-91d1-7d04c156abfb', NULL, 'fra'),
	('It''s cold', NULL, '77d9f182-105b-4813-a174-4b4065890e06', '57ddf6f6-d655-4fef-832d-b13650b26b82', NULL, 'eng'),
	('I am ill / unwell', NULL, '721a5032-5284-44aa-ae05-686a2a437628', '1269f7f0-d675-4f01-b378-7671b80b1fa7', NULL, 'eng'),
	('shush', NULL, '04f4e2d9-4854-4eff-a1be-333032a8e6de', '80b03361-25d1-434b-8935-4a2a762d2353', NULL, 'eng'),
	('Il pleut', NULL, '33ca7093-0d4e-4a56-a991-65c64f9a16f0', '6875a165-77bc-40d4-8430-699f71c3018a', NULL, 'fra'),
	('motherfucker', NULL, '29ac950d-0038-4422-b07f-3954b4f86d53', '43a760da-65af-400e-b3f0-fbed7a6b338e', NULL, 'eng'),
	('kya chahiye?', NULL, 'bb81540c-41c0-414a-8619-3030435b98dd', '99d430c1-5cbf-45aa-a95b-993e867ed668', NULL, 'hin'),
	('Kya', NULL, '4b9d819c-00eb-49ab-9e32-fdf93ebda1c6', 'e9e0cdff-30b0-48fb-9816-285464943466', NULL, 'hin'),
	('Aapko kidhar jaana hai?', NULL, '4afcba0b-cbf6-4ac5-b655-1f34d2b213b9', '025301d1-00ef-45da-a1a0-d8382c4e5660', NULL, 'hin'),
	('Yeh kitne ka hai?', NULL, '76eaae1e-2896-47f5-9cf9-dc9469dda69f', '3282e79e-3041-4adb-89fc-35d61f2f9eb8', NULL, 'hin'),
	('What can I do for you?', NULL, 'c334102b-b5fa-4d3c-be97-66a1ba09c21f', 'd155ec89-6bd2-411f-877f-51e96513dbc7', NULL, 'eng'),
	('Give one tea', NULL, '0bc36882-0f12-428c-a5d3-a9ea05d0f58d', 'b7247f31-3758-47ea-bdf8-1c2a7ff161ed', NULL, 'eng'),
	('Literal translation: Mother''s ass
Meaning: To be used in a manner in which "Oh shit" or "Oh fuck" is used.', NULL, 'e6068589-3722-477d-8971-a855e8a2a6f1', '7d1461c8-a158-4633-b650-de7f83c7e436', NULL, 'eng'),
	('random', NULL, '18034333-9e44-4248-a9ae-8bb85851304c', 'bca7ad96-44f4-4d58-b5b0-004f4450209a', NULL, 'eng'),
	('I am tired', NULL, 'ac99a731-8cca-4908-a255-48d4dcae21ba', '1c1aaa6d-f49e-4dca-88a4-b2f417b352a5', NULL, 'eng'),
	('Where are you going?', NULL, '9ff9dabb-879a-446e-a9c4-9d6b699cc0fe', '83daad8e-f64f-4e8d-81f7-63aedd829c11', NULL, 'eng'),
	('I am getting hungry', NULL, '4bd55cf4-f3b1-41ed-97a9-adca41183fcc', '788c7250-6ce2-445d-85a0-1d13751d64bd', NULL, 'eng'),
	('I know', NULL, '2965151f-61ec-4fbc-8e73-cdecf107debf', '903817a7-168a-4b99-87a1-79b3e3e14d84', NULL, 'eng'),
	('Je sais', NULL, 'a7825012-4883-46b1-b5d6-b443f1a64628', '903817a7-168a-4b99-87a1-79b3e3e14d84', NULL, 'fra'),
	('We will ask', NULL, '38ef56dd-ec97-4397-b4a7-75c54a14c485', 'ee0fb561-8e07-413b-ac5c-65ec7041c17d', NULL, 'eng'),
	('I can''t eat any more', NULL, '40292dd7-9699-4d81-91d9-9f3873262d64', '1174699b-deac-480a-94af-555018da33fb', NULL, 'eng'),
	('Je ne peux plus manger', NULL, '49bc1d8c-547e-4ab5-8b74-1ba5efc92374', '1174699b-deac-480a-94af-555018da33fb', NULL, 'fra'),
	('A clingy, solicitous, creepy guy', NULL, '6406dab7-35d7-4e3c-8998-0f193da2feb2', '14fd9a81-be8c-44b2-a8f7-8a2bf5c9c8e6', NULL, 'eng'),
	('Lots of fun was had yesterday', NULL, '6ee003e6-e055-4693-9264-ab7b81cd592c', 'f7454ec3-5673-4858-a2f9-65925083ecbf', NULL, 'eng'),
	('Yesterday it was lots of fun', NULL, '342bca78-c144-4168-ac20-ed22b12e2f92', 'f7454ec3-5673-4858-a2f9-65925083ecbf', NULL, 'eng'),
	('I can do that', NULL, 'bb632a64-a914-4936-bbb8-d953e986fba4', '0fd8b810-237a-4a38-a972-2d26706854ce', NULL, 'eng'),
	('hello', NULL, '3079ae53-a8b7-4691-8496-2e3c509cbd39', '76402538-688d-4757-bdd9-c07d09c124dc', NULL, 'eng'),
	('I told you 200 rupees', NULL, 'd8258697-9c40-4f11-88a6-5635ebe5cfc8', 'a9b7300d-5599-42f0-b573-8c5a54f0f299', NULL, 'eng'),
	('Bon appetit', NULL, '76e7af16-2ca9-4e61-8221-b723fc08e3e4', '95b1a0d4-666f-423d-a2b5-e7f27b5ea65c', NULL, 'fra'),
	('bon soir', NULL, '7637e9c5-e669-4c52-8361-e3eecb383ccd', '802bbec9-1c6c-49b8-8550-5efb71c39f54', NULL, 'fra'),
	('Je regards', NULL, '592627b7-0a0f-4c53-812c-23b4d5a70d6f', '6eaf6b05-d83f-424b-9269-fd80611ecc4c', NULL, 'fra'),
	('Okay', NULL, 'dc76c757-5223-4329-be60-5bed821798af', 'a3532d81-0870-4e51-927c-59497d348fc9', NULL, 'eng'),
	('here or there', NULL, '8e726206-8356-4092-8ef3-0bfd61f093a5', '1989b6d7-2904-4e4d-88de-a0bc7f0ecaa0', NULL, 'eng'),
	('here or there', NULL, 'd856c779-7bf4-45bf-8462-2aa38be315b8', '0972c5a6-464a-4193-9f0d-b2fbcf0bd71d', NULL, 'eng'),
	('asdf', NULL, 'cb6dbd6b-621d-4381-8373-3d13f2c1fdcb', '6dacfd10-fb5f-4b48-a21b-43b13b591d03', NULL, 'eng'),
	('Woah cool!', NULL, 'db70ab10-1370-473e-85b6-f0bc8c57ce7d', '4677f15a-1cd9-40a3-876c-30662c5eec3f', NULL, 'eng'),
	('Don''t you have any honor?', NULL, '2ec0720e-6f0a-451e-bced-0a02dabf8aca', 'c1cc1a36-1b77-41bf-9a05-6e7914d256e2', NULL, 'eng'),
	('SOMETHING ELSE', NULL, '3e7b6b35-9b5e-4fb5-9575-5765241521a1', '7b915b5e-f8d2-4324-8d40-a2f00212875a', NULL, 'eng'),
	('test something', NULL, '69339bc5-42e5-4327-9af6-c4ec1b2b600d', '1b33c04e-016e-4d12-a938-aa4ce8cd7596', NULL, 'eng'),
	('idk', NULL, '25528686-db63-406e-8866-f2c12fb0c216', '163d7f57-a76f-4e5b-9346-1de5cfeba7d8', NULL, 'eng'),
	('thanks', NULL, '347591a8-eb2a-4a1d-8e7b-8fc205ec9045', 'bca7ad96-44f4-4d58-b5b0-004f4450209a', NULL, 'eng'),
	('nothing', NULL, '16d1c7d3-a982-4d83-9514-dc3899791990', '170f5fd4-58f8-4b05-aba4-23522f35800f', NULL, 'eng'),
	('anything else?', NULL, '6b9070ba-f799-48c4-b5cb-ff35015a174a', '90108f59-7968-457f-9744-2e3b44e980dd', NULL, 'eng'),
	('it''s raining (currently)', NULL, 'f2f668b7-79f4-447a-aa64-a04314920527', '9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471', NULL, 'eng'),
	('it''s not raining', NULL, '1b5bb3e8-4a2b-4f1a-971f-15ec6564a14f', '5b5cc7ec-702e-4dc1-a568-0dcc660c25bb', NULL, 'eng'),
	('no', NULL, 'a8f1054e-839c-4fec-b99b-cf84f21b5f03', 'f878e60f-9647-4728-a368-fc8681b0acbb', NULL, 'eng'),
	('yes', NULL, '748fe4d8-dff8-400a-8185-966a13349698', '1395ae94-46d9-4a54-92f5-fb8b76db896b', NULL, 'eng'),
	('turn left at the signal', NULL, 'f680cf5c-62af-4396-b588-9addf033dbe8', '4d3207d1-a0bf-4504-831e-bfadb834d315', NULL, 'eng'),
	('what''s going on?', NULL, 'b42e8cb4-e887-451c-95e3-5788a4c06cce', 'fae20b24-42dc-4b9e-aebc-22afcdfc4689', NULL, 'eng'),
	('what''s your name? (formal)', NULL, '7f2efa16-19e6-4ee5-bd12-c33d975db3c0', '1d44afd2-1274-47ec-8107-36bd09861c3d', NULL, 'eng'),
	('Hurry up / let''s go', NULL, '816036fc-ba5f-436b-9f05-76eff32d56a7', '0dd3a1d6-6a2c-4061-b6c0-51f6fb829082', NULL, 'eng'),
	('J''ai faim', NULL, '15cf21ae-c5dd-45b9-a545-c6b80ceace30', '674b81c7-eb26-4247-96cb-0c02378ee004', NULL, 'fra'),
	('Je te promet', NULL, 'b28253e0-475b-4b9a-937a-a33affde75ce', 'b97d6fed-d12f-4272-b92c-7d8525550207', NULL, 'fra'),
	('C''est mal', NULL, '00cc153f-2f0a-4ac6-b504-e6f3c9b6a0d0', 'a29cea29-acbf-4ef9-bd00-8fab74c30335', NULL, 'fra'),
	('bonjour', NULL, '186fb585-3f29-4bd0-9f2b-5aa891dc8a39', 'c545194f-b50f-4a44-bc75-a9f90a3538da', NULL, 'fra'),
	('don''t worry (slang)', NULL, '82f70893-ed01-458d-9362-e3e48e6bbde0', '222e15d2-e94d-4369-912e-89186e222863', NULL, 'eng'),
	('here or ethere', NULL, '2ecb1d4b-3f0c-43d8-bc29-d6fe209439f0', '70182dec-e235-4aa5-9364-5d1c7c91fa59', NULL, 'eng'),
	('go lie down', NULL, '859cee3d-01b2-4fd7-b617-0122dfde3baa', 'c8cca0b1-7176-4418-ba82-279e97278a1b', NULL, 'eng'),
	('is it possible?', NULL, '93be8de2-ed9e-4625-86f9-3fbe93a3e18f', '24730a53-1b7f-422c-83ab-0cd3a51c2fe3', NULL, 'eng'),
	('who, what, why, when, where, how', NULL, '5b2f3323-e201-42c9-ac9a-fbf1e2e4bb83', '24a18665-a343-4960-99fc-7e5ed54accb0', NULL, 'eng'),
	('one, two, three, four, five, six, seven, eight, nine, ten', NULL, '2da0ebd1-3208-49c3-b811-739d6a37976b', '295fbba3-892c-43f9-84ba-85cf15fd28a5', NULL, 'eng'),
	('here or there?', NULL, '049f2c58-cd5c-4059-913e-42f5a388a80a', '2b15b306-52f0-4493-bab5-634287a7fb47', NULL, 'eng'),
	('seldom
', NULL, '35cacbea-8357-4680-83ef-035dbad7f03e', '222e15d2-e94d-4369-912e-89186e222863', NULL, 'aar'),
	('test', NULL, '87a7562c-d441-4453-b8e2-46a34fbb8897', '2fbae84f-5b1d-43c2-8927-ef4d41c7e794', NULL, 'ben'),
	('test', NULL, '28eed032-9c30-4c82-8af0-c82605b02db5', 'a8fbdb84-24bf-456e-836c-b355355caa45', NULL, 'eng'),
	('Order whatever you want', NULL, '9636df03-4f07-4b6b-bfc4-6ed64e735ad7', '1b6c63dd-177f-411e-8f87-bf2b3fe7c927', NULL, 'eng'),
	('Idziemy', NULL, '83989c7a-43e5-4998-a169-2360570a8f60', '24746d12-8a65-47e7-97c5-87c828585db6', NULL, 'pol'),
	('let it be', NULL, 'f3107fdb-f6c3-4fa7-9f72-4c445cecfc67', 'e24dd614-0033-4c9c-a72a-475f96dcfca6', NULL, 'eng'),
	('let it go', NULL, 'b372ce01-adf1-4645-af67-27e2344f8d01', 'd40c50fd-fd7b-4c47-af68-c85ef6879ac9', NULL, 'eng'),
	('I don''t know much Tamil', NULL, 'c7c30719-ec21-4010-8ee4-a9308a861e1c', '12536684-0b35-4aff-80cd-f4ce56c866b6', NULL, 'eng'),
	('Je ne parle pas beaucoup de Tamil', NULL, '38e042a3-7bc7-4c0e-a034-c44d340a7355', '12536684-0b35-4aff-80cd-f4ce56c866b6', NULL, 'fra'),
	('The rope has burned down, but the strength has not gone', NULL, '20acc9e2-6612-4a65-80ec-94964fa04676', 'b53afc7f-1349-4f28-aafb-3f471009dd97', NULL, 'eng'),
	('God willing', NULL, '054fae81-8e0c-42c3-a662-76d36cfe2052', 'f250e23f-0aee-48d8-bb6f-1be22c0df7c7', NULL, 'eng'),
	('is there anything else quite like this?', NULL, '3abeabf7-4ac6-49f5-97ae-d29b7884e524', '7b396c7b-18c4-4e58-97a0-bc4687e67427', NULL, 'eng'),
	('Je parle un peu de Konkani', NULL, '149899b5-7f76-44d4-8f21-69d4a3dfc061', 'a417afc8-6c80-4589-a314-55ac756b28f1', NULL, 'fra'),
	('I speak a little Konkani', NULL, '8b0144ea-a8ca-4e76-af0b-eae6ec6eeee5', 'a417afc8-6c80-4589-a314-55ac756b28f1', NULL, 'eng'),
	('Only one', NULL, '5af5e7a9-38db-40c8-90a5-0184843a16c6', '4c55ff26-b29e-48ce-8b72-0c28cd37d0c9', NULL, 'eng'),
	('How much', NULL, 'e6dd474d-ee0e-4082-9aa2-34c0b9a25c33', 'd9da12a0-18f3-4836-af4b-8ea9423848ca', NULL, 'eng'),
	('Combien', NULL, '1824c57a-c16d-40e1-b489-35f465723fd2', 'd9da12a0-18f3-4836-af4b-8ea9423848ca', NULL, 'fra'),
	('Kitna', NULL, 'c3a18806-78fc-4903-909f-e93842861278', 'd9da12a0-18f3-4836-af4b-8ea9423848ca', NULL, 'hin'),
	('Tell me this', NULL, 'e102d4f0-e44c-40f8-8b47-cd75efb5aa5f', 'de1df463-8186-4748-9557-0de18c1a16ef', NULL, 'eng'),
	('Tell me that', NULL, 'de9fb404-8f20-48d2-9639-6fc41a5e9d5e', 'ae43221d-6be8-468c-9af8-71bbab95c1ec', NULL, 'eng'),
	('What will I say?', NULL, 'a439af80-b7bf-4a7c-b6c6-c36b7c0892b0', 'ee043244-9de8-4419-aee8-8ba2f3f5edcc', NULL, 'eng'),
	('What do I say?', NULL, '08234f41-57c9-4705-9159-f5a76ea85720', 'bbe138a2-1bec-44a0-afb5-679ecc0b2214', NULL, 'eng'),
	('Thank you', NULL, '5b219133-906c-4167-a0e8-980363e989ed', '5b714f21-94e2-4345-88ca-7ea25a5bf988', NULL, 'eng'),
	('Merci', NULL, '9c9f9b2c-b264-4667-a190-998130570523', '5b714f21-94e2-4345-88ca-7ea25a5bf988', NULL, 'fra'),
	('How much (baht)? ', NULL, '46bdf4fa-b11c-41e4-8d4d-5fe077494e4e', 'd546b14b-0bdf-48fa-9f55-0fa3ac1f3af7', NULL, 'eng'),
	('Thank you', NULL, '5cdfea65-27fb-4dbd-a138-c501ed67d4b4', 'faae3442-2957-431d-b055-e8910b3c26ad', NULL, 'eng'),
	('Day, week, month, year', NULL, 'aa2980a0-1c3c-4a5c-b471-b19adf3aaf37', 'f45c7d8a-acbe-42e0-8308-b2207c07eec1', NULL, 'eng'),
	('Il ne pleut pas', NULL, '9fce1e24-ba42-4c26-8cdd-d4913a6cba28', '5b5cc7ec-702e-4dc1-a568-0dcc660c25bb', NULL, 'fra'),
	('I don''t know what', NULL, 'd5b6d5bc-8ec0-41c0-b102-8df73ec812c7', 'de2f5e51-876d-4978-8a12-6146ece9202c', NULL, 'eng'),
	('Mujhe nahi pata', NULL, '9f3cff65-c6c8-496d-b060-431d6425ddf5', 'de2f5e51-876d-4978-8a12-6146ece9202c', NULL, 'hin'),
	('Rien', NULL, '11cc05ee-4109-4a55-9def-13a5964c5e64', 'bca7ad96-44f4-4d58-b5b0-004f4450209a', NULL, 'fra'),
	('Let''s go', NULL, '0ce11cee-4687-4b06-b807-ec76d7728fb4', 'fd535752-d602-4ab8-8656-9e11692f30fc', NULL, 'eng'),
	('You hairdresser of capitalist pigs', NULL, 'ea0cd14f-0add-4c66-a1b3-981159de43e9', 'e0eef035-e5bd-45be-902a-62002512673b', NULL, 'eng'),
	('Sir are you coming to the map location?', NULL, '4ec5190e-8639-47a5-84e9-62b26580996f', '235ce61c-be21-4697-815d-d5aa1a4ff121', NULL, 'eng'),
	('Tu te rappelles?', NULL, 'c2338647-30c8-4b3e-9ace-01a4ab35bdc5', 'ffc9e2ca-7c33-4c6f-a64a-9a8d67fe2e30', NULL, 'fra'),
	('J''ai oublié', NULL, 'e9dbb869-dafd-4030-b67b-453f339e37b7', '37dd6e13-d915-4c41-8767-17cdd74beb96', NULL, 'fra'),
	('I forgot', NULL, '4e2f31cc-c439-4f4e-b942-c37a42873fa6', '37dd6e13-d915-4c41-8767-17cdd74beb96', NULL, 'eng'),
	('Excuse me', NULL, 'd52f6dd3-0e2e-4b82-85b8-5ca0b0a20199', '288676f6-d224-4cf2-8ab1-abae8076f24b', NULL, 'eng'),
	('Je ne parle pas Allemande', NULL, '072226ab-81ca-4640-8e07-a2361bd395c4', '7d9a7e8b-4e6c-412d-8adb-7923dff1e04f', NULL, 'fra'),
	('I don''t speak German', NULL, 'c2a37f9f-e9f7-4561-bff7-42b00f539586', '7d9a7e8b-4e6c-412d-8adb-7923dff1e04f', NULL, 'eng'),
	('bon chance', NULL, 'd001d4d4-be73-4150-9f09-4079a3b0125e', '7280cf0c-a394-40ee-92f4-0b68f08b16a2', NULL, 'fra'),
	('Ici ou la bas?', NULL, 'd9dfc6d5-5d9f-477e-935e-eadb2dcc09ee', '2b15b306-52f0-4493-bab5-634287a7fb47', NULL, 'fra'),
	('here or there', NULL, 'eeff2bad-6934-4a97-99bc-d2de27b38409', '909ae4d6-bd02-46b1-a9f1-93469ea9ea94', NULL, 'eng'),
	('hindi translation', NULL, '83137d4f-a4fd-4535-bbd5-c494ae6fc448', '7ae6b46c-c7c8-480c-a242-0655a34b6aec', NULL, 'eng'),
	('I don''t know', NULL, '7714b290-9cf9-4430-9af4-70c7ded6b746', '163d7f57-a76f-4e5b-9346-1de5cfeba7d8', NULL, 'eng'),
	('Good evening', NULL, '7caea27f-4ce9-4ef7-a2df-f1ab04f93a8b', '2e398135-21f9-4843-a8c7-273c986979c7', NULL, 'eng'),
	('Good morning', NULL, '75f21f65-6eec-47f3-ac17-1f0d1ebfd05b', '22d2875f-1164-47a0-9572-e2d19137950d', NULL, 'eng'),
	('younger aunt, older aunt (for mom''s side)', NULL, '17cf77b8-4963-4264-8b1d-6e03095b9e58', '1f6bac22-b32a-4b77-9857-d2de02b538de', NULL, 'eng'),
	('which one, this, that, those', NULL, '4a5a9cf8-2d68-488e-8102-f3127b351017', '93d5d050-e9af-4652-9c76-9dc2a232640a', NULL, 'eng'),
	('Ten, twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred', NULL, '9d9807d8-375d-4991-b0c9-d907eea3214a', 'ed70550e-da8a-44dc-8bfd-69965375b7f9', NULL, 'eng'),
	('idk ', NULL, '51479d8b-7ee7-4abf-9926-48d9487202ed', '163d7f57-a76f-4e5b-9346-1de5cfeba7d8', NULL, 'eng'),
	('pourquois?', NULL, 'c8d1ce25-ef8d-435f-a91f-3529205ae3de', 'e060237f-1744-427a-8e8e-53da29582d35', NULL, 'fra'),
	('Hallo (sarcastic)', NULL, '97f845d8-7937-408c-98b7-95401af9e890', '0e33be07-6d4a-4c99-8282-921038188cbf', NULL, 'eng'),
	('test', NULL, '7662ae6d-0729-4d44-8a32-33f4a2f4fc39', '9e2fef5c-d144-4ea9-9b31-0bd4cefb7ee8', NULL, 'ben'),
	('test', NULL, '5707df67-252d-459b-a341-ab43b0b86179', '7f412edd-af7c-486e-a35f-3b2a7803efc9', NULL, 'eng'),
	('test 1', NULL, 'dd5e98f2-0500-407c-a855-44e6c53ff19a', 'a76bcc62-879a-4da5-95c1-de11d64bac91', NULL, 'eng'),
	('chalo', NULL, '6e4d652c-86c7-40c1-9ede-2964fd1ef688', '4677f15a-1cd9-40a3-876c-30662c5eec3f', NULL, 'hin'),
	('oi', NULL, 'dfdfeea3-e935-4e5b-aaa8-02f58feefba7', '93d5d050-e9af-4652-9c76-9dc2a232640a', NULL, 'eng'),
	('df', NULL, '8e3bcbe3-536e-4f38-bd0e-e8d5626e4dba', '93d5d050-e9af-4652-9c76-9dc2a232640a', NULL, 'eng'),
	('mk', NULL, '2d3fdc88-e64e-4a33-ae2d-de4758bc5ebd', '93d5d050-e9af-4652-9c76-9dc2a232640a', NULL, 'afr'),
	('je ne sais pas', NULL, '6c481733-c4fd-49df-887f-fe7540acc1f2', '163d7f57-a76f-4e5b-9346-1de5cfeba7d8', NULL, 'fra'),
	('are you there?', NULL, 'a17c507b-3d8e-4ea6-a2f8-a57761bfdee9', 'fa26ba78-a7a3-49f8-8516-034424477dec', NULL, 'eng'),
	('how are you?', NULL, '470a1169-b4fd-4c1f-b045-e5f928261de7', 'c3c81fa4-9c63-4569-b9b6-9c931ee3154f', NULL, 'eng'),
	('how are you? (formal)', NULL, '97364166-6850-43c6-ae23-f2f72856d207', 'b2736292-1137-41db-a453-ad203726d8c5', NULL, 'eng'),
	('comment ca va?', NULL, '9087b4da-be10-4558-8077-58503d11e073', '4b7b3741-16ce-4ce8-a9b8-70556451a8e5', NULL, 'fra'),
	('was ist (wrong)', NULL, 'a5a49d22-0ba5-4dc4-8e56-e4728fb46792', 'ddd650c2-00e9-43f1-8624-5a97282087aa', NULL, 'deu'),
	('was ist (wrong)', NULL, 'e3addd1d-1753-432a-a292-fa72155415f2', '7aac8e8f-4de1-41a0-b910-a2c9b80e47f9', NULL, 'deu'),
	('idk sorry (wrong)', NULL, 'd832c5ff-df25-4ef1-aea7-f8715c7a7806', 'de2ea356-e63d-46f7-8123-2aa9370673ec', NULL, 'eus'),
	('wrong translation', NULL, '2ba4ddc9-54da-4039-8c6e-09c963cea063', 'a2777e37-b02e-4d8b-9a39-1a9ad56af4f2', NULL, 'arg'),
	('(wrong)', NULL, '2fcb0720-0fa5-4d26-a1ae-96a95aa656a6', 'a875f6e4-a8cc-4f68-baf3-ca2aea273568', NULL, 'fra'),
	('how are ', NULL, '93e40296-23be-45d9-afcd-8c4339ca376c', '44bcd224-b4b3-46ce-b260-2136712b0907', NULL, 'eng'),
	('how are you ', NULL, '0c708924-8308-4373-a47d-1a804d4854d0', 'a00febfd-e6d6-40bc-a3b8-e31563410db8', NULL, 'eng'),
	('how are oyu', NULL, 'fcff4504-6e57-4b47-a35f-3cd62131a36a', 'c5c8cf9b-bf1a-4d4a-aff6-21b8dc86fcc9', NULL, 'eng'),
	('how are oyu', NULL, '101debe9-9e68-40ec-b69e-4af9a5b1e7a8', '49066ea2-e608-42ab-8817-1f20b0eada03', NULL, 'eng'),
	('how you', NULL, '38f195d1-a882-4bef-84c3-a2e4739e1ad2', '97f2f7cb-a1c5-4bb1-a93b-d475fa96ae68', NULL, 'eng'),
	('idk wdm', NULL, 'db19febd-3aab-4fd6-950d-f8ac50b4a288', '4677f15a-1cd9-40a3-876c-30662c5eec3f', NULL, 'eng'),
	('idk', NULL, '45da727a-0b5c-4aec-b456-3f8b9747f1b8', '93d5d050-e9af-4652-9c76-9dc2a232640a', NULL, 'eng');


--
-- Data for Name: user_deck; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_deck" ("id", "uid", "lang", "created_at", "learning_goal", "archived") VALUES
	('dfa6cb07-5f8a-43d8-bc9f-5a9f474719c4', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 'aka', '2025-01-20 07:50:10.181751+00', 'moving', false),
	('e0b23bba-fe8c-4dfb-bdd6-65b2c60644f0', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 'tam', '2025-01-20 12:51:36.631139+00', 'moving', false),
	('02be6d52-2f23-498d-ab24-a7cc0975c075', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 'hin', '2025-01-20 15:03:37.855218+00', 'moving', false);


--
-- Data for Name: user_card; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_card" ("uid", "id", "phrase_id", "user_deck_id", "updated_at", "created_at", "status") VALUES
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', '0e379159-9bc3-4781-ab61-4d4c96f472b0', '93d5d050-e9af-4652-9c76-9dc2a232640a', 'e0b23bba-fe8c-4dfb-bdd6-65b2c60644f0', '2025-01-20 12:51:47.751066+00', '2025-01-20 12:51:47.751066+00', 'active'),
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', '1e78e62a-f20c-4532-b326-16027ccf1064', '295fbba3-892c-43f9-84ba-85cf15fd28a5', 'e0b23bba-fe8c-4dfb-bdd6-65b2c60644f0', '2025-01-20 12:51:49.968547+00', '2025-01-20 12:51:49.968547+00', 'active'),
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 'ec8836e2-d1a7-4c44-ad30-0ba16f1903bf', 'fd535752-d602-4ab8-8656-9e11692f30fc', 'e0b23bba-fe8c-4dfb-bdd6-65b2c60644f0', '2025-01-20 12:51:51.433933+00', '2025-01-20 12:51:51.433933+00', 'active'),
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', '9096824e-4aee-49d7-9d18-ca14a89127c2', '12536684-0b35-4aff-80cd-f4ce56c866b6', 'e0b23bba-fe8c-4dfb-bdd6-65b2c60644f0', '2025-01-20 12:51:53.619878+00', '2025-01-20 12:51:53.619878+00', 'active'),
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', '3e26c6bd-37af-45c4-ac37-d0e9c0ee99de', '235ce61c-be21-4697-815d-d5aa1a4ff121', '02be6d52-2f23-498d-ab24-a7cc0975c075', '2025-01-20 15:05:21.529249+00', '2025-01-20 15:05:21.529249+00', 'active'),
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', '5d01f16c-d980-4aee-85f7-06acb124977d', '9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471', '02be6d52-2f23-498d-ab24-a7cc0975c075', '2025-01-20 15:05:23.890215+00', '2025-01-20 15:05:23.890215+00', 'active'),
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 'df82c504-993d-4fe0-b363-edad3b9cc50a', '5b5cc7ec-702e-4dc1-a568-0dcc660c25bb', '02be6d52-2f23-498d-ab24-a7cc0975c075', '2025-01-20 15:05:25.308879+00', '2025-01-20 15:05:25.308879+00', 'active'),
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', '326afe26-b402-4f99-8d00-70825108d3ea', '90108f59-7968-457f-9744-2e3b44e980dd', '02be6d52-2f23-498d-ab24-a7cc0975c075', '2025-01-20 15:05:26.505995+00', '2025-01-20 15:05:26.505995+00', 'active'),
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 'b211a041-abbc-4beb-a886-25042d053351', '170f5fd4-58f8-4b05-aba4-23522f35800f', '02be6d52-2f23-498d-ab24-a7cc0975c075', '2025-01-20 15:05:27.64607+00', '2025-01-20 15:05:27.64607+00', 'active'),
	('cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', '3645d9ae-ac1d-42b9-9c5a-30b9df195912', 'f1f5234e-0426-44f5-a007-b67329a70a81', '02be6d52-2f23-498d-ab24-a7cc0975c075', '2025-01-20 15:05:28.871047+00', '2025-01-20 15:05:28.871047+00', 'active');


--
-- Data for Name: user_card_review; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_card_scheduled; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_card_scheduled" ("id", "created_at", "scheduled_for", "user_card_id", "uid", "new_difficulty", "new_stability", "review_time_difficulty", "review_time_stability", "score", "new_interval_r90", "review_time_retrievability", "prev_id") VALUES
	('c617faff-e3da-4782-a50f-bb3639d059d0', '2025-01-20 12:52:53.340487+00', '2025-01-21 17:17:37.980487+00', '0e379159-9bc3-4781-ab61-4d4c96f472b0', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 6.48830526847145, 1.18385, NULL, NULL, 2, 1.183849999999999993791309291747888239, NULL, NULL),
	('e721b8c6-8317-45e9-b271-b5e725faa3b3', '2025-01-20 14:55:34.961324+00', '2025-01-21 00:35:15.281324+00', 'ec8836e2-d1a7-4c44-ad30-0ba16f1903bf', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 7.1949, 0.40255, NULL, NULL, 1, 0.40255, NULL, NULL),
	('3051ea19-ff2e-45d4-a73a-84ac74a981e5', '2025-01-20 15:06:57.075502+00', '2025-01-21 00:46:37.395502+00', 'df82c504-993d-4fe0-b363-edad3b9cc50a', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 7.1949, 0.40255, NULL, NULL, 1, 0.40255, NULL, NULL),
	('36a73687-29e8-49a0-bc28-42265225d77f', '2025-01-20 15:31:05.069924+00', '2025-01-21 19:55:49.751+00', 'df82c504-993d-4fe0-b363-edad3b9cc50a', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 6.48830526847145, 1.18385, NULL, NULL, 2, 1.18385, NULL, NULL),
	('b41f87fa-bb6a-48ab-92fb-14571bef2ab5', '2025-01-20 15:31:15.04591+00', '2025-01-21 01:10:55.367+00', 'df82c504-993d-4fe0-b363-edad3b9cc50a', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 7.1949, 0.40255, NULL, NULL, 1, 0.40255, NULL, NULL),
	('ba3318eb-3c13-464d-8a10-2412a7d8f6a8', '2025-01-20 15:31:27.438253+00', '2025-01-23 19:40:34.639+00', 'df82c504-993d-4fe0-b363-edad3b9cc50a', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 5.282434422319, 3.173, NULL, NULL, 3, 3.173, NULL, NULL),
	('19a7314c-cbcb-4cac-91e2-511688474a29', '2025-01-20 15:35:20.767866+00', '2025-01-23 19:44:28.01+00', '9096824e-4aee-49d7-9d18-ca14a89127c2', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 5.282434422319, 3.173, NULL, NULL, 3, 3.173, NULL, NULL),
	('ed712f4e-cf40-4b5f-ae0a-e11a7c770f31', '2025-01-20 15:36:43.760128+00', '2025-02-05 08:11:50.519+00', '1e78e62a-f20c-4532-b326-16027ccf1064', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 3.22450158937137, 15.69105, NULL, NULL, 4, 15.69105, NULL, NULL),
	('96a1fb45-92d3-4666-9818-50aa71942c9c', '2025-01-20 16:03:31.055846+00', '2025-01-21 01:43:11.418+00', 'b211a041-abbc-4beb-a886-25042d053351', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 7.1949, 0.40255, NULL, NULL, 1, 0.40255, NULL, NULL),
	('6e8329e2-6a8a-4553-a447-51a87380029f', '2025-01-20 16:03:32.43153+00', '2025-01-21 01:43:12.791+00', 'b211a041-abbc-4beb-a886-25042d053351', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 7.1949, 0.40255, NULL, NULL, 1, 0.40255, NULL, NULL),
	('53f669fa-85f7-417f-95b8-3605bf59f1d7', '2025-01-20 16:03:44.577263+00', '2025-01-21 01:43:24.938+00', 'b211a041-abbc-4beb-a886-25042d053351', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 7.1949, 0.40255, NULL, NULL, 1, 0.40255, NULL, NULL),
	('b09fda9a-dc9f-4a78-9ac0-9aeb2f965a39', '2025-01-20 16:10:55.20476+00', '2025-01-21 20:35:39.888+00', '5d01f16c-d980-4aee-85f7-06acb124977d', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 6.48830526847145, 1.18385, NULL, NULL, 2, 1.18385, NULL, NULL),
	('f39a43c4-eda6-4144-8925-bd3e721c9fde', '2025-01-20 16:10:56.554185+00', '2025-01-21 01:50:36.875+00', '5d01f16c-d980-4aee-85f7-06acb124977d', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 7.1949, 0.40255, NULL, NULL, 1, 0.40255, NULL, NULL),
	('9020d8bd-0a22-4764-8d02-80acd9318eb3', '2025-01-20 16:49:57.219649+00', '2025-01-23 20:59:04.464+00', '1e78e62a-f20c-4532-b326-16027ccf1064', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 5.282434422319, 3.173, NULL, NULL, 3, 3.173, NULL, NULL),
	('8b72e51a-465a-4660-9beb-d688691ab1d5', '2025-01-20 16:50:02.872266+00', '2025-01-21 21:14:47.513+00', '1e78e62a-f20c-4532-b326-16027ccf1064', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', 6.48830526847145, 1.18385, NULL, NULL, 2, 1.18385, NULL, NULL);


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id") VALUES
	('avatars', 'avatars', NULL, '2023-02-07 08:42:36.648912+00', '2023-02-07 08:42:36.648912+00', true, false, NULL, NULL, NULL);


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('ad3cb492-2c2a-4f99-b332-227a6ee44600', 'avatars', 'Screenshot from 2025-01-20 22-38-24-1a82b1.png', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', '2025-01-20 17:09:13.335766+00', '2025-01-20 17:09:13.335766+00', '2025-01-20 17:09:13.335766+00', '{"eTag": "\"44959b1a8ffe5ddc76cfb438a646e9c2\"", "size": 16325, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2025-01-20T17:09:14.000Z", "contentLength": 16325, "httpStatusCode": 200}', '9d451d1c-2831-4228-88bf-81349b1bf97f', 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', NULL); 

--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 2787, true);


--
-- Name: key_key_id_seq; Type: SEQUENCE SET; Schema: pgsodium; Owner: supabase_admin
--

SELECT pg_catalog.setval('"pgsodium"."key_key_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

RESET ALL;
