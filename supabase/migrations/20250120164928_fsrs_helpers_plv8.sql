drop function if exists "public"."error_example" ();

drop function if exists "public"."fsrs_delta_d" (score numeric);

drop function if exists "public"."fsrs_difficulty" (difficulty numeric, score numeric);

drop function if exists "public"."fsrs_dp" (difficulty numeric, score numeric);

drop function if exists "public"."fsrs_s_0" (score numeric);

drop function if exists "public"."fsrs_stability" (
	difficulty numeric,
	stability numeric,
	review_time_retrievability numeric,
	score numeric
);

drop function if exists "public"."fsrs_difficulty" (difficulty numeric, score integer);

drop function if exists "public"."fsrs_dp" (difficulty numeric, score integer);

drop function if exists "public"."fsrs_stability" (
	difficulty numeric,
	stability numeric,
	review_time_retrievability numeric,
	score integer
);

create extension plv8;

create or replace function public.fsrs_clamp_d (difficulty numeric) returns numeric language plv8 as $function$
  return Math.min(Math.max(difficulty, 1.0), 10.0);
$function$;

create or replace function public.fsrs_d_0 (score integer) returns numeric language plv8 as $function$
	const W_4 = 7.1949;
	const W_5 = 0.5345;
	return plv8.find_function("fsrs_clamp_d")(W_4 - Math.exp(W_5 * (score - 1.0)) + 1.0);
$function$;

create or replace function public.fsrs_delta_d (score integer) returns numeric language plv8 as $function$
	const W_6 = 1.4604;
  return -W_6 * (score - 3.0);
$function$;

create or replace function public.fsrs_dp (difficulty numeric, score integer) returns numeric language plv8 as $function$
	return difficulty + plv8.find_function("fsrs_delta_d")(score) * ((10.0 - difficulty) / 9.0);
$function$;

create or replace function public.fsrs_difficulty (difficulty numeric, score integer) returns numeric language plv8 as $function$
	const W_7 = 0.0046;
	return plv8.find_function("fsrs_clamp_d")(W_7 * plv8.find_function("fsrs_d_0")(4) + (1.0 - W_7) * plv8.find_function("fsrs_dp")(difficulty, score));
$function$;

create or replace function public.fsrs_interval (desired_retrievability numeric, stability numeric) returns numeric language plv8 as $function$
	const f = 19.0 / 81.0;
	const c = -0.5;
	return (stability / f) * (Math.pow(desired_retrievability, 1.0 / c) - 1.0);
$function$;

create or replace function public.fsrs_retrievability (time_in_days numeric, stability numeric) returns numeric language plv8 as $function$
	const f = 19.0 / 81.0;
	const c = -0.5;
	return Math.pow(1.0 + f * (time_in_days / stability), c);
$function$;

create or replace function public.fsrs_s_0 (score integer) returns numeric language plv8 as $function$
	const W = [0.40255, 1.18385, 3.173, 15.69105];
	return W[score - 1];
$function$;

create or replace function public.fsrs_s_fail (
	difficulty numeric,
	stability numeric,
	review_time_retrievability numeric
) returns numeric language plv8 as $function$
	const W_11 = 1.9395;
	const W_12 = 0.11;
	const W_13 = 0.29605;
	const W_14 = 2.2698;
	const d_f = Math.pow(difficulty, -W_12);
	const s_f = Math.pow(stability + 1.0, W_13) - 1.0;
	const r_f = Math.exp(W_14 * (1.0 - review_time_retrievability));
	const c_f = W_11;
	const s_f2 = d_f * s_f * r_f * c_f;
	return Math.min(s_f2, stability);
$function$;

create or replace function public.fsrs_s_success (
	difficulty numeric,
	stability numeric,
	review_time_retrievability numeric,
	score integer
) returns numeric language plv8 as $function$
	const W_8 = 1.54575;
	const W_9 = 0.1192;
	const W_10 = 1.01925;
	const W_15 = 0.2315;
	const W_16 = 2.9898;
	const t_d = 11.0 - difficulty;
	const t_s = Math.pow(stability, -W_9);
	const t_r = Math.exp(W_10 * (1.0 - review_time_retrievability)) - 1.0;
	const h = score === 2 ? W_15 : 1.0;
	const b = score === 4 ? W_16 : 1.0;
	const c = Math.exp(W_8);
	const alpha = 1.0 + t_d * t_s * t_r * h * b * c;
  return stability * alpha;
$function$;

create or replace function public.fsrs_stability (
	difficulty numeric,
	stability numeric,
	review_time_retrievability numeric,
	score integer
) returns numeric language plv8 as $function$
	return (score === 1) ?
			plv8.find_function("fsrs_s_fail")(difficulty, stability, review_time_retrievability)
		: plv8.find_function("fsrs_s_success")(difficulty, stability, review_time_retrievability, score);
$function$;
