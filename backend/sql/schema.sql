CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    provider VARCHAR(50),
    provider_id VARCHAR(255) UNIQUE,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_email_otps_email ON email_otps(email);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN('income', 'expense')),
    icon VARCHAR(50),
    color VARCHAR(7),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id,name,type)
);

CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN('credit','debit')),
    bank VARCHAR(100),
    brand VARCHAR(30),
    last_four VARCHAR(4),
    color VARCHAR(7) DEFAULT '#6366F1',
    is_default BOOLEAN DEFAULT FALSE,
    provider VARCHAR(50),
    provider_card_id VARCHAR(255),
    connection_id INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cards_user ON cards(user_id);

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    provider_account_id VARCHAR(255),
    name VARCHAR(200),
    currency VARCHAR(10),
    last_synced_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bank_connections (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_connection_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    encrypted_access_token TEXT,
    encrypted_refresh_token TEXT,
    token_type VARCHAR(50),
    scope VARCHAR(255),
    expires_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider, provider_connection_id)
);

CREATE TABLE bank_accounts (
    id SERIAL PRIMARY KEY,
    connection_id INT NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_account_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    account_type VARCHAR(100),
    currency VARCHAR(10),
    balance NUMERIC(18,2),
    last_synced_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, provider_account_id)
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    card_id INT REFERENCES cards(id) ON DELETE SET NULL,
    account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
    provider VARCHAR(50),
    provider_account_id VARCHAR(255),
    provider_txn_id VARCHAR(255),
    raw_json JSONB,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    type VARCHAR(10) NOT NULL CHECK (type IN('income','expense')),
    description VARCHAR(255),
    notes TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bank_transactions (
    id SERIAL PRIMARY KEY,
    connection_id INT NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    account_id INT REFERENCES bank_accounts(id) ON DELETE SET NULL,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_transaction_id VARCHAR(255) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    merchant VARCHAR(255),
    raw_json JSONB,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, provider_transaction_id)
);

CREATE INDEX idx_txn_user_date ON transactions(user_id,transaction_date DESC);
CREATE INDEX idx_txn_category ON transactions(category_id);
CREATE INDEX idx_txn_card ON transactions(card_id);

CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    period VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (period IN('monthly','weekly')),
    start_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id,category_id,period)
);

CREATE TABLE ai_insights (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    period_start DATE,
    period_end DATE,
    content_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_user_created ON ai_insights(user_id, created_at DESC);
