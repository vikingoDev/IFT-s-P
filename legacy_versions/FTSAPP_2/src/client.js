// client.js
// Cliente TCP interactivo para el proyecto FTSApp.
// Permite enviar múltiples mensajes al servidor a través de la consola.

// Importamos el módulo 'net' para crear sockets TCP.
const net = require('net');

// Importamos 'readline' para poder leer desde la entrada estándar (teclado).
const readline = require('readline');

// Creamos una instancia de socket del lado del cliente.
const client = new net.Socket();

// Creamos una interfaz de lectura desde el teclado usando readline.
// Esto permite que el usuario escriba comandos en la terminal.
const rl = readline.createInterface({
    input: process.stdin,   // Entrada estándar (teclado)
    output: process.stdout  // Salida estándar (consola)
});

// Nos conectamos al servidor en el puerto 5000 y la dirección 'localhost'.
client.connect(5000, 'localhost', () => {
    console.log('✅ Conectado al servidor FTSApp.');
    preguntar(); // Llamamos a la función que pide entrada al usuario
});

// Escuchamos el evento 'data', que se activa cuando el servidor nos envía algo.
client.on('data', (data) => {
    // Mostramos la respuesta del servidor en consola.
    console.log(`📨 Servidor: ${data}`);
    // Volvemos a preguntar al usuario por el próximo mensaje.
    preguntar();
});

// Escuchamos el evento 'close', que se dispara cuando el servidor cierra la conexión.
client.on('close', () => {
    console.log('🔒 Conexión cerrada por el servidor.');
    rl.close(); // Cerramos también la interfaz de entrada de usuario
});

// Escuchamos el evento 'error' para manejar errores de conexión o ejecución.
client.on('error', (err) => {
    console.error('❌ Error en el cliente:', err.message);
    rl.close(); // Cerramos la interfaz para evitar que quede bloqueada
});

// Función personalizada que pregunta al usuario qué mensaje quiere enviar.
function preguntar() {
    rl.question('✏️ Mensaje para enviar al servidor (escribí "salir" para terminar): ', (input) => {
        // Si el usuario escribe 'salir', cerramos la conexión y terminamos.
        if (input.toLowerCase() === 'salir') {
            client.end();    // Finalizamos la conexión con el servidor
            rl.close();      // Cerramos la interfaz readline
        } else {
            client.write(input); // Enviamos el mensaje al servidor
        }
    });
}

