const fs = require('fs');
const mysql = require('mysql2/promise');

const envFile = fs.readFileSync('/home/david/proyectos/BibliaAPP/.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const joplinUrl = env.JOPLIN_API_URL;
const joplinToken = "aXRON7XS0LuHGHwoXSQsgu";

function formatJoplinNote(title, body, id, parentId) {
  const timeStr = new Date().toISOString().replace(/\.\d+Z$/, ".000Z");
  const parentLine = parentId ? `parent_id: ${parentId}\n` : "";
  return `${title}\n\n${body}\n\nid: ${id}\n${parentLine}created_time: ${timeStr}\nupdated_time: ${timeStr}\nis_conflict: 0\nlatitude: 0.00000000\nlongitude: 0.00000000\naltitude: 0.0000\nauthor: \nsource_url: \nis_todo: 0\ntodo_due: 0\ntodo_completed: 0\nsource: joplin\nsource_application: net.cozic.joplin-desktop\napplication_data: \norder: 0\nuser_created_time: ${timeStr}\nuser_updated_time: ${timeStr}\nencryption_cipher_text: \nencryption_was_encrypted: 0\nencryption_key_id: \ntype_: 1`;
}

async function test() {
  console.log("Starting save flow test...");
  
  // 1. Create notebook folder in Joplin Server
  const folderId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const folderTitle = "Test Folder " + new Date().toLocaleTimeString();
  const folderContent = `${folderTitle}\n\nid: ${folderId}\ncreated_time: 2026-06-07T03:00:00.000Z\nupdated_time: 2026-06-07T03:00:00.000Z\nis_conflict: 0\ntype_: 2`;
  
  const headers = {
    "Content-Type": "application/octet-stream",
    "Cookie": `sessionId=${joplinToken}`,
    "X-API-AUTH": joplinToken,
  };
  
  console.log(`Creating folder ${folderTitle} (ID: ${folderId}) in Joplin...`);
  const folderRes = await fetch(`${joplinUrl}/api/items/root:/${folderId}.md:/content`, {
    method: "PUT",
    headers,
    body: folderContent
  });
  
  console.log("Folder Creation Status:", folderRes.status);
  if (!folderRes.ok) {
    console.error("Folder creation failed:", await folderRes.text());
    return;
  }
  
  // 2. Create note in Joplin Server under folderId
  const noteId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const noteTitle = "Test Note " + new Date().toLocaleTimeString();
  const noteBody = "This is a test note body.";
  const noteContent = formatJoplinNote(noteTitle, noteBody, noteId, folderId);
  
  console.log(`Creating note ${noteTitle} (ID: ${noteId}) under folder ${folderId}...`);
  const noteRes = await fetch(`${joplinUrl}/api/items/root:/${noteId}.md:/content`, {
    method: "PUT",
    headers,
    body: noteContent
  });
  
  console.log("Note Creation Status:", noteRes.status);
  if (!noteRes.ok) {
    console.error("Note creation failed:", await noteRes.text());
    return;
  }

  // 3. Connect to MariaDB and insert notebook + note
  console.log("Connecting to MariaDB...");
  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
  });
  
  try {
    const [notebookResult] = await pool.query(
      "INSERT INTO bible_notebooks (name, joplin_folder_id) VALUES (?, ?)",
      [folderTitle, folderId]
    );
    const notebookId = notebookResult.insertId;
    console.log("Inserted notebook into DB. Local ID:", notebookId);
    
    const [noteResult] = await pool.query(
      "INSERT INTO bible_notebook_notes (notebook_id, title, content, joplin_note_id) VALUES (?, ?, ?, ?)",
      [notebookId, noteTitle, noteBody, noteId]
    );
    console.log("Inserted note into DB. Local ID:", noteResult.insertId);
    
    // 4. Update Note in Joplin
    const updatedBody = "This is updated note body content.";
    const updatedContent = formatJoplinNote(noteTitle, updatedBody, noteId, folderId);
    
    console.log(`Updating note ${noteId} in Joplin...`);
    const updateRes = await fetch(`${joplinUrl}/api/items/root:/${noteId}.md:/content`, {
      method: "PUT",
      headers,
      body: updatedContent
    });
    console.log("Note Update Status:", updateRes.status);
    if (!updateRes.ok) {
      console.error("Note update failed:", await updateRes.text());
    } else {
      await pool.query(
        "UPDATE bible_notebook_notes SET content = ? WHERE joplin_note_id = ?",
        [updatedBody, noteId]
      );
      console.log("Updated note in DB successfully.");
    }
  } catch (err) {
    console.error("DB error:", err);
  } finally {
    await pool.end();
  }
}

test();
