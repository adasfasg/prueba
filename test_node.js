const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
db.prepare('INSERT INTO test (name) VALUES (?)').run('PMForgeX');
console.log('DatabaseSync result:', db.prepare('SELECT * FROM test').all());
