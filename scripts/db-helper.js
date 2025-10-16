#!/usr/bin/env node

/**
 * Helper para operaciones de base de datos
 * Usa la misma configuración que el servidor principal
 */

const DatabaseManager = require('../src/config/database');

class DatabaseHelper {
    constructor() {
        this.db = new DatabaseManager();
        this.connected = false;
    }

    async connect() {
        if (!this.connected) {
            await this.db.connect();
            this.connected = true;
            console.log('✅ Conectado a la base de datos');
        }
    }

    async disconnect() {
        if (this.connected) {
            await this.db.close();
            this.connected = false;
            console.log('✅ Desconectado de la base de datos');
        }
    }

    async query(sql, params = []) {
        await this.connect();
        return await this.db.query(sql, params);
    }

    async run(sql, params = []) {
        await this.connect();
        return await this.db.run(sql, params);
    }

    async get(sql, params = []) {
        await this.connect();
        return await this.db.get(sql, params);
    }

    async all(sql, params = []) {
        await this.connect();
        return await this.db.all(sql, params);
    }

    // Métodos específicos para complejos
    async getComplexes() {
        return await this.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre, c.direccion, c.telefono, c.email
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
    }

    async updateComplexName(id, newName) {
        return await this.run('UPDATE complejos SET nombre = $1 WHERE id = $2', [newName, id]);
    }

    async getCourts() {
        return await this.all(`
            SELECT ca.id, ca.nombre, ca.tipo, ca.precio_hora, c.nombre as complejo_nombre, ci.nombre as ciudad_nombre
            FROM canchas ca
            JOIN complejos c ON ca.complejo_id = c.id
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY ca.id
        `);
    }

    async updateCourtPrice(id, newPrice) {
        return await this.run('UPDATE canchas SET precio_hora = $1 WHERE id = $2', [newPrice, id]);
    }

    async getReservations(limit = 10) {
        return await this.all(`
            SELECT r.id, r.codigo_reserva, r.nombre_cliente, r.email_cliente, 
                   r.fecha, r.hora_inicio, r.hora_fin, r.estado, r.precio_total,
                   c.nombre as cancha_nombre, co.nombre as complejo_nombre, ci.nombre as ciudad_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            JOIN ciudades ci ON co.ciudad_id = ci.id
            ORDER BY r.created_at DESC
            LIMIT $1
        `, [limit]);
    }
}

module.exports = DatabaseHelper;
