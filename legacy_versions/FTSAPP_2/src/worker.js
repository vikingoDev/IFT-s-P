// worker.js
// Este archivo se ejecuta como proceso hijo para procesar los mensajes recibidos del servidor.

process.on('message', (message) => {
    console.log(`Worker: Recibido mensaje: ${message}`);
    // Procesa el mensaje: en este ejemplo, se convierte a mayúsculas.
    const processed = message.toUpperCase();
    // Envía la respuesta procesada de vuelta al proceso padre.
    process.send(`Respuesta procesada: ${processed}`);
});
