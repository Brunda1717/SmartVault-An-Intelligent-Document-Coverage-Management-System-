CREATE TABLE coverage (
    coverage_id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    coverage_type VARCHAR(50) NOT NULL,
    provider VARCHAR(100),
    policy_number VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_coverage_asset
        FOREIGN KEY (asset_id)
        REFERENCES assets(asset_id)
        ON DELETE CASCADE
);