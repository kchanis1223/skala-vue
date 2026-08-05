-- 전역 리더보드용 테이블. Neon 콘솔 SQL Editor에 붙여넣어서 실행하면 됨
CREATE TABLE IF NOT EXISTS flights (
  id         BIGSERIAL PRIMARY KEY,
  pilot      VARCHAR(20) NOT NULL,
  city_id    TEXT NOT NULL,
  city_name  TEXT NOT NULL,
  score      INT NOT NULL,
  distance   INT NOT NULL,
  duration   REAL NOT NULL,
  crashed    BOOLEAN NOT NULL,
  condition  TEXT,
  wind_speed REAL,
  temp       REAL,
  flown_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flights_city_score ON flights (city_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_flights_score ON flights (score DESC);
