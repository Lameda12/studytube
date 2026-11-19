SELECT arrayJoin(extractAll(replaceAll(replaceAll(text, '&#x2F;', '/'), '&amp;', '&'),
  'youtu\\.be/[A-Za-z0-9_-]{11}\\?[^" <]*?t=[0-9hms]+|youtube\\.com/watch\\?[^" <]*?v=[A-Za-z0-9_-]{11}[^" <]*?[&?](?:t|start)=[0-9hms]+')) AS link
FROM hackernews
WHERE type = 'comment' AND text LIKE '%youtu%' AND (text LIKE '%t=%' OR text LIKE '%start=%') AND deleted = 0 AND dead = 0
