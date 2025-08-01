// secure-server.js
// -------------------------------------------------------------------
// Servidor TLS: LIST, GET, PUT, DELETE, RENAME
// -------------------------------------------------------------------

const tls = require('tls'); // Módulo para Transport Layer Security (conexiones seguras)
const fs = require('fs'); // Módulo para el sistema de archivos (leer, escribir, etc.)
const path = require('path'); // Módulo para trabajar con rutas de archivos

const PORT = 6000; // Puerto en el que el servidor escuchará
const CERT_PATH = path.join(__dirname, 'certs', 'server-cert.pem'); // Ruta al certificado del servidor
const KEY_PATH = path.join(__dirname, 'certs', 'server-key.pem'); // Ruta a la clave privada del servidor
const ROOT_DIR = path.join(__dirname, 'files'); // Directorio raíz para los archivos del servidor

const options = {
  cert: fs.readFileSync(CERT_PATH), // Lee el certificado del servidor
  key: fs.readFileSync(KEY_PATH), // Lee la clave privada del servidor
};

const server = tls.createServer(options, socket => { // Se ejecuta cuando un cliente se conecta al servidor
  console.log(`[SERVER] Nueva conexión desde ${socket.remoteAddress}`); // Imprime la dirección del cliente

  let buffer = ''; // Buffer para almacenar los datos recibidos del cliente

  socket.on('error', err => { // Maneja errores de socket
    console.error(`[SERVER][ERROR] Socket: ${err.message}`); // Imprime el error
    socket.destroy(); // Cierra el socket
  });

  socket.on('data', chunk => { // Se ejecuta cuando el servidor recibe datos del cliente
    buffer += chunk.toString(); // Convierte el chunk a string y lo añade al buffer
    if (!buffer.includes('\n')) return; // Si no hay salto de línea, el comando no está completo, regresa

    const [line, ...rest] = buffer.split('\n'); // Divide el buffer por saltos de línea
    buffer = rest.join('\n'); // El resto del buffer se guarda para la próxima lectura
    const [cmd, ...args] = line.trim().split(' '); // Divide la línea en comando y argumentos
    const filename = args.join(' '); // Une los argumentos para obtener el nombre del archivo

    console.log(`[SERVER] Comando recibido: ${cmd.toUpperCase()} ${filename}`); // Imprime el comando

    try { // Manejo de errores general para los comandos
      switch (cmd.toUpperCase()) { // Convierte el comando a mayúsculas para que sea insensible a mayúsculas y minúsculas

        case 'LIST': // Lista los archivos en el directorio del servidor
          fs.readdir(ROOT_DIR, (err, files) => { // Lee el directorio de forma asíncrona
            if (err) { // Si hay un error
              console.error(`[SERVER][LIST][ERROR] ${err.message}`); // Imprime el error
              socket.write('ERROR: LIST failed\n'); // Envía un mensaje de error al cliente
            } else { // Si no hay error
              console.log('[SERVER][LIST] Enviando lista de archivos'); // Imprime un mensaje
              socket.write(`OK: FILES ${files.join(',')}\n`); // Envía la lista de archivos separados por comas
            }
            socket.end(); // Cierra la conexión después de enviar la respuesta
          });
          break;

        case 'GET': { // Obtiene un archivo del servidor
          const src = path.join(ROOT_DIR, filename); // Ruta completa del archivo
          fs.stat(src, (err, st) => { // Obtiene información del archivo
            if (err || !st.isFile()) { // Si hay un error o no es un archivo
              console.error(`[SERVER][GET][ERROR] ${err ? err.message : 'No es archivo válido'}`); // Imprime el error
              socket.end('ERROR: GET failed\n'); // Envía mensaje de error
              return; // Termina la ejecución del comando
            }
            console.log(`[SERVER][GET] Enviando archivo: ${filename}`); // Imprime mensaje
            fs.createReadStream(src)
              .on('error', e => { // Maneja errores al leer el archivo
                console.error(`[SERVER][GET][READ ERROR] ${e.message}`);
                socket.end('ERROR: GET failed\n');
              })
              .pipe(socket); // Envía el archivo al cliente usando un stream
          });
          break;
        }

        case 'PUT': { // Recibe un archivo del cliente
          const dest = path.join(ROOT_DIR, filename); // Ruta de destino para guardar el archivo
          console.log(`[SERVER][PUT] Preparado para recibir archivo: ${filename}`); // Imprime mensaje

          socket.write('READY: PUT\n'); // Envía mensaje al cliente indicando que está listo para recibir el archivo
          socket.removeAllListeners('data'); // Remueve los listeners de 'data' anteriores para evitar interferencia

          const ws = fs.createWriteStream(dest); // Crea un stream de escritura para guardar el archivo
          ws.on('open', () => console.log('[SERVER][PUT] Stream de escritura abierto')); // Imprime cuando se abre el stream de escritura
          ws.on('error', e => { // Maneja errores al escribir el archivo
            console.error(`[SERVER][PUT][WRITE ERROR] ${e.message}`);
            socket.write('ERROR: PUT failed\n', () => socket.end()); // Envía error y cierra
          });
          ws.on('finish', () => { // Cuando termina de escribir el archivo
            console.log('[SERVER][PUT] Escritura finalizada — enviando ACK'); // Imprime mensaje
            socket.write('OK: PUT complete\n'); // Envía ACK (acknowledgment) al cliente

            // Esperamos unos ms para asegurar que el mensaje se transmita
            setTimeout(() => {
              console.log('[SERVER][PUT] Cierre seguro tras ACK'); // Imprime mensaje
              socket.end(); // Cierra el socket después de enviar el ACK
            }, 50); // Espera mínima para asegurar ACK
          });

          socket.pipe(ws); // Recibe los datos del cliente y los escribe en el archivo
          break;
        }

        case 'DELETE': // Elimina un archivo del servidor
          fs.unlink(path.join(ROOT_DIR, filename), err => { // Elimina el archivo de forma asíncrona
            if (err) { // Si hay un error
              console.error(`[SERVER][DELETE][ERROR] ${err.message}`); // Imprime error
              socket.end('ERROR: DELETE failed\n'); // Envía mensaje de error
            } else { // Si no hay error
              console.log(`[SERVER][DELETE] Archivo eliminado: ${filename}`); // Imprime mensaje
              socket.end('OK: DELETE complete\n'); // Envía mensaje de éxito
            }
          });
          break;

        case 'RENAME': { // Renombra un archivo en el servidor
          const [oldName, newName] = args; // Obtiene el nombre antiguo y el nuevo
          fs.rename(
            path.join(ROOT_DIR, oldName), // Ruta del archivo antiguo
            path.join(ROOT_DIR, newName), // Ruta del archivo nuevo
            err => { // Renombra el archivo de forma asíncrona
              if (err) { // Si hay un error
                console.error(`[SERVER][RENAME][ERROR] ${err.message}`); // Imprime error
                socket.end('ERROR: RENAME failed\n'); // Envía mensaje de error
              } else { // Si no hay error
                console.log(`[SERVER][RENAME] ${oldName} → ${newName}`); // Imprime mensaje
                socket.end('OK: RENAME complete\n'); // Envía mensaje de éxito
              }
            }
          );
          break;
        }

        default: // Comando desconocido
          console.warn(`[SERVER][UNKNOWN] Comando no reconocido: ${cmd}`); // Imprime advertencia
          socket.end('ERROR: Unknown command\n'); // Envía mensaje de error
      }
    } catch (e) { // Captura errores generales dentro del bloque try
      console.error(`[SERVER][EXCEPTION] ${e.message}`); // Imprime la excepción
      socket.end('ERROR: Server exception\n'); // Envía mensaje de error genérico
    }
  });
});

server.listen(PORT, () => { // Inicia el servidor y escucha en el puerto especificado
  console.log(`[SERVER] Servidor TLS escuchando en puerto ${PORT}`); // Imprime mensaje
});



