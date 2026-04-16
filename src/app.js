// Ejemplo de lo que deberías tener en routes/auth.js
router.post('/login', async (req, res) => {
    const { correo, password } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        
        if (rows.length === 0) {
            return res.redirect('/login?error=notfound');
        }

        const user = rows[0];

        // --- ESTA ES LA PARTE QUE DEBES REVISAR ---
        // Si usas Bcrypt (lo más seguro):
        const match = await bcrypt.compare(password, user.password);
        
        // Si NO usas Bcrypt y están en texto plano (solo para tareas):
        // const match = (password === user.password);

        if (match) {
            req.session.user = { id: user.id, nombre: user.nombre, rol: user.rol };
            // Redirección por rol...
            return res.redirect('/'); 
        } else {
            // Si la contraseña no coincide, mándalo de regreso
            return res.redirect('/login?error=wrongpass');
        }

    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).send("Error en el servidor");
    }
});
