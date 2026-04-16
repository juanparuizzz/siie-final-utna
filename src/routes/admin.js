const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// 1. LISTAR USUARIOS
router.get('/usuarios', async (req, res) => {
    try {
        const [usuarios] = await db.query('SELECT * FROM usuarios');
        const [stats] = await db.query("SELECT SUM(CASE WHEN rol='admin' THEN 1 ELSE 0 END) as totalAdmins, SUM(CASE WHEN rol='maestro' THEN 1 ELSE 0 END) as totalMaestros, SUM(CASE WHEN rol='alumno' THEN 1 ELSE 0 END) as totalAlumnos FROM usuarios");
        res.render('admin/usuarios', { usuarios, stats: stats[0], title: 'Gestión' });
    } catch (err) { res.status(500).send('Error'); }
});

// 2. FORMULARIO CREAR
router.get('/usuarios/crear', (req, res) => {
    res.render('admin/crear_usuario', { title: 'Registrar' });
});

// 3. GUARDAR (Sin validaciones que bloqueen el botón)
router.post('/usuarios/guardar', async (req, res) => {
    const { nombre, correo, password, rol, grado, grupo } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO usuarios (nombre, correo, password, rol, grado, grupo) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, correo, hashedPassword, rol.toLowerCase(), grado || null, grupo || 'A']
        );
        res.redirect('/admin/usuarios');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al guardar');
    }
});

// 4. EDITAR, ACTUALIZAR Y ELIMINAR (Mantén los que ya tenías abajo...)
router.get('/usuarios/editar/:id', async (req, res) => { /* Tu código de editar */ });
router.post('/usuarios/actualizar/:id', async (req, res) => { /* Tu código de actualizar */ });
router.get('/usuarios/eliminar/:id', async (req, res) => { /* Tu código de eliminar */ });

module.exports = router;
