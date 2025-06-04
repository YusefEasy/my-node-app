const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config(); // Load environment variables from .env file

const app = express();

// MySQL connection details using environment variables
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST, // MySQL host from environment variable
  user: process.env.MYSQL_USER, // MySQL username from environment variable
  password: process.env.MYSQL_PASSWORD, // MySQL password from environment variable
  database: process.env.MYSQL_DATABASE, // Database name from environment variable
  port: process.env.MYSQL_PORT, // MySQL port from environment variable
});

// Connect to MySQL database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.stack);
    return;
  }
  console.log("Connected to MySQL");
});

// Enable CORS
app.use(cors());

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use express-session for session management
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Get secret from environment variable
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS in production
  })
);

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// Serve the login page (GET route for login)
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// POST Route for login (plain-text password comparison)
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Log the entered username and password for debugging
  console.log("Entered username:", username);
  console.log("Entered password:", password);

  // Query to check if the username exists
  const query = `SELECT * FROM users WHERE username = ?`;
  db.query(query, [username], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (results.length > 0) {
      const storedPassword = results[0].password; // Get the stored password from the database

      // Log the stored password from the database for debugging
      console.log("Stored password from database:", storedPassword);

      // Compare the entered password with the stored password (plain-text comparison)
      if (password === storedPassword) {
        req.session.loggedIn = true; // Set the session status to logged in
        req.session.username = username; // Optionally store the username
        console.log("Session started for username:", req.session.username); // Debug log
        res.redirect("/"); // Redirect to home page on success
      } else {
        res.status(401).json({ message: "Invalid username or password " });
      }
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  });
});

// Register new user (storing password as plain-text)
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  // Insert the new user with the plain-text password
  const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
  db.query(query, [username, password], (err) => {
    if (err) return res.status(500).json({ message: "Error registering user" });
    res.json({ message: "User registered successfully!" });
  });
});

// Middleware to check if the user is logged in
function checkLogin(req, res, next) {
  if (req.session.loggedIn) {
    next(); // If logged in, proceed to the next middleware or route handler
  } else {
    res.redirect("/login"); // If not logged in, redirect to login page
  }
}

// Protect the '/export' route with the login check
app.get("/export", checkLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "export.html"));
});

// Protect the '/data' route with the login check
app.get("/data", checkLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "data.html"));
});

// Serve the HTML files (Home page)
app.get("/", (req, res) => {
  // Check if the user is logged in
  if (req.session.loggedIn) {
    res.sendFile(path.join(__dirname, "views", "index.html"));
  } else {
    res.redirect("/login"); // Redirect to the login page if not logged in
  }
});

// API Route: Fetch all models
app.get("/api/models", (req, res) => {
  const companyId = req.query.company_id; // Get the company_id from the query parameters
  const query = companyId 
    ? "SELECT * FROM models WHERE company_id = ?" 
    : "SELECT * FROM models";
  
  db.query(query, [companyId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    rows.forEach((item) => {
      const date = new Date(item.created_at);
      const formattedDate =
        `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)} ` +
        `${date.getHours() % 12 || 12}:${date.getMinutes().toString().padStart(2, "0")}:` +
        `${date.getSeconds().toString().padStart(2, "0")} ` +
        `${date.getHours() >= 12 ? 'PM' : 'AM'}`;
      item.created_at = formattedDate;
    });

    res.json(rows);
  });
});

// Update the POST endpoint for adding models
app.post("/api/models", (req, res) => {
  const { name, price, discount, company_id } = req.body;
  const query = `INSERT INTO models (name, price, discount, company_id) VALUES (?, ?, ?, ?)`;
  db.query(query, [name, price, discount, company_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Model added successfully!" });
  });
});

// Update the PUT endpoint for updating models
app.put("/api/models/:id", (req, res) => {
  const { name, price, discount } = req.body;
  const query = `UPDATE models SET name = ?, price = ?, discount = ? WHERE id = ?`;
  db.query(query, [name, price, discount, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Model updated successfully!" });
  });
});

// API Route: Delete a model
app.delete("/api/models/:id", (req, res) => {
  const query = `DELETE FROM models WHERE id = ?`;
  db.query(query, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Model deleted successfully!" });
  });
});


// Company

// API Route to create a new company
app.post("/api/companies", (req, res) => {
  const { name } = req.body;
  const query = "INSERT INTO companies (name) VALUES (?)";

  db.query(query, [name], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // Return the newly created company with its id
    res.json({
      id: result.insertId, // The special id generated by MySQL
      name: name,
    });
  });
});

app.get("/api/companies", (req, res) => {
  db.query("SELECT * FROM companies", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API Route: Get companies with the number of models (with formatted created_at)
app.get("/api/companies-with-models", (req, res) => {
  const query = `
    SELECT companies.id, companies.name, COUNT(models.id) AS model_count, companies.created_at
    FROM companies
    LEFT JOIN models ON companies.id = models.company_id
    GROUP BY companies.id
  `;
  
  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Format the 'created_at' date to M/d/yy h:m:s tt format for companies
    rows.forEach((item) => {
      const date = new Date(item.created_at);
      item.created_at =
        `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)} ` +
        `${date.getHours() % 12 || 12}:${date.getMinutes().toString().padStart(2, "0")}:` +
        `${date.getSeconds().toString().padStart(2, "0")} ` +
        `${date.getHours() >= 12 ? 'PM' : 'AM'}`;
    });

    res.json(rows);
  });
});

// API Route to delete a company
app.delete("/api/companies/:id", (req, res) => {
  const query = "DELETE FROM companies WHERE id = ?";
  db.query(query, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Company deleted successfully!" });
  });
});

// API Route to update company name
app.put("/api/companies/:id", (req, res) => {
  const { name } = req.body;
  const query = "UPDATE companies SET name = ? WHERE id = ?";
  
  db.query(query, [name, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Company name updated successfully!" });
  });
});

// Start the server
const port = process.env.PORT || 4000; // Use process.env.PORT for Railway, fallback to 4000 for local
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
