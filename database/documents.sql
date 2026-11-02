CREATE TABLE documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    coverage_id INT NULL,
    document_type VARCHAR(50),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT,
    ocr_status VARCHAR(20),
    extracted_data JSON,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_documents_asset
        FOREIGN KEY (asset_id)
        REFERENCES assets(asset_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_documents_coverage
        FOREIGN KEY (coverage_id)
        REFERENCES coverage(coverage_id)
        ON DELETE SET NULL
);