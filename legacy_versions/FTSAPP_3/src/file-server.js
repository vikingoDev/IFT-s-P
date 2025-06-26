// file-server.js
// -------------------------------------------------------------------
// Servidor TCP que envía un archivo completo al cliente usando Streams.
// -------------------------------------------------------------------

const net  = require('net');       // 1) Módulo para crear servidores/clients TCP (Duplex streams)
const fs   = require('fs');        // 2) Módulo para interactuar con el sistema de archivos
const path = require('path');      // 3) Módulo para construir rutas de forma portable

// 4) Definimos el puerto en el que el servidor escuchará conexiones entrantes
const PORT = 5000;

// 5) Construimos la ruta absoluta al archivo de origen.
//    __dirname = carpeta donde está este script.
//    files/test.txt debe existir y tener contenido.
const FILE_PATH = path.join(__dirname, 'files', 'test.txt');

// 6) Creamos el servidor TCP. El callback se invoca por cada nueva conexión cliente.
const server = net.createServer(socket => {
  // 7) socket.remoteAddress y remotePort identifican al cliente
  console.log(`Cliente conectado: ${socket.remoteAddress}:${socket.remotePort}`);

  // 8) Creamos un Readable Stream para leer el archivo en trozos de 64 KB (highWaterMark)
  const readStream = fs.createReadStream(FILE_PATH, { highWaterMark: 64 * 1024 });

  // 9) Evento 'error' en el Readable Stream: captura problemas al leer el archivo
  readStream.on('error', err => {
    console.error('❌ Error leyendo archivo:', err.message);
    socket.end(); // Terminamos la conexión si falla la lectura
  });

  // 10) Conectamos el Readable Stream al socket mediante pipe()
  //     Cada trozo (chunk) que sale del readStream se envía al cliente con socket.write(chunk)
  readStream.pipe(socket);

  // 11) Evento 'end' en el Readable Stream: se dispara al agotar todos los chunks
  readStream.on('end', () => {
    console.log('✅ Archivo enviado completamente.');
    socket.end(); // Cerramos la conexión TCP de forma ordenada (se envía FIN)
  });

  // 12) Evento 'error' en el socket: captura problemas de red o desconexiones abruptas
  socket.on('error', err => {
    console.error('❌ Error en la conexión del cliente:', err.message);
  });
});

// 13) Iniciamos la escucha del servidor en el puerto configurado
server.listen(PORT, () => {
  console.log(`🌐 file-server escuchando en http://localhost:${PORT}`);
});


