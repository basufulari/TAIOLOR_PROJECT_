const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeAll(users) {
  ensureFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function findByEmail(email) {
  return readAll().find((u) => u.email === email.toLowerCase()) || null;
}

async function findById(id) {
  return readAll().find((u) => u.id === id) || null;
}

async function create({ name, email, password, phone, role }) {
  const users = readAll();
  const norm = email.toLowerCase();
  if (users.some((u) => u.email === norm)) {
    const err = new Error('Email already registered');
    err.code = 'DUPLICATE';
    throw err;
  }
  const hash = await bcrypt.hash(password, 12);
  const user = {
    id: `file_${Date.now()}`,
    name,
    email: norm,
    password: hash,
    phone: phone || '',
    role: role === 'tailor' ? 'tailor' : 'customer',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeAll(users);
  return user;
}

async function comparePassword(user, candidate) {
  return bcrypt.compare(candidate, user.password);
}

function toPublic(user) {
  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

module.exports = { findByEmail, findById, create, comparePassword, toPublic, USERS_FILE };
