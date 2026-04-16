const express = require('express');
const router = express.Router();
const db = require('../db');

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

// --- PROCESO DE LOGIN (COMPARACIÓN DIRECTA) ---
router.post('/login', async (req, res) => {
    const correo = req.body.correo ? req.body.correo.trim() : '';
    const password = req.body.password ? req.body.password.trim() : '';
    
    console.log("--- INTENTO DE LOGIN ---");
    console.log("Correo recibido:", correo);

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        
        if (rows.length === 0) {
            console.log("❌ RESULTADO: El correo no existe en la base de datos.");
            return res.redirect('/login?error=user_not_found');
        }

        const usuario = rows[0];
        // Convertimos a string y quitamos espacios por si acaso
        const passDB = usuario.password ? usuario.password.toString().trim() : '';

        console.log("Usuario encontrado en DB:", usuario.correo);

        // COMPARACIÓN DIRECTA: Texto plano contra texto plano
        if (password === passDB) {
            console.log("✅ RESULTADO: Contraseña correcta.");
            
            // Guardamos el objeto usuario en la sesión
            req.session.user = {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            };

            return req.session.save((err) => {
                if (err) {
                    console.error("Error al guardar sesión:", err);
                    return res.redirect('/login?error=server_error');
                }
                
                const rol = usuario.rol;
                console.log("Redirigiendo al dashboard de:", rol);
                
                if (rol === 'admin') return res.redirect('/admin/usuarios');
                if (rol === 'maestro') return res.redirect('/maestro/dashboard');
                if (rol === 'alumno') return res.redirect('/alumno/perfil');
                
                res.redirect('/');
            });
        } else {
            console.log("❌ RESULTADO: La contraseña no coincide.");
            // Log de ayuda para ti (puedes quitarlo después de que funcione)
            console.log(`Debug: Recibido [${password}] vs DB [${passDB}]`);
            return res.redirect('/login?error=wrong_password');
        }
    } catch (err) {
        console.error("❌ ERROR EN EL LOGIN:", err);
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
