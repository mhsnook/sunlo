--
-- Data for Name: phrase; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."phrase" ("text", "id", "added_by", "lang", "created_at", "text_script")
values
	(
		'Ondu tea kodhe',
		'884b7e6d-5aa0-49ba-be42-e26d37e20f12',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'kan',
		now() - interval '20 hours',
		null
	),
	(
		'Nānu eraḍu dōse tinde',
		'223330a3-9bba-496f-aa45-1007d462e676',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'kan',
		now() - interval '20 hours',
		null
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
		'give one tea',
		null,
		'c2675944-aeed-4c54-ad7b-5f9c0206dbaf',
		'884b7e6d-5aa0-49ba-be42-e26d37e20f12',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'eng',
		null,
		now() - interval '20 hours'
	),
	(
		'I ate two dosas',
		null,
		'ea93655a-54cb-40f8-bde8-05cba68beb0b',
		'223330a3-9bba-496f-aa45-1007d462e676',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'eng',
		null,
		now() - interval '20 hours'
	);

--
-- Data for Name: phrase_playlist; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."phrase_playlist" (
		"id",
		"uid",
		"title",
		"description",
		"href",
		"created_at",
		"lang"
	)
values
	(
		'05ddae3c-a241-43c2-b3e1-228a56867097',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'Kannada Gothilla Pod: Counting Numbers, July 2021',
		'Kannada Gothilla Podcast episode on the counting numbers! How to count, the overall counting "system" in Kannada, and some phrases where you''d use the numbers in daily life.',
		'https://open.spotify.com/episode/7camUCOPmHHa1Mu4lSdI3L',
		now() - interval '20 hours',
		'kan'
	);

--
-- Data for Name: playlist_phrase_link; Type: TABLE DATA; Schema: public; Owner: postgres
--
insert into
	"public"."playlist_phrase_link" (
		"id",
		"uid",
		"phrase_id",
		"playlist_id",
		"order",
		"href",
		"created_at"
	)
values
	(
		'9fe148ee-a2f1-4036-a03e-8d23a268d033',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'884b7e6d-5aa0-49ba-be42-e26d37e20f12',
		'05ddae3c-a241-43c2-b3e1-228a56867097',
		0,
		null,
		now() - interval '20 hours'
	),
	(
		'198c49cb-60b8-4a8c-ab7d-b88246244dac',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'223330a3-9bba-496f-aa45-1007d462e676',
		'05ddae3c-a241-43c2-b3e1-228a56867097',
		1,
		null,
		now() - interval '20 hours'
	);
