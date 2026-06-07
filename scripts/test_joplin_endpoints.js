const fs = require('fs');

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

async function testEndpoint(path) {
  const headers = {
    "Content-Type": "application/json",
    "Cookie": `sessionId=${joplinToken}`,
    "X-API-AUTH": joplinToken,
  };
  try {
    const res = await fetch(`${joplinUrl}${path}`, { headers });
    console.log(`GET ${path} -> Status: ${res.status}`);
    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        console.log(`  JSON response (first 2 items/keys):`, Object.keys(data), data.items ? data.items.slice(0, 2) : data);
      } catch {
        console.log(`  Text response (first 100 chars):`, text.slice(0, 100));
      }
    } else {
      console.log(`  Error:`, await res.text());
    }
  } catch (err) {
    console.error(`  Failed GET ${path}:`, err.message);
  }
}

async function run() {
  // Try to list folders or items
  await testEndpoint("/api/items");
  await testEndpoint("/api/items?type=2");
  await testEndpoint("/api/items/root:/:/children");
  // Let's check folder children
  const VERSE_NOTES_FOLDER_ID = "b1b11a00000000000000000000000001";
  await testEndpoint(`/api/items/root:/${VERSE_NOTES_FOLDER_ID}:/children`);
}

run();
