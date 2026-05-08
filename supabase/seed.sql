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
