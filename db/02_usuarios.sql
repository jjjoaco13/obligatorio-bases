USE torneo_futbol5;

DROP USER IF EXISTS 'app_login'@'%', 'app_admin'@'%', 'app_asistente'@'%';

CREATE USER 'app_login'@'%' IDENTIFIED BY 'Login_2026!';
CREATE USER 'app_admin'@'%' IDENTIFIED BY 'Admin_2026!';
CREATE USER 'app_asistente'@'%' IDENTIFIED BY 'Asistente_2026!';

GRANT SELECT ON torneo_futbol5.login TO 'app_login'@'%';

GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.* TO 'app_admin'@'%';

GRANT SELECT ON torneo_futbol5.torneo TO 'app_asistente'@'%';
GRANT SELECT ON torneo_futbol5.facultad TO 'app_asistente'@'%';
GRANT SELECT ON torneo_futbol5.jugador TO 'app_asistente'@'%';
GRANT SELECT ON torneo_futbol5.equipo TO 'app_asistente'@'%';
GRANT SELECT ON torneo_futbol5.equipo_jugador_torneo TO 'app_asistente'@'%';
GRANT SELECT ON torneo_futbol5.complejo TO 'app_asistente'@'%';
GRANT SELECT ON torneo_futbol5.cancha TO 'app_asistente'@'%';
GRANT SELECT ON torneo_futbol5.turno TO 'app_asistente'@'%';
GRANT SELECT, UPDATE (estado) ON torneo_futbol5.partido TO 'app_asistente'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.planilla_partido TO 'app_asistente'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.gol TO 'app_asistente'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON torneo_futbol5.tarjeta TO 'app_asistente'@'%';
GRANT SELECT, INSERT, DELETE ON torneo_futbol5.sancion_jugador TO 'app_asistente'@'%';