const fs = require('fs');
const path = require('path');
const os = require('os');

const downloadsDir = path.join(os.homedir(), 'Downloads');
const targetFile = path.join(__dirname, 'serviceAccountKey.json');

try {
  const files = fs.readdirSync(downloadsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('ormeprassig'));

  if (jsonFiles.length === 0) {
    console.log('\n❌ NO SE ENCONTRÓ EL ARCHIVO EN DESCARGAS.');
    console.log('Por favor entra a este enlace:');
    console.log('https://console.firebase.google.com/project/ormeprassig-public/settings/serviceaccounts/adminsdk');
    console.log('y presiona "Generar nueva clave privada". Luego vuelve a correr este script.\n');
    process.exit(1);
  }

  // Find the most recently downloaded key
  let latestFile = jsonFiles[0];
  let latestTime = fs.statSync(path.join(downloadsDir, latestFile)).mtimeMs;

  for (const file of jsonFiles) {
    const time = fs.statSync(path.join(downloadsDir, file)).mtimeMs;
    if (time > latestTime) {
      latestFile = file;
      latestTime = time;
    }
  }

  const sourcePath = path.join(downloadsDir, latestFile);
  fs.copyFileSync(sourcePath, targetFile);

  console.log('\n✅ ¡EXITO! Se encontró el archivo: ' + latestFile);
  console.log('✅ Se copió correctamente como "serviceAccountKey.json".');
  console.log('👉 Ahora puedes detener esto (Ctrl+C) y ejecutar: npm run dev\n');

} catch (err) {
  console.error('Error:', err.message);
}
