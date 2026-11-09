require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error("Missing JWT_SECRET. Copy .env.example to .env and set a strong secret.");
  process.exit(1);
}
const storageRoot = process.env.STORAGE_DIR || __dirname;
const dataDir = path.join(storageRoot, "data");
const uploadDir = path.join(storageRoot, "uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(__dirname, "public")));

const db = new Database(path.join(dataDir, "madowo.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS properties (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL, type TEXT NOT NULL, purpose TEXT NOT NULL,
 location TEXT NOT NULL, price REAL NOT NULL, bedrooms INTEGER DEFAULT 0,
 bathrooms INTEGER DEFAULT 0, area TEXT DEFAULT '', description TEXT DEFAULT '',
 image TEXT DEFAULT '', status TEXT DEFAULT 'Available',
 featured INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS enquiries (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL, email TEXT DEFAULT '', phone TEXT NOT NULL,
 message TEXT NOT NULL, property_id INTEGER,
 status TEXT DEFAULT 'New', created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(property_id) REFERENCES properties(id)
);
`);
const count = db.prepare("SELECT COUNT(*) AS n FROM properties").get().n;
if (!count) {
  const insert = db.prepare(`INSERT INTO properties
  (title,type,purpose,location,price,bedrooms,bathrooms,area,description,image,status,featured)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  insert.run("Contemporary Family Residence", "House", "Sale", "Runda, Nairobi", 48500000, 4, 4, "0.25 acre",
    "Illustrative listing. Replace this sample with a verified property, accurate details and your own photographs.",
    "https://images.unsplash.com/photo-1600594963990-1c9e5f8a4f3b?auto=format&fit=crop&w=1200&q=85", "Available", 1);
  insert.run("Modern Two-Bedroom Apartment", "Apartment", "Rent", "Kilimani, Nairobi", 95000, 2, 2, "120 m²",
    "Illustrative listing. Confirm rent, service charge, availability and viewing details before publishing.",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85", "Available", 1);
  insert.run("Residential Development Plot", "Land", "Sale", "Kitengela, Kajiado", 6500000, 0, 0, "50 × 100 ft",
    "Illustrative listing. Verify title, tenure, zoning, access and all land particulars before publishing.",
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85", "Available", 0);
}
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype))
});

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try { req.admin = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: "Please sign in again." }); }
}
function cleanProperty(body) {
  const allowed = ["title","type","purpose","location","price","bedrooms","bathrooms","area","description","image","status","featured"];
  const out = {};
  for (const k of allowed) if (body[k] !== undefined) out[k] = body[k];
  out.price = Number(out.price);
  out.bedrooms = Number(out.bedrooms || 0);
  out.bathrooms = Number(out.bathrooms || 0);
  out.featured = out.featured ? 1 : 0;
  return out;
}

app.get("/api/config", (_req,res) => res.json({
  company: "MADOWO ELITE REAL ESTATE PROPERTY AND INVESTMENTS",
  phone: process.env.COMPANY_PHONE || "+254796811569",
  whatsapp: process.env.COMPANY_WHATSAPP || "254796811569",
  email: process.env.COMPANY_EMAIL || "markmadowo01@gmail.com"
}));
app.get("/api/properties", (req,res) => {
  let sql = "SELECT * FROM properties WHERE status = 'Available'";
  const args = [];
  if (req.query.purpose && req.query.purpose !== "All") { sql += " AND purpose = ?"; args.push(req.query.purpose); }
  if (req.query.type && req.query.type !== "All") { sql += " AND type = ?"; args.push(req.query.type); }
  if (req.query.search) { sql += " AND (title LIKE ? OR location LIKE ?)"; args.push(`%${req.query.search}%`,`%${req.query.search}%`); }
  sql += " ORDER BY featured DESC, created_at DESC";
  res.json(db.prepare(sql).all(...args));
});
app.get("/api/properties/:id", (req,res) => {
  const item = db.prepare("SELECT * FROM properties WHERE id=? AND status='Available'").get(req.params.id);
  if (!item) return res.status(404).json({error:"Property not found"});
  res.json(item);
});
app.post("/api/enquiries", (req,res) => {
  const {name,email="",phone,message,property_id=null} = req.body || {};
  if (!name || !phone || !message) return res.status(400).json({error:"Name, phone and message are required."});
  const result = db.prepare("INSERT INTO enquiries (name,email,phone,message,property_id) VALUES (?,?,?,?,?)")
    .run(String(name).slice(0,120),String(email).slice(0,180),String(phone).slice(0,50),String(message).slice(0,2000),property_id || null);
  res.status(201).json({ok:true,id:result.lastInsertRowid});
});
app.post("/api/admin/login", async (req,res) => {
  const {username,password} = req.body || {};
  const hash = process.env.ADMIN_PASSWORD_HASH || "";
  if (!hash || username !== (process.env.ADMIN_USERNAME || "admin") || !(await bcrypt.compare(password || "", hash)))
    return res.status(401).json({error:"Incorrect login details. Check your server configuration."});
  res.json({token:jwt.sign({username},SECRET,{expiresIn:"8h"})});
});
app.get("/api/admin/properties",auth,(_req,res)=>res.json(db.prepare("SELECT * FROM properties ORDER BY created_at DESC").all()));
app.post("/api/admin/properties",auth,upload.single("photo"),(req,res)=>{
  const p = cleanProperty(req.body);
  if (!p.title || !p.type || !p.purpose || !p.location || !Number.isFinite(p.price) || p.price < 0)
    return res.status(400).json({error:"Please complete title, type, purpose, location and a valid price."});
  if (req.file) p.image = "/uploads/" + req.file.filename;
  const cols = Object.keys(p), vals = Object.values(p);
  const result = db.prepare(`INSERT INTO properties (${cols.join(",")}) VALUES (${cols.map(()=>"?").join(",")})`).run(...vals);
  res.status(201).json({id:result.lastInsertRowid});
});
app.put("/api/admin/properties/:id",auth,upload.single("photo"),(req,res)=>{
  const p = cleanProperty(req.body);
  if (req.file) p.image = "/uploads/" + req.file.filename;
  const cols = Object.keys(p);
  if (!cols.length) return res.status(400).json({error:"No changes supplied."});
  const result = db.prepare(`UPDATE properties SET ${cols.map(k=>`${k}=?`).join(",")} WHERE id=?`).run(...cols.map(k=>p[k]),req.params.id);
  if (!result.changes) return res.status(404).json({error:"Property not found."});
  res.json({ok:true});
});
app.delete("/api/admin/properties/:id",auth,(req,res)=>{
  db.prepare("DELETE FROM properties WHERE id=?").run(req.params.id); res.json({ok:true});
});
app.get("/api/admin/enquiries",auth,(_req,res)=>res.json(db.prepare(`
 SELECT e.*, p.title AS property_title FROM enquiries e
 LEFT JOIN properties p ON p.id=e.property_id ORDER BY e.created_at DESC`).all()));
app.patch("/api/admin/enquiries/:id",auth,(req,res)=>{
  const status = ["New","Contacted","Closed"].includes(req.body.status) ? req.body.status : "New";
  db.prepare("UPDATE enquiries SET status=? WHERE id=?").run(status,req.params.id); res.json({ok:true});
});
app.get("*",(_req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`Madowo Elite website running at http://localhost:${PORT}`));
