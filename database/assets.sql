CREATE TABLE assets (
    asset_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    asset_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    brand VARCHAR(50),
    model VARCHAR(50),
    purchase_date DATE,
    purchase_value DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_assets_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);