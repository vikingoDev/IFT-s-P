// file-client.js
// -------------------------------------------------------------------
// Cliente TCP que recibe un archivo del servidor y lo guarda en disco
// usando Streams.
// -------------------------------------------------------------------

const net  = require('net');       // 1) Para conectar por TCP (Duplex stream)
const fs   = require('fs');        // 2) Para crear/escribir archivos
const path = require('path');      // 3) Para construir rutas universales

// 4) Configuración de conexión
const PORT        = 5000;  
const HOST        = 'localhost';

// 5) Ruta donde guardaremos el archivo recibido.
//    __dirname = carpeta donde está este script.
//    downloads/sample_received.txt será creado o sobreescrito.
const OUTPUT_PATH = path.join(__dirname, 'downloads', 'test.txt');

// 6) Aseguramos que exista la carpeta 'downloads/'
if (!fs.existsSync(path.dirname(OUTPUT_PATH))) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
}

// 7) Creamos el socket cliente (Duplex stream)
const client      = new net.Socket();

// 8) Creamos un Writable Stream para escribir en disco
const writeStream = fs.createWriteStream(OUTPUT_PATH);

// 9) Nos conectamos al servidor en PORT/HOST
client.connect(PORT, HOST, () => {
  console.log(`🔗 Conectado a ${HOST}:${PORT}. Iniciando descarga...`);
});

// 10) Evento 'data': se dispara con cada chunk (Buffer) que envía el servidor
client.on('data', chunk => {
  // chunk.length bytes recibidos → escribimos en el archivo destino
  writeStream.write(chunk);
});

// 11) Evento 'end': el servidor cerró la conexión (ya no habrá más datos)
client.on('end', () => {
  writeStream.end(); // Cerramos el Writable Stream
  console.log('✅ Descarga completada. Archivo guardado en:', OUTPUT_PATH);
});

// 12) Evento 'error': captura errores de red o de escritura
client.on('error', err => {
  console.error('❌ Error en el cliente:', err.message);
  writeStream.end(); // Asegura cerrar el stream en caso de fallo
});



