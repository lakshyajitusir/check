-- ==========================================
-- DATABASE CREATION
-- ==========================================

-- Create the database if it doesn't already exist
CREATE DATABASE IF NOT EXISTS Ankit;

-- Select the database to use
USE Ankit;

-- ==========================================
-- TABLE CREATION
-- ==========================================

-- Create the users table
-- id: integer, automatically increments, primary key (unique identifier)
-- name: string (up to 100 characters), cannot be null
-- email: string (up to 100 characters), cannot be null, must be unique
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- ==========================================
-- OPTIONAL: DUMMY DATA
-- ==========================================
-- Insert some initial dummy data for testing purposes
INSERT INTO users (name, email) VALUES 
('John Doe', 'john.doe@example.com'),
('Jane Smith', 'jane.smith@example.com'),
('Alice Johnson', 'alice.j@example.com');
