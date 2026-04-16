const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// --- AUTENTICACIÓN ---

router.get('/login', (req, res) => {
    if (req.session.user) {
        const { rol } = req.session.user;
        if (rol === 'admin') return res.redirect('/admin/usuarios');
        if (rol === 'maestro') return res.redirect('/maestro/dashboard');
        if (rol === 'alumno') return res.redirect('/alumno/perfil');
    }
    res.render('login', { title: 'Iniciar Sesión' });
});

router.post('/login', async (req, res) => {
    const { correo, password } = req.body;
    
    // LOG DE CONTROL: Para ver qué llega al servidor
    console.log(`Intentando login para: ${correo}`);

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        
        if (rows.length > 0) {
            const usuario = rows[0];

            // 1. Validamos con Bcrypt
            const match = await bcrypt.compare(password, usuario.password);
            
            // 2. Validamos texto plano
            const esIgual = (password === usuario.password);

            if (match || esIgual) { 
                console.log('✅ Credenciales correctas');
                
                // Guardamos solo datos necesarios en la sesión
                req.session.user = {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    rol: usuario.rol
                };
                
                req.session.save((err) => {
                    if (err) {
                        console.error('❌ Error al guardar sesión:', err);
                        return res.redirect('/login?error=session_error');
                    }
                    
                    const { rol } = usuario;
                    if (rol === 'admin') return res.redirect('/admin/usuarios');
                    if (rol === 'maestro') return res.redirect('/maestro/dashboard');
                    if (rol === 'alumno') return res.redirect('/alumno/perfil');
                });
            } else {
                console.log('❌ Password incorrecto');
                res.redirect('/login?error=wrong_password');
            }
        } else {
            console.log('❌ Usuario no encontrado');
            res.redirect('/login?error=user_not_found');
        }
    } catch (err) {
        console.error('❌ Error CRÍTICO en Login:', err);
        res.redirect('/login?error=server_error');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log('Error al cerrar sesión:', err);
        res.clearCookie('connect.sid');
        res.redirect('/login?logout=success');
    });
});

// --- GESTIÓN DE CUENTA PROPIA ---

router.get('/mi-cuenta', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('editar_perfil', { 
        user: req.session.user, 
        title: 'Configuración de mi Cuenta' 
    });
});

router.post('/mi-cuenta/actualizar', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    const { nombre, correo } = req.body;
    const userId = req.session.user.id;

    try {
        await db.query('UPDATE usuarios SET nombre = ?, correo = ? WHERE id = ?', [nombre, correo, userId]);
        
        req.session.user.nombre = nombre;
        req.session.user.correo = correo;
        
        const { rol } = req.session.user;
        let redirectPath = (rol === 'admin') ? '/admin/usuarios' : 
                           (rol === 'maestro') ? '/maestro/dashboard' : '/alumno/perfil';
        
        res.redirect(`${redirectPath}?update=success`);
    } catch (err) {
        console.error('❌ Error al actualizar perfil propio:', err);
        res.status(500).send('Error al actualizar los datos');
    }
});

module.exports = router;
