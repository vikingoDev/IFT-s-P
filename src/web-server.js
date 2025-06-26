// web-server.js (con HTTPS para UI segura)
// -------------------------------------------------------------------
// Servidor Express + HTTPS: sirve la UI web en https://localhost:3000
// usando los mismos certificados TLS del servidor de archivos.
// Esto significa que tanto la comunicación UI <-> WebServer como WebServer <-> FileServer son seguras.
// -------------------------------------------------------------------

// --- Importación de Módulos ---
const express = require('express'); // Framework para construir aplicaciones web y APIs en Node.js.
const cors = require('cors'); // Middleware para habilitar CORS (Cross-Origin Resource Sharing), permitiendo peticiones desde diferentes dominios/puertos.
const multer = require('multer'); // Middleware para manejar la subida de archivos (multipart/form-data).
const fs = require('fs'); // Módulo File System de Node.js, para interactuar con el sistema de archivos.
const path = require('path'); // Módulo Path de Node.js, para trabajar con rutas de archivos y directorios.
const https = require('https'); // Módulo HTTPS de Node.js, para crear servidores HTTPS.
const tlsClient = require('./tls-client'); // Importa nuestro módulo cliente TLS personalizado que interactúa con el servidor de archivos seguro.

// --- Inicialización de Express ---
const app = express(); // Crea una instancia de la aplicación Express.
const PORT = 3000; // Define el puerto en el que el servidor web HTTPS escuchará las peticiones de la UI.

// --- Configuración de Certificados para HTTPS ---
// Rutas a los archivos de certificado y clave privada del servidor.
// Son los mismos que usa el secure-server.js, lo que simplifica la gestión de certificados.
const certPath = path.join(__dirname, 'certs', 'server-cert.pem'); // Ruta al archivo del certificado del servidor.
const keyPath = path.join(__dirname, 'certs', 'server-key.pem'); // Ruta al archivo de la clave privada del servidor.

// Opciones para el servidor HTTPS, especificando la clave y el certificado.
const httpsOptions = {
  key: fs.readFileSync(keyPath),   // Lee sincrónicamente el contenido de la clave privada.
  cert: fs.readFileSync(certPath), // Lee sincrónicamente el contenido del certificado.
};

// --- Configuración de Middlewares de Express ---
// Sirve archivos estáticos (HTML, CSS, JS del frontend) desde el directorio '../public'.
// '__dirname' es el directorio actual del script (donde está web-server.js).
app.use(express.static(path.join(__dirname, '../public')));

// Habilita CORS para todas las rutas. Permite que la UI (posiblemente en un origen diferente durante el desarrollo) haga peticiones.
app.use(cors());

// Parsea las solicitudes entrantes con payloads JSON (ej: en peticiones POST o PUT).
// Hace que 'req.body' esté disponible con los datos JSON parseados.
app.use(express.json());

// Configuración de Multer para la subida de archivos.
// 'dest' especifica el directorio donde Multer guardará temporalmente los archivos subidos.
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// --- Definición de Rutas de la API ---

// Endpoint para obtener la lista de archivos del servidor de archivos seguro.
// Método: GET, Ruta: /api/files
app.get('/api/files', async (req, res) => {
  try {
    // Utiliza el 'tlsClient' para enviar el comando 'LIST' al servidor de archivos seguro.
    const response = await tlsClient.sendCommand('LIST');
    // El servidor de archivos responde con algo como "OK: FILES archivo1.txt,archivo2.txt".
    // Se limpia la respuesta para obtener solo la lista de nombres de archivo.
    const listRaw = response.replace('OK: FILES', '').trim();
    // Convierte la cadena de nombres de archivo separados por comas en un array.
    // Si 'listRaw' está vacío (no hay archivos), se devuelve un array vacío.
    const list = listRaw ? listRaw.split(',') : [];
    // Envía la lista de archivos como una respuesta JSON a la UI.
    res.json({ files: list });
  } catch (e) {
    // Si ocurre un error (ej: el servidor de archivos no responde), envía un estado 500 (Error Interno del Servidor).
    console.error('Error en GET /api/files:', e.message);
    res.status(500).json({ error: 'Error al obtener lista de archivos.' });
  }
});

// Endpoint para descargar un archivo específico.
// Método: GET, Ruta: /api/files/:filename (ej: /api/files/miarchivo.txt)
app.get('/api/files/:filename', async (req, res) => {
  const filename = req.params.filename; // Obtiene el nombre del archivo de los parámetros de la ruta.
  try {
    // Utiliza 'tlsClient' para obtener el contenido del archivo del servidor de archivos seguro.
    // 'fileBuffer' será un Buffer con los datos binarios del archivo.
    const fileBuffer = await tlsClient.getFile(filename);

    // Establece la cabecera 'Content-Disposition' para indicar al navegador que debe descargar el archivo
    // en lugar de intentar mostrarlo, y sugiere el nombre original del archivo.
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Envía el Buffer del archivo como respuesta. El navegador lo interpretará como una descarga.
    res.send(fileBuffer);
  } catch (e) {
    console.error(`Error en GET /api/files/${filename}:`, e.message);
    res.status(500).json({ error: 'Error al descargar archivo.' });
  }
});

// Endpoint para eliminar un archivo.
// Método: DELETE, Ruta: /api/files/:filename
app.delete('/api/files/:filename', async (req, res) => {
  const filename = req.params.filename; // Nombre del archivo a eliminar.
  try {
    // Envía el comando 'DELETE nombre_archivo' al servidor de archivos.
    await tlsClient.sendCommand(`DELETE ${filename}`);
    // Responde con un JSON indicando éxito.
    res.json({ status: 'Archivo eliminado' });
  } catch (e) {
    console.error(`Error en DELETE /api/files/${filename}:`, e.message);
    res.status(500).json({ error: 'Error al eliminar archivo.' });
  }
});

// Endpoint para renombrar un archivo.
// Método: PUT, Ruta: /api/files/:oldName
app.put('/api/files/:oldName', async (req, res) => {
  const oldName = req.params.oldName; // Nombre actual del archivo.
  const newName = req.body.newName;   // Nuevo nombre del archivo, enviado en el cuerpo (body) de la petición JSON.
  try {
    // Envía el comando 'RENAME nombre_viejo nombre_nuevo' al servidor de archivos.
    await tlsClient.sendCommand(`RENAME ${oldName} ${newName}`);
    res.json({ status: 'Archivo renombrado' });
  } catch (e) {
    console.error(`Error en PUT /api/files/${oldName}:`, e.message);
    res.status(500).json({ error: 'Error al renombrar archivo.' });
  }
});

// Endpoint para subir un archivo.
// Método: POST, Ruta: /api/files
// 'upload.single('file')' es un middleware de Multer que procesa un único archivo
// subido en un campo de formulario llamado 'file'.
// El archivo se guarda temporalmente en el directorio 'uploads' (configurado en Multer).
// La información del archivo temporal está disponible en 'req.file'.
app.post('/api/files', upload.single('file'), async (req, res) => {
  // 'req.file' contiene información sobre el archivo subido por Multer:
  //   req.file.path: La ruta completa al archivo temporal guardado por Multer.
  //   req.file.originalname: El nombre original del archivo en la máquina del cliente.
  if (!req.file) { // Verifica si se subió un archivo.
      return res.status(400).json({ error: 'No se subió ningún archivo.' });
  }
  const tempPath = req.file.path;
  const originalName = req.file.originalname;

  try {
    // Utiliza 'tlsClient.putFile' para enviar el archivo temporal al servidor de archivos seguro.
    // Se le pasa la ruta del archivo temporal y el nombre original que debe tener en el servidor.
    await tlsClient.putFile(tempPath, originalName);
    res.json({ status: 'Archivo subido' });
  } catch (e) {
    //console.error('Error en POST /api/files (subida):', e.message);
    //res.status(500).json({ error: 'Error al subir archivo.' });
  } finally {
    // El bloque 'finally' se ejecuta siempre, tanto si la subida fue exitosa como si falló.
    // Es crucial eliminar el archivo temporal que Multer guardó en el directorio 'uploads'.
    // 'fs.unlink' elimina el archivo. El callback vacío `() => {}` ignora errores al borrar (fire and forget).
    // La responsabilidad de borrar el temporal en `tlsClient.putFile` es si `tlsClient` mismo crea un temporal,
    // aquí, el temporal es creado por Multer en `web-server.js`.
    fs.unlink(tempPath, (err) => {
        if (err) console.error("Error al eliminar archivo temporal de 'uploads':", tempPath, err.message);
    });
  }
});

// --- Creación e Inicio del Servidor HTTPS ---
// Crea un servidor HTTPS usando las opciones (clave y certificado) y la aplicación Express.
https.createServer(httpsOptions, app)
  .listen(PORT, () => { // Inicia el servidor y lo pone a escuchar en el puerto especificado.
    // Muestra un mensaje en la consola indicando que el servidor está listo y dónde acceder a él.
    console.log(`🔐 UI web segura disponible en https://localhost:${PORT}`);
  });