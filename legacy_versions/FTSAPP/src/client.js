// client.js
// Este archivo constituye la base del cliente para el proyecto FTSApp.
// El cliente se conectará al servidor para recibir el mensaje de bienvenida.

// Importamos el módulo 'net' para poder trabajar con sockets TCP.
const net = require('net');

// Definimos el puerto y la dirección del servidor al que nos conectaremos.
// Estas constantes deben coincidir con las definidas en el servidor.
const PORT = 5000;
const HOST = 'localhost';

// Creamos un nuevo socket para el cliente usando el constructor net.Socket().
const client = new net.Socket();

// Conectamos al servidor FTSApp utilizando client.connect().
// El primer argumento es el puerto y el segundo es la dirección del servidor.
client.connect(PORT, HOST, () => {
    console.log('Conectado al servidor FTSApp en Node.js');
});

// Escuchamos el evento 'data' del cliente, que se dispara cuando se reciben datos del servidor.
client.on('data', (data) => {
    // data es un Buffer; usamos toString() para convertirlo en una cadena legible.
    console.log('Mensaje recibido del servidor:', data.toString());
    // Una vez recibidos los datos, cerramos la conexión con client.destroy().
    client.destroy();
});

// Manejamos el evento 'error' para capturar y mostrar cualquier error en la conexión.
client.on('error', (err) => {
    console.error('Error en la conexión:', err.message);
});
