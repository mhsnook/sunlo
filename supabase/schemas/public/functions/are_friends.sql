CREATE OR REPLACE FUNCTION public.are_friends (
  uid1 uuid,
  uid2 uuid
)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.friend_summary
    WHERE
      status = 'friends' AND
      (
        (uid_less = uid1 AND uid_more = uid2) OR
        (uid_less = uid2 AND uid_more = uid1)
      )
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."are_friends"(uuid, uuid) TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."are_friends"(uuid, uuid) TO "service_role";

REVOKE ALL ON FUNCTION "public"."are_friends"(uuid, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."are_friends"(uuid, uuid) TO "postgres";
