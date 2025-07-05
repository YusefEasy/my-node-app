require('dotenv').config(); // Load environment variables from .env file
const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const { hashPassword } = require("./public/passwords_system/hashAndInsert");
const cors = require('cors');  // Import cors module
const bcrypt = require('bcrypt');  // Import bcrypt
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");

const app = express();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: { message: "Too many login attempts. Please try again later." }
});


// Email setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendExportNotification(email, invoiceNumber) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `✅ Invoice Exported: ${invoiceNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif; background:#f9f9f9; padding:20px; border-radius:8px; border:1px solid #ddd;">
        <h2 style="color:#27ae60;">✅ Your invoice has been successfully created!</h2>
        <p style="font-size:15px; color:#333;">Here are your invoice details:</p>

        <table style="margin-top:10px; font-size:14px;">
          <tr><td><strong>Invoice Number:</strong></td><td>${invoiceNumber}</td></tr>
          <tr><td><strong>Created At:</strong></td><td>${new Date().toLocaleString()}</td></tr>
          <tr><td><strong>Status:</strong></td><td><span style="color:#27ae60;">Saved to system</span></td></tr>
        </table>

        <p style="margin-top:20px;">Click below to view your invoice PDF:</p>
        <a href="http://localhost:4000/invoices/${invoiceNumber}.pdf"
           style="display:inline-block; padding:10px 18px; background:#3498db; color:#fff; text-decoration:none; border-radius:5px;">
          View Invoice PDF
        </a>

        <p style="margin-top:30px; font-size:13px; color:#999;">This message was sent automatically by AFAK SYSTEM.</p>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("❌ Failed to send export email:", err.message);
    } else {
      console.log("✅ Email sent:", info.response);
    }
  });
}


// MySQL connection pool setup
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// MySQL pool setup
const db = pool;
// Log when pool is ready
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection failed: ' + err.message);
  } else {
    console.log('✅ MySQL pool is ready!');
    connection.release();
  }
});

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || "-";
}

const levelEmojis = {
  info: "ℹ️",
  warn: "⚠️",
  error: "❌",
  security: "🔒"
};

const logToDbAndFile = (log) => {
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.slice(0, 10); // YYYY-MM-DD

  const level = log.level || (log.status === "fail" ? "warn" : "info");
  const rank = log.rank || (level === "error" ? "HIGH" : level === "warn" ? "MEDIUM" : "LOW");
  const action = log.action || "unknown";
  const username = log.username || "-";
  const ip = (log.ip === "::1" || log.ip === "127.0.0.1") ? "localhost" : (log.ip || "-");
  const user_agent = log.user_agent || "-";
  const details = log.details
    ? (typeof log.details === "string" ? log.details : JSON.stringify(log.details, null, 2))
    : "";
  const method = log.method || "-";
  const route = log.route || "-";
  const session = log.session || "-";
  const emoji = levelEmojis[level] || "";

  // ✅ Log to database
  db.query(
    "INSERT INTO logs (username, action, status, ip, user_agent, details) VALUES (?, ?, ?, ?, ?, ?)",
    [username, action, log.status || null, ip, user_agent, details],
    (err) => {
      if (err) console.error("❌ Failed to log to DB:", err.message);
    }
  );

  // ✅ Log to daily file
  const logDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

  const logPath = path.join(logDir, `actions-${dateStr}.log`);
  const logLine = `[${timestamp}] ${emoji} [${level.toUpperCase()}] [${rank}] [${action}] [${log.status || "-"}] [user:${username}] [ip:${ip}] [method:${method}] [route:${route}] [session:${session}] [agent:${user_agent}]${details ? `\n  details: ${details}` : ""}\n`;

  fs.appendFile(logPath, logLine, (err) => {
    if (err) console.error("❌ Failed to write daily log file:", err.message);
  });
};


// Use CORS middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Static files
app.use(express.static(path.join(__dirname, "public")));

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

// Login route
app.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM users WHERE username = ?`;

  pool.query(query, [username], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }

    if (results.length > 0) {
      bcrypt.compare(password, results[0].password, (err, isMatch) => {
        if (err || !isMatch) {
          return res.status(401).json({ message: "Invalid username or password" });
        }

        // Successful login
        req.session.loggedIn = true;
        req.session.username = username;

        logToDbAndFile({
          level: "info",
          rank: "LOW",
          action: "login",
          status: "success",
          username,
          ip: getClientIp(req),
          user_agent: req.headers["user-agent"],
          method: "POST",
          route: "/login",
          session: req.sessionID,
          details: "User logged in successfully"
        });

        return res.redirect("/");
      });
    } else {
      return res.status(401).json({ message: "Invalid username or password" });
    }
  });
});
app.post("/logout", (req, res) => {
  const username = req.session?.username || "-";

  logToDbAndFile({
    level: "info",
    rank: "LOW",
    action: "logout",
    status: "success",
    username,
    ip: getClientIp(req),
    user_agent: req.headers["user-agent"],
    method: "POST",
    route: "/logout",
    session: req.sessionID,
    details: "User logged out"
  });

  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.status(200).send("Logged out");
  });
});

// Middleware to check login
function checkLogin(req, res, next) {
  if (req.session.loggedIn) {
    return next();
  }
  return res.redirect("/login");
}

// Home route (protected)
app.get("/", (req, res) => {
  if (req.session.loggedIn) {
    res.sendFile(path.join(__dirname, "views", "index.html"));
  } else {
    res.redirect("/login");
  }
});

// Registration route
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  // Hash the password and store it
  hashPassword(password)
    .then((hashedPassword) => {
      const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
      pool.query(query, [username, hashedPassword], (err) => {
        if (err) {
          return res.status(500).json({ message: "Error registering user" });
        }
        res.json({ message: "User registered successfully!" });
      });
    })
    .catch((error) => {
      console.error("Error hashing password:", error);
      res.status(500).json({ message: "Error hashing password" });
    });
});



app.get("/data", checkLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "data.html"));
});

app.get("/export", checkLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "export.html"));
});

// New clients system
// Clients management route (protected)
app.get("/clients", checkLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "clients.html"));
});

app.post("/api/clients", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const query = `INSERT IGNORE INTO clients (name) VALUES (?)`;
  db.query(query, [name], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Client created", id: result.insertId });
  });
});

app.get("/api/clients", (req, res) => {
  const search = req.query.search || "";
  const query = `SELECT * FROM clients WHERE name LIKE ? ORDER BY name LIMIT 10`;
  db.query(query, [`%${search}%`], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/exports", (req, res) => {
  const { clientName, data } = req.body;
  if (!clientName || !data) return res.status(400).json({ error: "Missing client or data" });

  const getClientId = "SELECT id, email FROM clients WHERE name = ?";
  db.query(getClientId, [clientName], async (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: "Client not found" });

    const clientId = rows[0].id;
    const clientEmail = rows[0].email;
    const rawData = typeof data === "string" ? data : JSON.stringify(data);

    // ✅ Generate invoice number
    const invoiceNumber = await new Promise((resolve, reject) => {
      db.query("SELECT COUNT(*) AS count FROM exports", (err, rows) => {
        if (err) return reject(err);
        const nextId = rows[0].count + 1;
        resolve(`AFAK-INV-${String(nextId).padStart(5, "0")}`);
      });
    });

    // ✅ Save export with invoice
    const insertExport = "INSERT INTO exports (client_id, data, invoice_number) VALUES (?, ?, ?)";
    db.query(insertExport, [clientId, rawData, invoiceNumber], (err2) => {
      if (err2) return res.status(500).json({ error: "Failed to save export" });

      // ✅ Update stock
      try {
        const updates = data.map((model) => {
          if (!model.table || !model.id) return null;

          return new Promise((resolve) => {
            const sql = `
              UPDATE \`${model.table}\`
              SET quantity = GREATEST(quantity - ?, 0),
                  packages = GREATEST(packages - ?, 0)
              WHERE id = ?
            `;
            db.query(sql, [model.quantity, model.packages, model.id], (err3) => {
              if (err3) {
                console.error(`Failed to update stock for ${model.name}:`, err3.message);
              }
              resolve();
            });
          });
        });

      Promise.all(updates).then(() => {
        if (clientEmail) {
          sendExportNotification(process.env.EMAIL_USER, invoiceNumber);
        } else {
          console.warn("⚠️ No client email found. Skipping email.");
        }

        res.json({ message: "Export saved", invoiceNumber });
      });
      } catch (e) {
        console.error("Stock update failed:", e.message);
        res.status(500).json({ error: "Export saved but stock update failed" });
      }
    });
  });
});

app.post("/api/save-pdf", (req, res) => {
  const { invoiceNumber, pdf } = req.body;
  const buffer = Buffer.from(pdf, 'base64');
  const invoicesDir = path.join(__dirname, "invoices");

  // ✅ Ensure the invoices directory exists
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir);
  }

  const filePath = path.join(invoicesDir, `${invoiceNumber}.pdf`);

  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error("Failed to save PDF:", err);
      return res.status(500).json({ error: "Failed to save PDF" });
    }
    res.json({ message: "PDF saved" });
  });
});

app.get("/invoices/:invoiceId.pdf", (req, res) => {
  const { invoiceId } = req.params;
  const query = `SELECT * FROM exports WHERE invoice_number = ? LIMIT 1`;

  db.query(query, [invoiceId], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).send("Invoice not found.");
    }

    const filePath = path.join(__dirname, "invoices", `${invoiceId}.pdf`);
    res.sendFile(filePath);
  });
});

// Update client name
app.put("/api/clients/:id", (req, res) => {
  const clientId = req.params.id;
  const newName = req.body.name?.trim();
  if (!newName || newName.length < 2) return res.status(400).json({ error: "Invalid name" });

  const query = "UPDATE clients SET name = ? WHERE id = ?";
  db.query(query, [newName, clientId], (err) => {
    if (err) return res.status(500).json({ error: "Failed to update client" });
    res.json({ message: "Client updated successfully" });
  });
});

// Delete client
app.delete("/api/clients/:id", (req, res) => {
  const clientId = req.params.id;
  const query = "DELETE FROM clients WHERE id = ?";
  db.query(query, [clientId], (err) => {
    if (err) return res.status(500).json({ error: "Failed to delete client" });
    res.json({ message: "Client deleted successfully" });
  });
});

app.get("/api/clients/:id/exports", (req, res) => {
  const query = `SELECT * FROM exports WHERE client_id = ? ORDER BY created_at DESC`;
  db.query(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const parsed = rows.map(r => {
      try {
        const parsedData = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
        return { ...r, data: parsedData };
      } catch (e) {
        console.error("Invalid JSON for export id", r.id);
        return { ...r, data: [] };
      }
    });
    res.json(parsed);
  });
});
//

// Create a new company as a table
app.post("/api/companies", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Company name is required" });

  const tableName = name.replace(/\s+/g, "_").toLowerCase();

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2),
      discount DECIMAL(5,2),
      quantity INT DEFAULT 0,
      packages INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.query(createTableSQL, (err) => {
    if (err) return res.status(500).json({ error: "Failed to create company table" });

    // insert into meta table
    db.query("INSERT INTO company_meta (name) VALUES (?)", [tableName], (err) => {
      if (err) console.error("Failed to insert into company_meta:", err.message);
      return res.json({ message: "Company created", table: tableName });
    });
  });
});

// List all company tables
app.get("/api/companies", (req, res) => {
  const query = `
    SHOW TABLES WHERE Tables_in_${process.env.MYSQL_DATABASE} NOT IN ('users', 'company_meta', 'clients', 'exports', 'logs')
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error("Error fetching tables:", err);
      return res.status(500).json({ error: "Failed to fetch tables" });
    }

    const tables = rows.map(row => Object.values(row)[0]);
    res.json(tables.map(table => ({ table })));
  });
});

// List companies with model count and created_at
app.get("/api/companies-with-models", (req, res) => {
  const getMetaSQL = `SELECT * FROM company_meta`;

  db.query(getMetaSQL, async (err, companies) => {
    if (err) return res.status(500).json({ error: err.message });

    // Get list of current tables in the DB
    db.query(`SHOW TABLES`, async (err2, tables) => {
      if (err2) return res.status(500).json({ error: err2.message });

      const existingTables = tables.map(t => Object.values(t)[0]);

      const results = await Promise.all(
        companies
          .filter(c => existingTables.includes(c.name)) // ✅ Only keep valid ones
          .map((company, index) => {
            return new Promise((resolve) => {
              db.query(`SELECT COUNT(*) AS model_count FROM \`${company.name}\``, (err, rows) => {
                const modelCount = (!err && rows?.[0]?.model_count) || 0;

                const createdAt = new Date(company.created_at);
                const formattedDate = isNaN(createdAt.getTime())
                  ? "N/A"
                  : createdAt.toLocaleString("en-US", {
                      year: "2-digit",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    });

                resolve({
                  id: index + 1,
                  name: company.name,
                  model_count: modelCount,
                  created_at: formattedDate,
                });
              });
            });
          })
      );

      res.json(results);
    });
  });
});



// Rename company (rename table)
app.put("/api/companies/:name", (req, res) => {
  const oldName = req.params.name?.trim();
  const newRaw = req.body.name?.trim();

  if (!oldName || !newRaw) {
    return res.status(400).json({ error: "Old and new names are required." });
  }

  const newName = newRaw.replace(/\s+/g, "_").toLowerCase();
  const oldSafe = oldName.replace(/\s+/g, "_").toLowerCase();

  const renameSQL = `RENAME TABLE \`${oldSafe}\` TO \`${newName}\``;
  const updateMetaSQL = `UPDATE company_meta SET name = ? WHERE name = ?`;

  db.query(renameSQL, (renameErr) => {
    if (renameErr) {
      console.error("Table rename error:", renameErr);
      return res.status(500).json({ error: "Failed to rename table." });
    }

    db.query(updateMetaSQL, [newName, oldSafe], (updateErr) => {
      if (updateErr) {
        console.error("Meta update error:", updateErr);
        return res.status(500).json({ error: "Failed to update company_meta." });
      }

      res.json({
        message: `Renamed '${oldSafe}' to '${newName}'`,
        table: newName,
      });
    });
  });
});


// Delete company (drop table)
app.delete("/api/companies/:name", (req, res) => {
  const tableName = req.params.name;
  if (!tableName) return res.status(400).json({ error: "Missing table name" });

  const dropSQL = `DROP TABLE IF EXISTS \`${tableName}\``;
  const deleteMetaSQL = `DELETE FROM company_meta WHERE name = ?`;

  db.query(dropSQL, (dropErr) => {
    if (dropErr) return res.status(500).json({ error: dropErr.message });

    db.query(deleteMetaSQL, [tableName], (metaErr) => {
      if (metaErr) return res.status(500).json({ error: metaErr.message });

      res.json({ message: `Company '${tableName}' deleted from DB and meta` });
    });
  });
});

// Get all models from a company table
app.get("/api/models", (req, res) => {
  const { table } = req.query;
  if (!table) return res.status(400).json({ error: "Table name required" });

  const query = `SELECT * FROM \`${table}\``;
  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Format the date for each model
    const formatted = rows.map((item) => {
      const date = new Date(item.created_at);
      item.created_at = isNaN(date.getTime())
        ? "N/A"
        : date.toLocaleString("en-US", {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          });
      return item;
    });

    res.json(formatted);
  });
});

// Add model to a table
app.post("/api/models", (req, res) => {
  const { name, price, discount, quantity, packages, table } = req.body;
  if (!table || !name || !price || discount == null)
    return res.status(400).json({ error: "Missing fields" });

  const query = `INSERT INTO \`${table}\` (name, price, discount, quantity, packages) VALUES (?, ?, ?, ?, ?)`;
  db.query(query, [name, price, discount, quantity, packages], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Model added successfully!" });
  });
});

// Update model
app.put("/api/models/:id", (req, res) => {
  const { name, price, discount, quantity, packages, table } = req.body;
  if (!table) return res.status(400).json({ error: "Table name required" });

  const query = `UPDATE \`${table}\` SET name = ?, price = ?, discount = ?, quantity = ?, packages = ? WHERE id = ?`;
  db.query(query, [name, price, discount, quantity, packages, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Model updated successfully!" });
  });
});

// Delete model
app.delete("/api/models/:id", (req, res) => {
  const { table } = req.query;
  if (!table) return res.status(400).json({ error: "Table name required" });

  const query = `DELETE FROM \`${table}\` WHERE id = ?`;
  db.query(query, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Model deleted successfully!" });
  });
});

const { exec } = require("child_process");

app.get("/api/backup", (req, res) => {
  const type = req.query.type || "daily"; // default to daily
  const allowedTypes = ["daily", "weekly", "monthly"];

  if (!allowedTypes.includes(type)) {
    return res.status(400).send("Invalid backup type.");
  }

  const baseDir = path.join(__dirname, "backups", type);
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

  const fileName = `backup-${Date.now()}.sql`;
  const filePath = path.join(baseDir, fileName);

  const command = `mysqldump -u${process.env.MYSQL_USER} -p${process.env.MYSQL_PASS} ${process.env.MYSQL_DATABASE} > "${filePath}"`;

  exec(command, (error) => {
    if (error) {
      console.error("❌ Backup error:", error.message);
      return res.status(500).send("Backup failed.");
    }

    // Store backup path in DB
    db.query("INSERT INTO backups (file_path) VALUES (?)", [filePath]);

    // Log the event
    logToDbAndFile({
      level: "info",
      rank: "LOW",
      action: `backup-${type}`,
      status: "success",
      username: "system",
      ip: "localhost",
      method: "GET",
      route: `/api/backup?type=${type}`,
      session: "-",
      user_agent: "cron",
      details: {
        file: fileName,
        path: filePath,
        created: new Date().toLocaleString()
      }
    });

    res.download(filePath);
  });
});



// Clean startup banner
console.clear();
console.log(`
 ███████╗ █████╗ ███████╗██╗   ██╗
 ██╔════╝██╔══██╗██╔════╝╚██╗ ██╔╝
 █████╗  ███████║███████╗ ╚████╔╝ 
 ██╔══╝  ██╔══██║╚════██║  ╚██╔╝  
 ███████╗██║  ██║███████║   ██║   
 ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   
-------------------------------------
        AFAK SYSTEM BY EASY
-------------------------------------
`);

// Optional: basic logger
function logStatus(message) {
  console.log(message);
}

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
  logStatus("🔧 AFAK SYSTEM booting...");
});