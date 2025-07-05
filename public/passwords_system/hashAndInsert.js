const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const readline = require('readline');
require('dotenv').config();  // Load environment variables from .env file

// Create a read/write interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to hash the password
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        reject(err);
      } else {
        resolve(hashedPassword);
      }
    });
  });
}

// MySQL database connection setup using environment variables
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306
});

// Function to list all users in the users table
function listUsers(callback) {
  pool.query('SELECT username FROM users', (err, results) => {
    if (err) {
      console.error('Error fetching users:', err.message);
      rl.close();
      return;
    }

    console.log('\nUsers in the database:');
    if (results.length === 0) {
      console.log('No users found.');
      rl.close();
      return;
    }

    results.forEach((row, index) => {
      console.log(`${index + 1}. ${row.username}`);
    });

    // After listing users, execute the callback to show the menu
    callback(results);
  });
}

// Function to add a new user
async function addUser() {
  rl.question('Enter username: ', (username) => {
    rl.question('Enter password: ', async (password) => {
      try {
        // Hash the password
        const hashedPassword = await hashPassword(password);
        
        // Insert the username and hashed password into the database
        pool.query(
          'INSERT INTO users (username, password) VALUES (?, ?)',
          [username, hashedPassword],
          (err, results) => {
            if (err) {
              console.error('Error inserting data into database:', err.message);
            } else {
              console.log(`User ${username} registered successfully!`);
            }
            rl.close();
          }
        );
      } catch (error) {
        console.error('Error hashing password:', error.message);
        rl.close();
      }
    });
  });
}

// Function to update an existing user's username and/or password
function updateUser() {
  listUsers((users) => {
    rl.question('Enter the number of the user to update: ', async (choice) => {
      const username = await getUsernameByChoice(choice, users);
      if (!username) {
        console.log('Invalid choice. Try again.');
        return updateUser(); // Retry if the choice is invalid
      }

      rl.question('Enter the new username (leave empty to keep the same): ', (newUsername) => {
        rl.question('Enter the new password (leave empty to keep the same): ', async (newPassword) => {
          try {
            // Prepare the updated username and password
            let updatedUsername = newUsername || username; // Use old username if new one is empty
            let hashedPassword = null;

            if (newPassword) {
              // Hash the new password if provided
              hashedPassword = await hashPassword(newPassword);
            }

            // Update the user's username and/or password in the database
            let updateQuery = 'UPDATE users SET username = ?';
            let updateValues = [updatedUsername];

            // If password is being updated, include it in the query
            if (hashedPassword) {
              updateQuery += ', password = ?';
              updateValues.push(hashedPassword);
            }

            updateQuery += ' WHERE username = ?';
            updateValues.push(username);

            pool.query(updateQuery, updateValues, (err, results) => {
              if (err) {
                console.error('Error updating data in database:', err.message);
              } else if (results.affectedRows > 0) {
                console.log(`User ${username} updated successfully! New username: ${updatedUsername}`);
              } else {
                console.log('No user found with that username.');
              }
              rl.close();
            });
          } catch (error) {
            console.error('Error hashing new password:', error.message);
            rl.close();
          }
        });
      });
    });
  });
}

// Function to delete an existing user
function deleteUser() {
  listUsers((users) => {
    rl.question('Enter the number of the user to delete: ', async (choice) => {
      const username = await getUsernameByChoice(choice, users); // Await the promise to resolve username
      if (!username) {
        console.log('Invalid choice. Try again.');
        return deleteUser(); // Retry if the choice is invalid
      }

      // Confirm user deletion before proceeding
      rl.question(`Are you sure you want to delete ${username}? (y/n): `, (confirm) => {
        if (confirm.toLowerCase() === 'y') {
          pool.query(
            'DELETE FROM users WHERE username = ?',
            [username],
            (err, results) => {
              if (err) {
                console.error('Error deleting data from database:', err.message);
              } else if (results.affectedRows > 0) {
                console.log(`User ${username} deleted successfully!`);
              } else {
                console.log('No user found with that username.');
              }
              rl.close();
            }
          );
        } else {
          console.log('User deletion canceled.');
          rl.close();
        }
      });
    });
  });
}

// Get the username by the choice number
function getUsernameByChoice(choice, users) {
  return new Promise((resolve, reject) => {
    if (choice > 0 && choice <= users.length) {
      resolve(users[choice - 1].username); // Resolve the username here
    } else {
      resolve(null);
    }
  });
}

// Main menu function
function showMenu() {
  console.log('\nChoose an option:');
  console.log('1. Add a new user');
  console.log('2. Update an existing user');
  console.log('3. Delete a user');
  console.log('4. Exit');

  rl.question('Enter your choice: ', (choice) => {
    switch (choice) {
      case '1':
        addUser();
        break;
      case '2':
        updateUser();
        break;
      case '3':
        deleteUser();
        break;
      case '4':
        rl.close();
        break;
      default:
        console.log('Invalid choice. Please try again.');
        showMenu();
        break;
    }
  });
}

// Show the main menu
showMenu();
