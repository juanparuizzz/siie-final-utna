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

// 3. GUARDAR
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

// 4. EDITAR (Vista)
router.get('/usuarios/editar/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send('Usuario no encontrado');
        res.render('admin/editar_usuario', { usuario: rows[0], title: 'Editar Usuario' });
    } catch (err) {
        res.status(500).send('Error al cargar editar');
    }
});

// 5. ACTUALIZAR (Proceso)
router.post('/usuarios/actualizar/:id', async (req, res) => {
    const { nombre, correo, rol, grado, grupo } = req.body;
    try {
        await db.query(
            'UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, grado = ?, grupo = ? WHERE id = ?',
            [nombre, correo, rol, grado || null, grupo || 'A', req.params.id]
        );
        // El redirect evita que se quede cargando
        res.redirect('/admin/usuarios?success=updated');
    } catch (err) {
        res.status(500).send('Error al actualizar');
    }
});

// 6. ELIMINAR
router.get('/usuarios/eliminar/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
        res.redirect('/admin/usuarios?success=deleted');
    } catch (err) {
        res.status(500).send('Error al eliminar');
    }
});

module.exports = router;
