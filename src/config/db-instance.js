// ============================================
// DB INSTANCE - Singleton para compartir la instancia de base de datos
// ============================================

let dbInstance = null;

function setDbInstance(db) {
    dbInstance = db;
}

function getDbInstance() {
    if (!dbInstance) {
        throw new Error('Database instance not initialized. Call setDbInstance first.');
    }
    return dbInstance;
}

module.exports = {
    setDbInstance,
    getDbInstance
};

