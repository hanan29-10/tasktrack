const express = require('express');
const path = require('path');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;
const dbPath = path.join(__dirname, 'database', 'tasktrack.db');
const db = new sqlite3.Database(dbPath);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'tasktrack-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
  })
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ message: 'Not logged in.' });
    }
    return res.redirect('/login');
  }
  next();
}

function renderPage(res, fileName) {
  return res.sendFile(path.join(__dirname, 'views', fileName));
}

app.get('/', (req, res) => renderPage(res, 'index.html'));
app.get('/about', (req, res) => renderPage(res, 'about.html'));
app.get('/contact', (req, res) => renderPage(res, 'contact.html'));
app.get('/login', (req, res) => renderPage(res, 'login.html'));
app.get('/register', (req, res) => renderPage(res, 'register.html'));
app.get('/dashboard', requireLogin, (req, res) => renderPage(res, 'dashboard.html'));

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
  db.run(query, [name.trim(), email.trim(), password], function (err) {
    if (err) {
      return res.status(400).json({ message: 'Email already exists or invalid data.' });
    }

    req.session.user = { id: this.lastID, name: name.trim(), email: email.trim() };
    res.json({ success: true, redirect: '/dashboard' });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM users WHERE email = ? AND password = ?';

  db.get(query, [email.trim(), password], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error.' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    req.session.user = { id: user.id, name: user.name, email: user.email };
    res.json({ success: true, redirect: '/dashboard' });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/api/me', requireLogin, (req, res) => {
  res.json(req.session.user);
});

app.get('/api/tasks', requireLogin, (req, res) => {
  const status = req.query.status;
  let query = 'SELECT * FROM tasks WHERE user_id = ?';
  const params = [req.session.user.id];

  if (status && status !== 'All') {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY id DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Could not load tasks.' });
    }
    res.json(rows);
  });
});

app.get('/api/tasks/:id', requireLogin, (req, res) => {
  db.get(
    'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.user.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'Could not load task.' });
      }
      if (!row) {
        return res.status(404).json({ message: 'Task not found.' });
      }
      res.json(row);
    }
  );
});

app.post('/api/tasks', requireLogin, (req, res) => {
  const { title, description, due_date } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Task title is required.' });
  }

  db.run(
    `INSERT INTO tasks (user_id, title, description, due_date, status) VALUES (?, ?, ?, ?, 'Pending')`,
    [req.session.user.id, title.trim(), (description || '').trim(), due_date || ''],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Could not add task.' });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.put('/api/tasks/:id', requireLogin, (req, res) => {
  const { title, description, due_date, status } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Task title is required.' });
  }

  db.run(
    `UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ? WHERE id = ? AND user_id = ?`,
    [title.trim(), (description || '').trim(), due_date || '', status || 'Pending', req.params.id, req.session.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Could not update task.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Task not found or not updated.' });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

app.delete('/api/tasks/:id', requireLogin, (req, res) => {
  db.run(
    'DELETE FROM tasks WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ message: 'Could not delete task.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Task not found or already deleted.' });
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

app.listen(PORT, () => {
  console.log(`TaskTrack running at http://localhost:${PORT}`);
});
