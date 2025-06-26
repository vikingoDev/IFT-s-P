// server.js
// Versión extendida del servidor para FTSApp utilizando el módulo 'child_process'
// para manejar cada conexión de cliente en un proceso hijo independiente.

// Importamos 'fork' desde el módulo 'child_process' para crear procesos hijos.
const { fork } = require('child_process');

// Importamos el módulo 'net' para trabajar con sockets TCP.
const net = require('net');

// Definimos el puerto en el que el servidor escuchará las conexiones.
const PORT = 5000;

// Creamos el servidor TCP utilizando net.createServer().
// Cada vez que un cliente se conecta, se ejecuta el callback que recibe el objeto 'socket'.
const server = net.createServer((socket) => {
    console.log('Cliente conectado:', socket.remoteAddress, socket.remotePort);

    // NUEVO: Creamos un proceso hijo utilizando fork para manejar esta conexión.
    // El proceso hijo ejecutará el archivo 'worker.js'.
    const child = fork('./worker.js');

    // NUEVO: Cuando se reciben datos del cliente, se envían al proceso hijo.
    // El método socket.on('data') se usa para escuchar datos entrantes.
    socket.on('data', (data) => {
        console.log(`Enviando datos al proceso hijo: ${data.toString()}`);
        // Se envía el dato (convertido a cadena) al proceso hijo mediante child.send().
        child.send(data.toString());
    });

    // NUEVO: Escuchamos el evento 'message' del proceso hijo.
    // Cuando el proceso hijo procesa los datos, envía una respuesta que aquí se recibe.
    child.on('message', (message) => {
        console.log(`Respuesta del proceso hijo: ${message}`);
        // La respuesta procesada se envía de vuelta al cliente usando socket.write().
        socket.write(message);
    });

    // Se maneja el evento 'end' que indica que el cliente ha cerrado la conexión.
    socket.on('end', () => {
        console.log('Cliente desconectado:', socket.remoteAddress);
        // NUEVO: Se finaliza el proceso hijo cuando el cliente se desconecta,
        // para liberar recursos y evitar procesos huérfanos.
        child.kill();
    });

    // Se maneja el evento 'error' en caso de que ocurra algún error en la conexión.
    socket.on('error', (err) => {
        console.error('Error en la conexión:', err.message);
    });
});

// Se inicia el servidor para que escuche en el puerto definido (5000).
server.listen(PORT, () => {
    console.log(`Servidor FTSApp (child_process) escuchando en http://localhost:${PORT}`);
});
