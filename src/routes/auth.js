const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// --- MIDDLEWARE DE VALIDACIÓN ---
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('❌ Errores de validación:', errors.array());
        // En lugar de solo un texto, podrías redirigir con error para que no se quede la pantalla en blanco
        return res.status(400).send('Datos inválidos. Asegúrate de que el correo sea real y la contraseña tenga 6+ caracteres.');
    }
    next();
};

// 1. LISTAR USUARIOS
router.get('/usuarios', async (req, res) => {
    try {
        const [usuarios] = await db.query('SELECT id, nombre, correo, rol, grado, grupo FROM usuarios');
        const [stats] = await db.query(`
            SELECT 
                SUM(CASE WHEN rol = 'admin' THEN 1 ELSE 0 END) as totalAdmins,
                SUM(CASE WHEN rol = 'maestro' THEN 1 ELSE 0 END) as totalMaestros,
                SUM(CASE WHEN rol = 'alumno' THEN 1 ELSE 0 END) as totalAlumnos
            FROM usuarios
        `);

        res.render('admin/usuarios', { 
            usuarios, 
            stats: stats[0] || { totalAdmins: 0, totalMaestros: 0, totalAlumnos: 0 }, 
            title: 'Gestión de Usuarios' 
        });
    } catch (err) {
        console.error('❌ Error al obtener usuarios:', err);
        res.status(500).send('Error interno del servidor');
    }
});

// 2. FORMULARIO CREAR
router.get('/usuarios/crear', (req, res) => {
    res.render('admin/crear_usuario', { title: 'Registrar Usuario' });
});

// 3. PROCESO DE GUARDADO (Encriptación Asegurada)
router.post('/usuarios/guardar', [
    body('nombre').trim().notEmpty(),
    body('correo').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('rol').isIn(['admin', 'maestro', 'alumno']),
    validate
], async (req, res) => {
    const { nombre, correo, password, rol, grado, grupo } = req.body;
    
    // Normalizamos para evitar errores de lógica
    const rolFinal = rol.toLowerCase().trim();
    const gradoFinal = (rolFinal === 'admin') ? null : (grado || null);
    const grupoFinal = (rolFinal === 'admin') ? null : (grupo || 'A');

    try {
        // Encriptamos la contraseña antes de guardar
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.query(
            'INSERT INTO usuarios (nombre, correo, password, rol, grado, grupo) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, correo, hashedPassword, rolFinal, gradoFinal, grupoFinal]
        );
        res.redirect('/admin/usuarios?success=created');
    } catch (err) {
        console.error('❌ Error al guardar:', err);
        res.status(500).send('Error al guardar el usuario. ¿Quizás el correo ya existe?');
    }
});

// 4. FORMULARIO EDITAR
router.get('/usuarios/editar/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE id = ?', [id]);
        if (rows.length > 0) {
            res.render('admin/editar_usuario', { 
                usuario: rows[0], 
                title: 'Editar Usuario' 
            });
        } else {
            res.status(404).send('Usuario no encontrado');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar datos');
    }
});

// 5. ACTUALIZAR (Sin cambiar contraseña por aquí)
router.post('/usuarios/actualizar/:id', [
    body('nombre').trim().notEmpty(),
    body('correo').isEmail().normalizeEmail(),
    body('rol').isIn(['admin', 'maestro', 'alumno']),
    validate
], async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, rol, grado, grupo } = req.body;
    
    const rolFinal = rol.toLowerCase().trim();
    const gradoFinal = (rolFinal === 'admin') ? null : (grado || null);
    const grupoFinal = (rolFinal === 'admin') ? null : (grupo || 'A');

    try {
        await db.query(
            'UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, grado = ?, grupo = ? WHERE id = ?',
            [nombre, correo, rolFinal, gradoFinal, grupoFinal, id]
        );
        res.redirect('/admin/usuarios?success=updated');
    } catch (err) {
        console.error('❌ Error al actualizar:', err);
        res.status(500).send('Error al actualizar');
    }
});

// 6. ELIMINAR
router.get('/usuarios/eliminar/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
        res.redirect('/admin/usuarios?success=deleted');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al eliminar');
    }
});

module.exports = router;
