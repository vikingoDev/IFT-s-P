// secure-client.js
// -------------------------------------------------------------------
// Cliente TLS interactivo: LIST, GET, PUT, DELETE, RENAME, SALIR.
// -------------------------------------------------------------------

const tls = require('tls'); // Módulo para Transport Layer Security (conexiones seguras)
const fs = require('fs'); // Módulo para el sistema de archivos
const path = require('path'); // Módulo para trabajar con rutas de archivos
const readline = require('readline'); // Módulo para la interfaz de línea de comandos

const PORT = 6000; // Puerto del servidor
const HOST = 'localhost'; // Host del servidor
const CA_PATH = path.join(__dirname, 'certs', 'server-cert.pem'); // Ruta al certificado de la CA

const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); // Interfaz de línea de comandos
function prompt() { // Función para mostrar el prompt y procesar la entrada del usuario
  rl.question('Comando> ', line => { // Muestra el prompt y espera la entrada del usuario
    const [cmd, ...args] = line.trim().split(' '); // Divide la entrada en comando y argumentos
    const filename = args.join(' ').trim(); // Obtiene el nombre del archivo (si hay)

    if (cmd.toUpperCase() === 'SALIR') { // Si el comando es SALIR
      console.log('[CLIENT] Saliendo de la aplicación.'); // Imprime mensaje de salida
      return rl.close(); // Cierra la interfaz de línea de comandos y termina
    }

    const socket = tls.connect(PORT, HOST, { ca: fs.readFileSync(CA_PATH) }, () => {// Establece una conexión TLS con el servidor
      console.log(`[CLIENT] Conectado a ${HOST}:${PORT}. Enviando: ${line}`); // Imprime la conexión y el comando enviado
      socket.write(`${line}\n`); // Envía el comando al servidor con un salto de línea
    });

    const action = cmd.toUpperCase(); // Convierte el comando a mayúsculas

    // LIST, DELETE, RENAME
    if (['LIST', 'DELETE', 'RENAME'].includes(action)) { // Si el comando es LIST, DELETE o RENAME
      socket.on('data', d => console.log(`[CLIENT][RESPONSE] ${d.toString().trim()}`)); // Imprime la respuesta del servidor
      socket.on('end', () => prompt()); // Vuelve al prompt después de recibir la respuesta
    }

    // GET
    else if (action === 'GET') { // Si el comando es GET
      const outPath = path.join(__dirname, 'downloads', filename); // Ruta donde se guardará el archivo descargado
      console.log(`[CLIENT][GET] Descargando: ${filename} → ${outPath}`); // Imprime la ruta de descarga
      const ws = fs.createWriteStream(outPath); // Crea un stream de escritura para el archivo
      socket.pipe(ws); // Conecta el socket al stream de escritura para recibir el archivo
      ws.on('finish', () => { // Cuando termina la descarga
        console.log('[CLIENT][GET] Descarga completa'); // Imprime mensaje de éxito
        prompt(); // Vuelve al prompt
      });
      ws.on('error', e => { // Si hay un error en la descarga
        console.error(`[CLIENT][GET][ERROR] ${e.message}`); // Imprime el error
        prompt(); // Vuelve al prompt
      });
    }

    // PUT 
    else if (action === 'PUT') { // Si el comando es PUT
      const srcPath = path.join(__dirname, 'uploads', filename); // Ruta del archivo a subir
      fs.access(srcPath, fs.constants.F_OK, err => { // Verifica si el archivo existe
        if (err) { // Si el archivo no existe
          console.error(`[CLIENT][PUT][ERROR] Archivo no encontrado: ${filename}`); // Imprime error
          socket.end(); // Cierra el socket
          return prompt(); // Vuelve al prompt
        }

        let responded = false; // Variable para controlar si ya se recibió respuesta del servidor

        // Esperar READY: PUT
        socket.once('data', data => { // Escucha una vez el evento 'data' para recibir el mensaje de preparación del servidor
          const msg = data.toString().trim(); // Convierte la respuesta a string y quita espacios

          if (msg !== 'READY: PUT') { // Si no recibe el mensaje esperado
            console.error(`[CLIENT][PUT][ERROR] Esperaba 'READY: PUT', recibí: ${msg}`); // Imprime error
            socket.end(); // Cierra el socket
            return prompt(); // Vuelve al prompt
          }

          console.log('[CLIENT][PUT] Servidor listo. Enviando archivo...'); // Imprime mensaje de que el servidor está listo
          const fileStream = fs.createReadStream(srcPath); // Crea un stream de lectura para el archivo

          fileStream.pipe(socket, { end: false }); // Conecta el stream de lectura al socket, no cierra el socket al terminar de leer
          fileStream.on('end', () => { // Cuando termina de leer el archivo
            console.log('[CLIENT][PUT] Archivo enviado, cerrando escritura...'); // Imprime mensaje
            socket.end(); // half-close: Cierra la escritura del socket (envía FIN), pero permite seguir leyendo la respuesta
          });

          fileStream.on('error', e => { // Si hay un error al leer el archivo
            console.error(`[CLIENT][PUT][ERROR] Lectura: ${e.message}`); // Imprime error
            socket.end(); // Cierra el socket
            prompt(); // Vuelve al prompt
          });

          // ACK "acuse de recibo" (acknowledgement) del servidor
          socket.on('data', resp => { // Escucha el evento 'data' para recibir la respuesta del servidor (ACK)
            if (responded) return; // Si ya se respondió, no hace nada (para evitar respuestas duplicadas)
            responded = true; // Marca que ya se recibió respuesta
            console.log(`[CLIENT][PUT] Respuesta: ${resp.toString().trim()}`); // Imprime la respuesta del servidor
            prompt(); // Vuelve al prompt
          });

          // fallback por si el servidor cierra sin ACK
          socket.on('end', () => { // Si el servidor cierra la conexión sin enviar el ACK
            if (!responded) { // Si no se ha recibido respuesta
              console.warn('[CLIENT][PUT] Servidor cerró sin ACK. Retornando al prompt.'); // Imprime advertencia
              responded = true; // Marca como respondido
              prompt(); // Vuelve al prompt
            }
          });
        });
      });
    }

    // Comando inválido
    else {
      console.error(`[CLIENT][ERROR] Comando inválido: ${cmd}`); // Imprime error de comando inválido
      socket.end(); // Cierra el socket
      prompt(); // Vuelve al prompt
    }

    socket.on('error', err => { // Maneja errores de la conexión TLS
      console.error(`[CLIENT][ERROR] TLS: ${err.message}`); // Imprime el error de TLS
      prompt(); // Vuelve al prompt
    });
  });
}

console.log('Comandos: LIST, GET <file>, PUT <file>, DELETE <file>, RENAME <old> <new>, SALIR'); // Imprime la lista de comandos disponibles
prompt(); // Inicia el prompt para que el usuario ingrese comandos
