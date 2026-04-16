const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// --- VISTA DE LOGIN ---
router.get('/login', (req, res) => {
    // Si ya está logueado, mandarlo a su dashboard
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
    const { correo, password } = req.body;
    console.log("--- INTENTO DE LOGIN ---");
    console.log("Correo recibido:", correo);

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        
        if (rows.length === 0) {
            console.log("❌ RESULTADO: El correo no existe en la base de datos.");
            return res.redirect('/login?error=user_not_found');
        }

        const usuario = rows[0];
        console.log("Usuario encontrado en DB:", usuario.correo);

        // Comprobación de contraseña (Bcrypt o Texto Plano)
        const match = await bcrypt.compare(password, usuario.password);
        const esIgual = (password === usuario.password);

        if (match || esIgual) {
            console.log("✅ RESULTADO: Contraseña correcta.");
            
            // Guardamos el objeto usuario completo en la sesión
            req.session.user = usuario;

            return req.session.save((err) => {
                if (err) {
                    console.error("Error al guardar sesión:", err);
                    return res.redirect('/login?error=server_error');
                }
                const { rol } = usuario;
                console.log("Redirigiendo por rol:", rol);
                if (rol === 'admin') return res.redirect('/admin/usuarios');
                if (rol === 'maestro') return res.redirect('/maestro/dashboard');
                if (rol === 'alumno') return res.redirect('/alumno/perfil');
                
                // Si no tiene rol conocido, a la raíz
                res.redirect('/');
            });
        } else {
            console.log("❌ RESULTADO: La contraseña no coincide.");
            return res.redirect('/login?error=wrong_password');
        }
    } catch (err) {
        console.error("❌ ERROR CRÍTICO EN AUTH:", err);
        res.redirect('/login?error=server_error');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login?logout=success');
    });
});

module.exports = router;
