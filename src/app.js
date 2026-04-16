const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./db'); 
const helmet = require('helmet'); 
const rateLimit = require('express-rate-limit'); 
const cors = require('cors'); 
require('dotenv').config();

const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth'); // <--- El login vive AQUÍ
const maestroRoutes = require('./routes/maestro');
const alumnoRoutes = require('./routes/alumno');

const app = express();

app.set('trust proxy', 1); 

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: "Demasiadas peticiones desde esta IP, intenta más tarde."
});
app.use('/login', limiter);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'mi_secreto_super_seguro_123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        sameSite: 'lax',
        maxAge: 3600000 
    }
}));

app.use((req, res, next) => {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
});

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// --- RUTAS ---
app.use('/', authRoutes); // Aquí es donde se conectan las rutas de login

app.get('/', (req, res) => {
    if (req.session.user) {
        const { rol } = req.session.user;
        if (rol === 'admin') return res.redirect('/admin/usuarios');
        if (rol === 'maestro') return res.redirect('/maestro/dashboard');
        if (rol === 'alumno') return res.redirect('/alumno/perfil');
    }
    res.render('index', { title: 'Bienvenido al SIIE Prepa Tech' });
});

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.rol === 'admin') return next();
    res.redirect('/login?error=unauthorized');
}
function isMaestro(req, res, next) {
    if (req.session.user && req.session.user.rol === 'maestro') return next();
    res.redirect('/login?error=unauthorized');
}
function isAlumno(req, res, next) {
    if (req.session.user && req.session.user.rol === 'alumno') return next();
    res.redirect('/login?error=unauthorized');
}

app.use('/admin', isAdmin, adminRoutes);
app.use('/maestro', isMaestro, maestroRoutes);
app.use('/alumno', isAlumno, alumnoRoutes);

app.use((req, res) => {
    res.status(404).render('404', { title: 'Página no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor en puerto: ${PORT}`);
});
