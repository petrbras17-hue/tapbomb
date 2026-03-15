-- ═══ TAPBOMB Database Schema ═══

CREATE TABLE IF NOT EXISTS users (
    id              BIGINT PRIMARY KEY,
    username        VARCHAR(64),
    first_name      VARCHAR(128) NOT NULL DEFAULT 'Player',
    balance         BIGINT NOT NULL DEFAULT 0,
    total_taps      BIGINT NOT NULL DEFAULT 0,
    energy          INT NOT NULL DEFAULT 1000,
    energy_max      INT NOT NULL DEFAULT 1000,
    multiplier      INT NOT NULL DEFAULT 1,
    level           INT NOT NULL DEFAULT 1,
    passive_per_hr  INT NOT NULL DEFAULT 0,
    skin            VARCHAR(32) NOT NULL DEFAULT 'default',
    referred_by     BIGINT REFERENCES users(id),
    trust_score     REAL NOT NULL DEFAULT 1.0,
    last_energy_ts  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    item_key        VARCHAR(64) NOT NULL,
    price_paid      BIGINT NOT NULL,
    purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quest_progress (
    user_id         BIGINT NOT NULL REFERENCES users(id),
    quest_key       VARCHAR(64) NOT NULL,
    progress        INT NOT NULL DEFAULT 0,
    claimed         BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, quest_key)
);

CREATE TABLE IF NOT EXISTS tap_sessions (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    tap_count       INT NOT NULL,
    earned          BIGINT NOT NULL,
    duration_ms     INT NOT NULL,
    avg_interval_ms REAL,
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_earnings (
    id              SERIAL PRIMARY KEY,
    referrer_id     BIGINT NOT NULL REFERENCES users(id),
    referee_id      BIGINT NOT NULL REFERENCES users(id),
    amount          BIGINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id              SERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    event           VARCHAR(64) NOT NULL,
    screen          VARCHAR(32),
    properties      VARCHAR(2048),
    session_id      VARCHAR(64),
    device_info     VARCHAR(256),
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══ INDEXES ═══
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC);
CREATE INDEX IF NOT EXISTS idx_tap_sessions_user ON tap_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event, timestamp);
