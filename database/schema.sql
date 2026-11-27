-- Store API database schema
CREATE DATABASE IF NOT EXISTS store_api
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE store_api;

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description TEXT NULL,
    price       DECIMAL(10, 2) NOT NULL,
    stock       INT UNSIGNED NOT NULL DEFAULT 0,
    category    VARCHAR(60) NOT NULL,
    created_by  INT UNSIGNED NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_user FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_products_category (category),
    INDEX idx_products_price (price),
    FULLTEXT INDEX ft_products_search (name, description)
) ENGINE=InnoDB;

-- Sample data
INSERT INTO products (name, description, price, stock, category) VALUES
  ('Gaming Laptop', '15.6" display, RTX graphics, 16GB RAM', 1499.99, 5, 'electronics'),
  ('Wireless Mouse', 'Ergonomic 2.4GHz mouse', 29.50, 120, 'electronics'),
  ('Mechanical Keyboard', 'Hot-swappable switches, RGB', 89.00, 40, 'electronics'),
  ('Office Chair', 'Ergonomic mesh chair with lumbar support', 249.00, 12, 'furniture'),
  ('Standing Desk', 'Electric height-adjustable desk', 399.00, 7, 'furniture');
