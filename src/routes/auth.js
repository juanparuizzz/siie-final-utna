const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// --- VISTA DE LOGIN ---
router.get('/login', (req, res) => {
    if (req.session.user) {
        const { rol } = req.session.user;
        if (rol === 'admin') return res.redirect('/admin/usuarios');
        if (rol === 'maestro') return res.redirect('/maestro/dashboard');
        if (rol === 'alumno') return res.redirect('/alumno/perfil');
    }
    res.render('login', { title: 'Iniciar Sesión' });
});

// --- PROCESO DE LOGIN ---
router.post('/login', async (req, res) => {
    const correo = req.body.correo ? req.body.correo.trim() : '';
    const password = req.body.password ? req.body.password.trim() : '';

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        if (rows.length === 0) return res.redirect('/login?error=user_not_found');

        const usuario = rows[0];
        const passDB = usuario.password ? usuario.password.toString().trim() : '';

        let esValido = false;
        if (passDB.startsWith('$2')) {
            esValido = await bcrypt.compare(password, passDB);
        } else {
            esValido = (password === passDB);
        }

        if (esValido) {
            req.session.user = usuario;
            return req.session.save(() => {
                const rol = usuario.rol ? usuario.rol.toLowerCase().trim() : '';
                if (rol === 'admin') return res.redirect('/admin/usuarios');
                if (rol === 'maestro') return res.redirect('/maestro/dashboard');
                if (rol === 'alumno') return res.redirect('/alumno/perfil');
                res.redirect('/');
            });
        } else {
            return res.redirect('/login?error=wrong_password');
        }
    } catch (err) {
        console.error("Error en Login:", err);
        res.redirect('/login?error=server_error');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

module.exports = router;
