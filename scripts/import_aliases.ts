import fs from 'fs/promises';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

type BookAliases = Record<string, string[]>;

async function run() {
  const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } = process.env;

  if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
    console.error("❌ Faltan variables de entorno para MySQL.");
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: MYSQL_HOST,
    port: Number(MYSQL_PORT || 3306),
    user: MYSQL_USER,
    password: MYSQL_PASSWORD || '',
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  let connection;

  try {
    console.log("📂 Leyendo archivo de alias local...");
    const filePath = path.join(__dirname, 'aliases.json');
    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      console.error(`❌ No se encontró el archivo de alias en: ${filePath}`);
      process.exit(1);
    }
    
    const aliasesData: BookAliases = JSON.parse(fileContent);

    connection = await pool.getConnection();

    console.log("🔍 Obteniendo libros existentes de la base de datos...");
    const [books] = await connection.query<any[]>('SELECT idBook, name FROM bible_books');
    
    // Normalizar a minúsculas sin acentos
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const bookMap = new Map<string, number>();
    for (const book of books) {
      bookMap.set(normalize(book.name), book.idBook);
    }

    const insertValues: [number, string][] = [];

    for (const [standardName, aliases] of Object.entries(aliasesData)) {
      const normalizedStandardName = normalize(standardName);
      const idBook = bookMap.get(normalizedStandardName);
      
      if (!idBook) {
        console.warn(`⚠️ No se encontró el libro '${standardName}' en bible_books. Se omitirán sus alias.`);
        continue;
      }

      for (const alias of aliases) {
        insertValues.push([idBook, alias]);
      }
    }

    if (insertValues.length === 0) {
      console.log("ℹ️ No hay alias para insertar.");
      return;
    }

    console.log(`📦 Se prepararon ${insertValues.length} alias para insertar. Iniciando transacción...`);

    await connection.beginTransaction();

    const [result] = await connection.query<any>(
      'INSERT IGNORE INTO bible_books_references (idBook, text) VALUES ?',
      [insertValues]
    );

    await connection.commit();
    console.log(`✅ ¡Éxito! Se insertaron ${result.affectedRows} alias de libros.`);

  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    if (connection) {
      console.log("⏪ Revirtiendo cambios (Rollback)...");
      await connection.rollback();
    }
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

run();
