const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

router.post('/login', async (req, res) => {
    const { correo, password } = req.body;
    console.log("--- INTENTO DE LOGIN ---");
    console.log("Correo recibido:", correo);
    console.log("Password recibido:", password);

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        
        if (rows.length === 0) {
            console.log("❌ RESULTADO: El correo no existe en la base de datos.");
            return res.redirect('/login?error=user_not_found');
        }

        const usuario = rows[0];
        console.log("Usuario encontrado en DB:", usuario.correo);
        console.log("Password en DB:", usuario.password);

        const match = await bcrypt.compare(password, usuario.password);
        const esIgual = (password === usuario.password);

        if (match || esIgual) {
            console.log("✅ RESULTADO: Contraseña correcta.");
            req.session.user = usuario;
            return req.session.save(() => res.redirect('/'));
        } else {
            console.log("❌ RESULTADO: La contraseña no coincide.");
            return res.redirect('/login?error=wrong_password');
        }
    } catch (err) {
        console.error("❌ ERROR CRÍTICO:", err);
        res.redirect('/login?error=server_error');
    }
});

// Mantén el resto de tus rutas igual (get login, logout, etc.)
module.exports = router;
