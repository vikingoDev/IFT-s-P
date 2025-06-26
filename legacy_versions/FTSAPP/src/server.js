// server.js
// Este archivo constituye la base del servidor para el proyecto FTSApp.
// Utilizaremos Node.js y el módulo 'net' para crear un servidor TCP básico que acepte conexiones de clientes
// y envíe un mensaje de bienvenida.

// Importamos el módulo 'net' de Node.js, que nos permite trabajar con sockets TCP.
const net = require('net');

// Definimos el puerto en el que el servidor escuchará las conexiones.
// El puerto 5000 es arbitrario, pero debe ser el mismo en el cliente para establecer la conexión.
const PORT = 5000;

// Creamos el servidor TCP utilizando net.createServer()
// La función callback que se le pasa y se ejecuta cada vez que un cliente se conecta.
const server = net.createServer((socket) => {
    // 'socket' representa la conexión establecida con el cliente.
    // socket.remoteAddress y socket.remotePort contienen la dirección IP y el puerto del cliente que se conecta.
    console.log('Conexión establecida con:', socket.remoteAddress, 'en el puerto', socket.remotePort);
    
    // Enviamos un mensaje de bienvenida al cliente.
    // socket.write() se utiliza para enviar datos a través del socket.
    socket.write('Bienvenido a FTSApp - Servidor en Node.js\n');

    // Después de enviar el mensaje, cerramos la conexión.
    // socket.end() finaliza la conexión, enviando una señal de cierre al cliente.
    socket.end();
});

// Configuramos el servidor para que escuche en el puerto definido (5000).
// La función callback pasada a server.listen() se ejecuta cuando el servidor comienza a escuchar.
server.listen(PORT, () => {
    console.log(`Servidor FTSApp escuchando en http://localhost:${PORT}`);
});
