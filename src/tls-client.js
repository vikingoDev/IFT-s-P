// tls-client.js 
// -------------------------------------------------------------------
// Módulo TLS: maneja correctamente subida (PUT) de archivos
// esperando el ACK del servidor antes de resolver la promesa, y borra
// el archivo temporal solo si la operación fue exitosa.
// -------------------------------------------------------------------

// Importación de módulos nativos de Node.js
const tls = require('tls'); // Módulo para la creación de clientes y servidores TLS/SSL.
const fs = require('fs');   // Módulo para interactuar con el sistema de archivos (File System).
const path = require('path'); // Módulo para trabajar con rutas de archivos y directorios de forma normalizada.

// --- Configuración de la Conexión ---
const PORT = 6000; // Define el puerto en el que el servidor TLS (secure-server.js) está escuchando.
const HOST = 'localhost'; // Define la dirección del host del servidor TLS. 'localhost' indica que el servidor se ejecuta en la misma máquina.
const CA_PATH = path.join(__dirname, 'certs', 'server-cert.pem');
// Construye la ruta al archivo del certificado de la Autoridad Certificadora (CA) o al certificado autofirmado del servidor.
// '__dirname' es una variable de entorno en Node.js que devuelve la ruta absoluta del directorio donde se encuentra el script actual.
// Este certificado es usado por el cliente para verificar la autenticidad del servidor al que se conecta.

// Función para enviar comandos simples que no involucran transferencia de archivos pesados (ej: LIST, DELETE, RENAME).
function sendCommand(command) {
  // Retorna una Promesa, ya que la operación de red es asíncrona.
  return new Promise((resolve, reject) => {
    let response = ''; // Variable para acumular la respuesta recibida del servidor.

    // Intenta establecer una conexión TLS con el servidor.
    const socket = tls.connect(
      PORT, // Puerto del servidor.
      HOST, // Host del servidor.
      { ca: fs.readFileSync(CA_PATH) }, // Opciones de conexión:
                                       // 'ca': Especifica el certificado de la CA para verificar el servidor.
                                       // 'fs.readFileSync(CA_PATH)' lee el archivo del certificado de forma síncrona.
      () => {
        // Este callback se ejecuta una vez que la conexión TLS se ha establecido exitosamente.
        // Envía el comando al servidor, seguido de un carácter de nueva línea '\n'
        // que a menudo actúa como delimitador de comando para el servidor.
        socket.write(`${command}\n`);
      }
    );

    // Event listener para el evento 'data': se activa cuando se reciben datos del servidor.
    socket.on('data', chunk => {
      // Concatena el trozo de datos (chunk) recibido a la variable 'response'.
      // Los chunks son Buffers, por lo que se convierten a string.
      response += chunk.toString();
    });

    // Event listener para el evento 'end': se activa cuando el servidor cierra la conexión
    // (indica que ha terminado de enviar datos).
    socket.on('end', () => {
      // Resuelve la Promesa con la respuesta completa del servidor,
      // eliminando cualquier espacio en blanco al inicio o al final.
      resolve(response.trim());
    });

    // Event listener para el evento 'error': se activa si ocurre un error durante la conexión o comunicación.
    socket.on('error', err => {
      // Rechaza la Promesa con el error ocurrido.
      reject(err);
    });
  });
}

// Función para descargar un archivo del servidor.
function getFile(filename) {
  // Retorna una Promesa para manejar la operación asíncrona de descarga.
  return new Promise((resolve, reject) => {
    const chunks = []; // Array para almacenar los trozos (chunks) de datos del archivo recibido.

    // Establece la conexión TLS con el servidor.
    const socket = tls.connect(
      PORT,
      HOST,
      { ca: fs.readFileSync(CA_PATH) },
      () => {
        // Una vez conectado, envía el comando 'GET' seguido del nombre del archivo.
        socket.write(`GET ${filename}\n`);
      }
    );

    // Event listener para 'data': se activa al recibir cada trozo de datos del archivo.
    socket.on('data', chunk => {
      // Agrega el trozo (Buffer) al array 'chunks'.
      chunks.push(chunk);
    });

    // Event listener para 'end': se activa cuando el servidor ha enviado todos los datos del archivo y cierra la conexión.
    socket.on('end', () => {
      // Concatena todos los Buffers en el array 'chunks' en un único Buffer que representa el archivo completo.
      // Resuelve la Promesa con este Buffer.
      resolve(Buffer.concat(chunks));
    });

    // Event listener para 'error': maneja errores de conexión o comunicación.
    socket.on('error', err => {
      reject(err);
    });
  });
}

// Función para subir un archivo al servidor.
function putFile(filepath, remoteName) {
  // Retorna una Promesa para manejar la operación asíncrona de subida.
  return new Promise((resolve, reject) => {
    // Verificar que el archivo existe antes de intentar subirlo
    if (!fs.existsSync(filepath)) {
      return reject(new Error(`El archivo ${filepath} no existe`));
    }

    // Leer todo el archivo en memoria para simplificar el proceso
    let fileContent;
    try {
      fileContent = fs.readFileSync(filepath);
      console.log(`[PUT] Archivo leído: ${filepath}, tamaño: ${fileContent.length} bytes`);
    } catch (readErr) {
      return reject(new Error(`Error al leer el archivo: ${readErr.message}`));
    }

    // Establece la conexión TLS con el servidor.
    const socket = tls.connect(
      PORT,
      HOST,
      { ca: fs.readFileSync(CA_PATH) },
      () => {
        // Una vez conectado, envía el comando 'PUT' seguido del nombre con el que se guardará el archivo
        socket.write(`PUT ${remoteName}\n`);
      }
    );

    // Variable para acumular la respuesta del servidor
    let serverResponse = '';

    // Maneja los errores de socket
    socket.on('error', err => {
      console.error('[PUT] Error de conexión TLS:', err.message);
      reject(err);
    });

    // Recibe datos del servidor
    let readyReceived = false;

socket.on('data', chunk => {
  const message = chunk.toString();
  console.log(`[PUT] Recibido del servidor: ${message.trim()}`);
  serverResponse += message;

  // Esperamos primero READY: PUT
  if (!readyReceived && message.trim() === 'READY: PUT') {
    readyReceived = true;
    console.log('[PUT] Servidor listo, enviando archivo...');
    socket.write(fileContent);
    console.log('[PUT] Archivo enviado, finalizando escritura');
    socket.end(); // Cerramos después de enviar todo
  }
  // No hacemos nada más en 'data'. Esperamos que 'end' cierre la conexión.
});

socket.on('end', () => {
  console.log('[PUT] Conexión cerrada por el servidor');

  if (serverResponse.includes('OK: PUT complete')) {
    console.log('[PUT] Subida exitosa, borrando archivo temporal');
    fs.unlink(filepath, err => {
      if (err) console.warn('[PUT] No se pudo borrar el archivo temporal:', err.message);
    });
    resolve();
  } else {
    console.error('[PUT] Subida fallida, respuesta del servidor:', serverResponse);
    reject(new Error('PUT falló: ' + serverResponse.trim()));
  }
});

    // Cuando el servidor cierra la conexión
    socket.on('end', () => {
      console.log('[PUT] Conexión cerrada por el servidor');
      
      // Verificamos la respuesta final del servidor
      if (serverResponse.includes('OK: PUT complete')) {
        console.log('[PUT] Subida exitosa, borrando archivo temporal');
        // Si la subida fue exitosa, borramos el archivo temporal
        fs.unlink(filepath, err => {
          if (err) console.warn('[PUT] No se pudo borrar el archivo temporal:', err.message);
        });
        resolve();
      } else {
        console.error('[PUT] Subida fallida, respuesta del servidor:', serverResponse);
        reject(new Error('PUT falló: ' + serverResponse.trim()));
      }
    });
  });
}

// Exporta las funciones del módulo para que puedan ser utilizadas por otros archivos/módulos.
// Esta es la interfaz pública del módulo 'tls-client.js'.
module.exports = {
  sendCommand,
  getFile,
  putFile,
};
