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

// --- PROCESO DE LOGIN (ESTRICTO) ---
router.post('/login', async (req, res) => {
    const correoInput = req.body.correo ? req.body.correo.trim() : '';
    const passwordInput = req.body.password ? req.body.password.trim() : '';
    
    if (!correoInput || !passwordInput) {
        return res.redirect('/login?error=empty_fields');
    }

    try {
        // Buscamos el usuario por el correo exacto
        const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correoInput]);
        
        if (rows.length === 0) {
            console.log(`❌ Intento fallido: El correo [${correoInput}] no existe.`);
            return res.redirect('/login?error=wrong_credentials');
        }

        const usuario = rows[0];
        const passwordDB = usuario.password ? usuario.password.trim() : '';

        // VALIDACIÓN 1: ¿Es un hash de Bcrypt?
        let esValidoBcrypt = false;
        if (passwordDB.startsWith('$2')) {
            esValidoBcrypt = await bcrypt.compare(passwordInput, passwordDB);
        }

        // VALIDACIÓN 2: ¿Es texto plano igualito?
        const esValidoPlano = (passwordInput === passwordDB);

        // SOLO si alguna de las dos validaciones de CONTRASEÑA es correcta, entra.
        // Ya no comparamos "correo === correo", eso se quitó para siempre.
        if (esValidoBcrypt || esValidoPlano) { 
            console.log(`✅ Login exitoso: ${correoInput}`);
            
            req.session.user = {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            };
            
            return req.session.save(() => {
                const { rol } = usuario.rol; // O usuario.rol dependiendo de tu tabla
                if (usuario.rol === 'admin') return res.redirect('/admin/usuarios');
                if (usuario.rol === 'maestro') return res.redirect('/maestro/dashboard');
                if (usuario.rol === 'alumno') return res.redirect('/alumno/perfil');
            });
        } else {
            console.log(`❌ Contraseña incorrecta para: ${correoInput}`);
            return res.redirect('/login?error=wrong_credentials');
        }

    } catch (err) {
        console.error('❌ Error en el servidor durante login:', err);
        return res.redirect('/login?error=server_error');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/login?logout=success');
    });
});

module.exports = router;
