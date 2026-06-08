import fs from 'fs';
import path from 'path';
import readline from 'readline';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const openBibleBooks = [
  "Gen", "Exod", "Lev", "Num", "Deut", "Josh", "Judg", "Ruth", "1Sam", "2Sam", 
  "1Kgs", "2Kgs", "1Chr", "2Chr", "Ezra", "Neh", "Esth", "Job", "Ps", "Prov", 
  "Eccl", "Song", "Isa", "Jer", "Lam", "Ezek", "Dan", "Hos", "Joel", "Amos", 
  "Obad", "Jonah", "Mic", "Nah", "Hab", "Zeph", "Hag", "Zech", "Mal", "Matt", 
  "Mark", "Luke", "John", "Acts", "Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", 
  "Col", "1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm", "Heb", "Jas", 
  "1Pet", "2Pet", "1John", "2John", "3John", "Jude", "Rev"
];

const bookNameToId: Record<string, number> = {};
openBibleBooks.forEach((name, idx) => {
  bookNameToId[name] = idx + 1; // 1 to 66
});

function parseRef(refStr: string): number | null {
  // Ej: Gen.1.1
  const parts = refStr.split('.');
  if (parts.length < 3) return null;
  const book = parts[0];
  const chapter = parseInt(parts[1], 10);
  const verse = parseInt(parts[2], 10);
  
  const bookId = bookNameToId[book];
  if (!bookId) return null;
  
  return (bookId * 1000000) + (chapter * 1000) + verse;
}

async function run() {
  console.log("📂 Iniciando importación masiva de referencias cruzadas...");

  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    const url = "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/sources/extras/cross_references.txt";
    console.log("⬇️ Descargando listado oficial desde Github...");
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo descargar: " + res.statusText);
    const text = await res.text();
    
    const lines = text.split('\n');
    console.log(`✅ Archivo descargado. ${lines.length} líneas detectadas.`);

    let batch: any[] = [];
    let totalInserted = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('From Verse') || trimmed.startsWith('#')) continue;

      const [fromStr, toStr, votesStr] = trimmed.split('\t');
      if (!fromStr || !toStr || !votesStr) continue;

      const fromVid = parseRef(fromStr);
      if (!fromVid) continue;

      // toStr puede ser un rango "Prov.8.22-Prov.8.30", tomamos el inicio
      const toSingle = toStr.split('-')[0];
      const toVid = parseRef(toSingle);
      if (!toVid) continue;

      const votes = parseInt(votesStr, 10) || 0;
      
      batch.push([fromVid, toVid, votes]);

      if (batch.length >= 10000) {
        await pool.query(
          `INSERT IGNORE INTO bible_cross_references (vid_origen, vid_destino, votos) VALUES ?`,
          [batch]
        );
        totalInserted += batch.length;
        console.log(`⏳ Progreso: insertadas ${totalInserted} referencias...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await pool.query(
        `INSERT IGNORE INTO bible_cross_references (vid_origen, vid_destino, votos) VALUES ?`,
        [batch]
      );
      totalInserted += batch.length;
    }

    console.log(`✅ ¡Éxito! Se insertaron en total ${totalInserted} referencias cruzadas.`);

  } catch (error) {
    console.error("❌ Error en la importación:", error);
  } finally {
    await pool.end();
  }
}

run();
