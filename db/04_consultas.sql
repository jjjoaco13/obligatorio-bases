# En las consultas en las que aparezca el símbolo (%s), se debe a que
# está referenciando un parámetro obtenido en

#---------------------------------------------------------------------------------------------------------

# Consulta para login
SELECT correo, contrasena, rol FROM login WHERE correo = %s;

#---------------------------------------------------------------------------------------------------------

# Listar facultades
SELECT id_facultad, nombre FROM facultad ORDER BY nombre;

#---------------------------------------------------------------------------------------------------------

# Consultas para tabla torneo
    # Listar torneo
    SELECT id_torneo, nombre, anio, semestre, fecha_inicio, fecha_fin, estado
    FROM torneo
        ORDER BY anio DESC, semestre DESC;

    # Listar inscriptos para el torneo
    SELECT j.ci, j.nombre, j.apellido, e.id_equipo, e.nombre AS equipo
            FROM equipo_jugador_torneo ejt
            JOIN jugador j ON j.ci = ejt.ci_jugador
            JOIN equipo e ON e.id_equipo = ejt.id_equipo
            WHERE ejt.id_torneo = %s
            ORDER BY j.apellido, j.nombre;

    # Crear torneo
    INSERT INTO torneo (nombre, anio, semestre, fecha_inicio, fecha_fin, estado)
                VALUES (%(nombre)s, %(anio)s, %(semestre)s, %(fecha_inicio)s, %(fecha_fin)s, %(estado)s);

    # Modificar torneo
        # Validar que exista
        SELECT 1 FROM torneo WHERE id_torneo = %s;
    UPDATE torneo SET nombre = %(nombre)s, anio = %(anio)s, semestre = %(semestre)s,
                    fecha_inicio = %(fecha_inicio)s, fecha_fin = %(fecha_fin)s, estado = %(estado)s
        WHERE id_torneo = %(id_torneo)s;

    # Eliminar torneo
    DELETE FROM torneo WHERE id_torneo = %s;

#---------------------------------------------------------------------------------------------------------

# Consultas para complejo
    # Listar complejos
    SELECT c.id_complejo, c.nombre, c.direccion, c.departamento,
                   (SELECT COUNT(*) FROM cancha ca WHERE ca.id_complejo = c.id_complejo) AS cantidad_canchas
            FROM complejo c
            ORDER BY c.nombre;

    # Crear complejo
    INSERT INTO complejo (nombre, direccion, departamento)
        VALUES (%(nombre)s, %(direccion)s, %(departamento)s);

    # Modificar complejo
        # Validar que exista
        SELECT 1 FROM complejo WHERE id_complejo = %s;
    UPDATE complejo SET nombre = %(nombre)s, direccion = %(direccion)s, departamento = %(departamento)s
            WHERE id_complejo = %(id_complejo)s;

    # Eliminar complejo
        # Chequear que el complejo NO contenga canchas (se deben eliminar previamente)
        SELECT 1 FROM cancha WHERE id_complejo = %s;
    DELETE FROM complejo WHERE id_complejo = %s;

#---------------------------------------------------------------------------------------------------------

# Consultas para turno
    # Listar turnos
    SELECT id_turno, hora_inicio, hora_fin FROM turno ORDER BY hora_inicio;

#---------------------------------------------------------------------------------------------------------

# Consultas para jugador

#---------------------------------------------------------------------------------------------------------

# Consultas para cancha
    # Listar canchas
        # *Con id_complejo*
        SELECT ca.nombre_cancha, ca.id_complejo, c.nombre AS complejo, ca.superficie, ca.techada
        FROM cancha ca JOIN complejo c ON c.id_complejo = ca.id_complejo
            WHERE ca.id_complejo = %s;
        # *Sin id_complejo*
        SELECT ca.nombre_cancha, ca.id_complejo, c.nombre AS complejo, ca.superficie, ca.techada
        FROM cancha ca JOIN complejo c ON c.id_complejo = ca.id_complejo
            ORDER BY c.nombre, ca.nombre_cancha;

    # Crear cancha
        # Validar que exista el complejo
        SELECT 1 FROM complejo WHERE id_complejo = %s;
        # Validar que NO exista la cancha
        SELECT 1 FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s;
    INSERT INTO cancha (nombre_cancha, id_complejo, superficie, techada) VALUES (%s, %s, %s, %s);

    # Modificar cancha
        # Validar que la cancha exista
        SELECT 1 FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s;
    UPDATE cancha SET superficie = %s, techada = %s WHERE id_complejo = %s AND nombre_cancha = %s;

    # Eliminar cancha
        # Chequear que la cancha NO tenga partidos asignados (se deben eliminar antes)
        SELECT 1 FROM partido WHERE id_complejo = %s AND nombre_cancha = %s;
    DELETE FROM cancha WHERE id_complejo = %s AND nombre_cancha = %s;
