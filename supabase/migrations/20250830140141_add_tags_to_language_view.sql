create or replace view "public"."language_plus" as  WITH first AS (
         SELECT l.lang,
            l.name,
            l.alias_of,
            ( SELECT count(DISTINCT d.uid) AS count
                   FROM user_deck d
                  WHERE ((l.lang)::text = (d.lang)::text)) AS learners,
            ( SELECT count(DISTINCT p.id) AS count
                   FROM phrase p
                  WHERE ((l.lang)::text = (p.lang)::text)) AS phrases_to_learn
           FROM language l
          GROUP BY l.lang, l.name, l.alias_of
        ), second AS (
         SELECT first.lang,
            first.name,
            first.alias_of,
            first.learners,
            first.phrases_to_learn,
            (first.learners * first.phrases_to_learn) AS display_score
           FROM first
          ORDER BY (first.learners * first.phrases_to_learn) DESC
        )
 SELECT second.lang,
    second.name,
    second.alias_of,
    second.learners,
    second.phrases_to_learn,
    rank() OVER (ORDER BY second.display_score DESC) AS rank,
    rank() OVER (ORDER BY second.display_score DESC, second.name) AS display_order,
    ARRAY( SELECT tag.name
           FROM tag
          WHERE ((tag.lang)::text = (second.lang)::text)) AS tags
   FROM second;



