// Import the Express library to create our web server
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import the MySQL library to connect to our database
const mysql = require('mysql2');

// Initialize the Express application
const app = express();
const JWT_SECRET = 'your_super_secret_jwt_key';

// Set the port number where our server will run
const PORT = 3000;

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================

// Middleware to parse incoming JSON data from the frontend
app.use(cors());
app.use(express.json());

// Middleware to parse URL-encoded data (like form submissions)
app.use(express.urlencoded({ extended: true }));



// ==========================================
// DATABASE CONNECTION
// ==========================================

// Create a connection pool to MySQL
// Using a pool is better than a single connection because it manages multiple simultaneous connections efficiently
const pool = mysql.createPool({
    host: 'localhost',      // The server where MySQL is running
    user: 'root',           // The MySQL username
    password: 'root',       // The MySQL password
    database: 'Anjit1',      // The name of the database we created
    waitForConnections: true,
    connectionLimit: 10,    // Maximum number of connections in the pool
    queueLimit: 0
});

// Convert the pool to use Promises, allowing us to use async/await
const db = pool.promise();

// Test the database connection when the server starts
pool.getConnection((err, connection) => {
    if (err) {
        // If there's an error connecting to MySQL, print it to the console
        console.error('Error connecting to MySQL:', err.message);
    } else {
        // If successful, display this message
        console.log('MySQL Connected');
        // Release the connection back to the pool
        connection.release();
    }
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required.' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        const [result] = await db.query(query, [name, email, hashedPassword]);
        
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email already exists.' });
        res.status(500).json({ message: 'Error registering user.' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
        
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(400).json({ message: 'Invalid credentials.' });
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });
        
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in.' });
    }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied.' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// ==========================================
// CRUD ROUTES
// ==========================================

/**
 * READ ALL USERS (GET /users)
 * This route fetches all records from the 'users' table.
 */
app.get('/users', authenticateToken, async (req, res) => {
    try {
        // SQL query to select all columns (*) from the users table
        const query = 'SELECT * FROM users';
        
        // Execute the query. 'rows' will contain the actual data.
        const [rows] = await db.query(query);
        
        // Send the rows back to the frontend as a JSON response with a 200 OK status
        res.status(200).json(rows);
    } catch (error) {
        // If an error occurs, log it and send a 500 Internal Server Error status
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Error fetching users from database.' });
    }
});

/**
 * READ A SINGLE USER (GET /users/:id)
 * This route fetches a specific user by their ID.
 */
app.get('/users/:id', authenticateToken, async (req, res) => {
    try {
        // Extract the user ID from the URL parameters
        const userId = req.params.id;
        
        // SQL query to select a user where the id matches the provided ID.
        // We use ? (parameterized query) to prevent SQL Injection attacks.
        const query = 'SELECT * FROM users WHERE id = ?';
        
        // Execute the query passing the userId as the parameter
        const [rows] = await db.query(query, [userId]);
        
        // If the query didn't return any rows, the user doesn't exist
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Return the first row (since IDs are unique, there will only be one)
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user from database.' });
    }
});

/**
 * CREATE A NEW USER (POST /users)
 * This route inserts a new user into the database.
 */
app.post('/users', authenticateToken, async (req, res) => {
    try {
        // Extract name, email and password from the request body sent by the frontend
        const { name, email, password } = req.body;
        
        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // SQL query to insert a new row into the users table.
        const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        
        // Execute the query passing the variables as an array
        const [result] = await db.query(query, [name, email, hashedPassword]);
        
        // Return a success message and the ID of the newly created user (201 Created)
        res.status(201).json({ 
            message: 'User created successfully.',
            id: result.insertId 
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user in database.' });
    }
});

/**
 * UPDATE AN EXISTING USER (PUT /users/:id)
 * This route updates a user's details based on their ID.
 */
app.put('/users/:id', authenticateToken, async (req, res) => {
    try {
        // Extract the user ID from the URL
        const userId = req.params.id;
        
        // Extract the updated name and email from the request body
        const { name, email } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required.' });
        }
        
        // SQL query to update the name and email of a specific user.
        // We use parameterized query for security.
        const query = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
        
        // Execute the query
        const [result] = await db.query(query, [name, email, userId]);
        
        // Check if any rows were affected. If 0, the user wasn't found.
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Return a success message
        res.status(200).json({ message: 'User updated successfully.' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user in database.' });
    }
});

/**
 * DELETE A USER (DELETE /users/:id)
 * This route deletes a user from the database based on their ID.
 */
app.delete('/users/:id', authenticateToken, async (req, res) => {
    try {
        // Extract the user ID from the URL
        const userId = req.params.id;
        
        // SQL query to delete a user where the id matches.
        // We use parameterized query for security.
        const query = 'DELETE FROM users WHERE id = ?';
        
        // Execute the query
        const [result] = await db.query(query, [userId]);
        
        // Check if any rows were affected. If 0, the user wasn't found.
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        // Return a success message
        res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user from database.' });
    }
});

// ==========================================
// START THE SERVER
// ==========================================

// Tell the Express app to listen for incoming requests on the specified port
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
