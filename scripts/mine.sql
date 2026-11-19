SELECT vid, uniqExact(by) AS recs, count() AS mentions, toYear(min(time)) AS first_year, toYear(max(time)) AS last_year
FROM (
  SELECT arrayJoin(arrayMap(x -> substring(x, -11), extractAll(replaceAll(replaceAll(text, '&#x2F;', '/'), '&amp;', '&'),
    'youtu\\.be/[A-Za-z0-9_-]{11}|youtube\\.com/watch\\?(?:[^" <]*?&)?v=[A-Za-z0-9_-]{11}'))) AS vid, by, time
  FROM hackernews WHERE type = 'comment' AND text LIKE '%youtu%' AND deleted = 0 AND dead = 0
  UNION ALL
  SELECT arrayJoin(arrayMap(x -> substring(x, -11), extractAll(url, 'youtu\\.be/[A-Za-z0-9_-]{11}|youtube\\.com/watch\\?(?:[^ ]*?&)?v=[A-Za-z0-9_-]{11}'))) AS vid, by, time
  FROM hackernews WHERE type = 'story' AND url LIKE '%youtu%'
)
GROUP BY vid HAVING recs >= 2
ORDER BY recs DESC, mentions DESC
