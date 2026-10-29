DROP DATABASE IF EXISTS torneo_futbol5;
CREATE DATABASE torneo_futbol5 CHARACTER SET utf8mb4;
USE torneo_futbol5;

CREATE TABLE login (
    correo     VARCHAR(100) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    rol        ENUM('administrador', 'planillero') NOT NULL,
    CONSTRAINT pk_login PRIMARY KEY (correo),
    CONSTRAINT chk_login_correo CHECK (correo LIKE '%_@_%._%')
);

CREATE TABLE facultad (
    id_facultad INT AUTO_INCREMENT,
    nombre      VARCHAR(100) NOT NULL,
    CONSTRAINT pk_facultad PRIMARY KEY (id_facultad),
    CONSTRAINT uq_facultad_nombre UNIQUE (nombre)
);

CREATE TABLE torneo (
    id_torneo    INT AUTO_INCREMENT,
    nombre       VARCHAR(100) NOT NULL,
    anio         INT NOT NULL,
    semestre     INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin    DATE NOT NULL,
    estado       ENUM('inscripcion', 'en_curso', 'finalizado') NOT NULL DEFAULT 'inscripcion',
    CONSTRAINT pk_torneo PRIMARY KEY (id_torneo),
    CONSTRAINT uq_torneo_edicion UNIQUE (anio, semestre),
    CONSTRAINT chk_torneo_semestre CHECK (semestre IN (1, 2)),
    CONSTRAINT chk_torneo_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_torneo_anio_inicio CHECK (YEAR(fecha_inicio) = anio)
);

CREATE TABLE complejo (
    id_complejo  INT AUTO_INCREMENT,
    nombre       VARCHAR(100) NOT NULL,
    direccion    VARCHAR(150) NOT NULL,
    departamento VARCHAR(30) NOT NULL,
    CONSTRAINT pk_complejo PRIMARY KEY (id_complejo),
    CONSTRAINT uq_complejo_nombre UNIQUE (nombre),
    CONSTRAINT chk_complejo_departamento CHECK (departamento IN (
        'Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno',
        'Flores', 'Florida', 'Lavalleja', 'Maldonado', 'Montevideo',
        'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto',
        'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres'
    ))
);

CREATE TABLE turno (
    id_turno    INT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    CONSTRAINT pk_turno PRIMARY KEY (id_turno),
    CONSTRAINT uq_turno_inicio UNIQUE (hora_inicio),
    CONSTRAINT chk_turno_rango CHECK (hora_inicio >= '18:00:00' AND hora_fin <= '23:00:00'),
    CONSTRAINT chk_turno_duracion CHECK (TIMEDIFF(hora_fin, hora_inicio) = '01:00:00')
);

CREATE TABLE jugador (
    ci               VARCHAR(8) NOT NULL,
    nombre           VARCHAR(50) NOT NULL,
    apellido         VARCHAR(50) NOT NULL,
    email            VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    id_facultad      INT NOT NULL,
    tipo             ENUM('grado', 'posgrado', 'docente', 'funcionario') NOT NULL,
    CONSTRAINT pk_jugador PRIMARY KEY (ci),
    CONSTRAINT uq_jugador_email UNIQUE (email),
    CONSTRAINT fk_jugador_facultad FOREIGN KEY (id_facultad) REFERENCES facultad (id_facultad),
    CONSTRAINT chk_jugador_ci CHECK (ci REGEXP '^[0-9]{7,8}$'),
    CONSTRAINT chk_jugador_email CHECK (email LIKE '%_@_%._%')
);

CREATE TABLE cancha (
    nombre_cancha VARCHAR(50) NOT NULL,
    id_complejo   INT NOT NULL,
    superficie    ENUM('sintetico', 'parquet') NOT NULL,
    techada       BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_cancha PRIMARY KEY (nombre_cancha, id_complejo),
    CONSTRAINT fk_cancha_complejo FOREIGN KEY (id_complejo) REFERENCES complejo (id_complejo)
);

CREATE TABLE equipo (
    id_equipo   INT AUTO_INCREMENT,
    nombre      VARCHAR(100) NOT NULL,
    id_torneo   INT NOT NULL,
    id_facultad INT NOT NULL,
    ci_capitan  VARCHAR(8) NULL,
    CONSTRAINT pk_equipo PRIMARY KEY (id_equipo),
    CONSTRAINT uq_equipo_nombre_torneo UNIQUE (id_torneo, nombre),
    CONSTRAINT uq_equipo_torneo UNIQUE (id_equipo, id_torneo),
    CONSTRAINT fk_equipo_torneo FOREIGN KEY (id_torneo) REFERENCES torneo (id_torneo),
    CONSTRAINT fk_equipo_facultad FOREIGN KEY (id_facultad) REFERENCES facultad (id_facultad)
);

CREATE TABLE equipo_jugador_torneo (
    id_equipo       INT NOT NULL,
    ci_jugador      VARCHAR(8) NOT NULL,
    id_torneo       INT NOT NULL,
    numero_camiseta TINYINT NOT NULL,
    CONSTRAINT pk_plantel PRIMARY KEY (id_equipo, ci_jugador),
    CONSTRAINT uq_plantel_jugador_torneo UNIQUE (ci_jugador, id_torneo),
    CONSTRAINT uq_plantel_camiseta UNIQUE (id_equipo, numero_camiseta),
    CONSTRAINT fk_plantel_equipo FOREIGN KEY (id_equipo, id_torneo) REFERENCES equipo (id_equipo, id_torneo),
    CONSTRAINT fk_plantel_jugador FOREIGN KEY (ci_jugador) REFERENCES jugador (ci),
    CONSTRAINT chk_plantel_camiseta CHECK (numero_camiseta BETWEEN 1 AND 99)
);

ALTER TABLE equipo
    ADD CONSTRAINT fk_equipo_capitan FOREIGN KEY (id_equipo, ci_capitan)
        REFERENCES equipo_jugador_torneo (id_equipo, ci_jugador);

CREATE TABLE partido (
    id_partido          INT AUTO_INCREMENT,
    id_torneo           INT NOT NULL,
    numero_fecha        INT NOT NULL,
    id_equipo_local     INT NOT NULL,
    id_equipo_visitante INT NOT NULL,
    dia                 DATE NOT NULL,
    id_turno            INT NOT NULL,
    nombre_cancha       VARCHAR(50) NOT NULL,
    id_complejo         INT NOT NULL,
    estado              ENUM('programado', 'jugado', 'postergado', 'cancelado') NOT NULL DEFAULT 'programado',
    equipo_menor  INT AS (LEAST(id_equipo_local, id_equipo_visitante)) STORED,
    equipo_mayor  INT AS (GREATEST(id_equipo_local, id_equipo_visitante)) STORED,
    cruce_activo  TINYINT AS (IF(estado = 'cancelado', NULL, 1)) STORED,
    cancha_activa TINYINT AS (IF(estado IN ('programado', 'jugado'), 1, NULL)) STORED,
    CONSTRAINT pk_partido PRIMARY KEY (id_partido),
    CONSTRAINT uq_partido_cruce UNIQUE (id_torneo, equipo_menor, equipo_mayor, cruce_activo),
    CONSTRAINT uq_partido_cancha_turno UNIQUE (dia, id_turno, nombre_cancha, id_complejo, cancha_activa),
    CONSTRAINT fk_partido_local FOREIGN KEY (id_equipo_local, id_torneo) REFERENCES equipo (id_equipo, id_torneo),
    CONSTRAINT fk_partido_visitante FOREIGN KEY (id_equipo_visitante, id_torneo) REFERENCES equipo (id_equipo, id_torneo),
    CONSTRAINT fk_partido_turno FOREIGN KEY (id_turno) REFERENCES turno (id_turno),
    CONSTRAINT fk_partido_cancha FOREIGN KEY (nombre_cancha, id_complejo) REFERENCES cancha (nombre_cancha, id_complejo),
    CONSTRAINT chk_partido_rivales CHECK (id_equipo_local <> id_equipo_visitante),
    CONSTRAINT chk_partido_fecha CHECK (numero_fecha >= 1)
);

CREATE TABLE planilla_partido (
    id_partido INT NOT NULL,
    ci_jugador VARCHAR(8) NOT NULL,
    id_equipo  INT NOT NULL,
    CONSTRAINT pk_planilla PRIMARY KEY (id_partido, ci_jugador),
    CONSTRAINT fk_planilla_partido FOREIGN KEY (id_partido) REFERENCES partido (id_partido),
    CONSTRAINT fk_planilla_plantel FOREIGN KEY (id_equipo, ci_jugador) REFERENCES equipo_jugador_torneo (id_equipo, ci_jugador)
);

CREATE TABLE gol (
    id_gol     INT AUTO_INCREMENT,
    id_partido INT NOT NULL,
    ci_jugador VARCHAR(8) NOT NULL,
    minuto     INT NOT NULL,
    autogol    BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT pk_gol PRIMARY KEY (id_gol),
    CONSTRAINT fk_gol_planilla FOREIGN KEY (id_partido, ci_jugador) REFERENCES planilla_partido (id_partido, ci_jugador),
    CONSTRAINT chk_gol_minuto CHECK (minuto BETWEEN 0 AND 60)
);

CREATE TABLE tarjeta (
    id_tarjeta INT AUTO_INCREMENT,
    id_partido INT NOT NULL,
    ci_jugador VARCHAR(8) NOT NULL,
    minuto     INT NOT NULL,
    color      ENUM('amarilla', 'roja') NOT NULL,
    CONSTRAINT pk_tarjeta PRIMARY KEY (id_tarjeta),
    CONSTRAINT fk_tarjeta_planilla FOREIGN KEY (id_partido, ci_jugador) REFERENCES planilla_partido (id_partido, ci_jugador),
    CONSTRAINT chk_tarjeta_minuto CHECK (minuto BETWEEN 0 AND 60)
);

CREATE TABLE sancion_jugador (
    id_sancion          INT AUTO_INCREMENT,
    ci_jugador          VARCHAR(8) NOT NULL,
    id_torneo           INT NOT NULL,
    motivo              ENUM('roja', 'acumulacion_amarillas', 'disciplinaria') NOT NULL,
    numero_fecha_inicio INT NOT NULL,
    cantidad_fechas     INT NOT NULL DEFAULT 1,
    id_tarjeta          INT NULL,
    descripcion         VARCHAR(255) NULL,
    CONSTRAINT pk_sancion PRIMARY KEY (id_sancion),
    CONSTRAINT uq_sancion_tarjeta UNIQUE (id_tarjeta),
    CONSTRAINT fk_sancion_plantel FOREIGN KEY (ci_jugador, id_torneo) REFERENCES equipo_jugador_torneo (ci_jugador, id_torneo),
    CONSTRAINT fk_sancion_tarjeta FOREIGN KEY (id_tarjeta) REFERENCES tarjeta (id_tarjeta),
    CONSTRAINT chk_sancion_fecha CHECK (numero_fecha_inicio >= 1),
    CONSTRAINT chk_sancion_cantidad CHECK (cantidad_fechas >= 1),
    CONSTRAINT chk_sancion_origen CHECK (
        (motivo = 'disciplinaria' AND id_tarjeta IS NULL)
        OR
        (motivo <> 'disciplinaria' AND id_tarjeta IS NOT NULL AND cantidad_fechas = 1)
    )
);