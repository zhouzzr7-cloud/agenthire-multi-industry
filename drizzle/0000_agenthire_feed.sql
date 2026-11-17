CREATE TABLE agenthire_feed (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  refreshed_at TEXT NOT NULL,
  snapshot TEXT NOT NULL
);

