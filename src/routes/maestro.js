const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/dashboard', async (req, res) => {
    try {
        const maestroId = req.session.user.id;
        const [maestroData] = await db.query('SELECT * FROM usuarios WHERE id = ?', [maestroId]);
        const maestro = maestroData[0];

        if (!maestro) return res.redirect('/login');

        // 1. Alumnos del mismo salón
        const [alumnos] = await db.query(
            'SELECT id, nombre FROM usuarios WHERE rol = "alumno" AND grado = ? AND grupo = ? ORDER BY nombre',
            [maestro.grado, maestro.grupo]
        );
        
        // 2. Materias del grado
        const [materias] = await db.query(
            'SELECT * FROM materias WHERE grado_asignado = ? ORDER BY nombre_materia',
            [maestro.grado]
        );

        // 3. Historial (Usamos grado/grupo para que el maestro vea todo lo de su salón)
        const [historial] = await db.query(`
            SELECT c.id, u.nombre AS alumno, m.nombre_materia, c.calificacion, c.materia_id, c.alumno_id
            FROM calificaciones c
            JOIN usuarios u ON c.alumno_id = u.id
            JOIN materias m ON c.materia_id = m.id
            WHERE u.grado = ? AND u.grupo = ?
            ORDER BY u.nombre ASC`, 
            [maestro.grado, maestro.grupo]
        );

        res.render('maestro/dashboard', { 
            alumnos, materias, historial, maestro,
            title: 'Panel del Maestro',
            success: req.query.success 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar el panel');
    }
});

router.post('/calificar', async (req, res) => {
    const { alumno_id, materia_id, nota } = req.body;
    const maestro_id = req.session.user.id;
    try {
        const [existe] = await db.query(
            'SELECT id FROM calificaciones WHERE alumno_id = ? AND materia_id = ?',
            [alumno_id, materia_id]
        );

        if (existe.length > 0) {
            await db.query(
                'UPDATE calificaciones SET calificacion = ?, maestro_id = ? WHERE id = ?',
                [nota, maestro_id, existe[0].id]
            );
        } else {
            await db.query(
                'INSERT INTO calificaciones (alumno_id, materia_id, maestro_id, calificacion) VALUES (?, ?, ?, ?)',
                [alumno_id, materia_id, maestro_id, nota]
            );
        }
        res.redirect('/maestro/dashboard?success=true');
    } catch (err) {
        res.status(500).send('Error al calificar');
    }
});

module.exports = router;
