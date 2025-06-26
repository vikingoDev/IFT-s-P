// public/main.js
// Este script maneja la lógica del lado del cliente (frontend) para interactuar
// con la API de archivos expuesta por web-server.js.

// --- Obtención de Elementos del DOM ---
// Referencia al cuerpo (tbody) de la tabla donde se listarán los archivos.
const fileTableBody = document.getElementById('fileTableBody');
// Referencia al formulario de subida de archivos.
const uploadForm = document.getElementById('uploadForm');
// Referencia al input de tipo 'file' donde el usuario selecciona el archivo a subir.
const fileInput = document.getElementById('fileInput');

// --- 1) Función para Cargar y Mostrar la Lista de Archivos ---
// Esta función asíncrona obtiene la lista de archivos del servidor y actualiza la tabla en el HTML.
async function loadFiles() {
  fileTableBody.innerHTML = ''; // Limpia el contenido actual de la tabla antes de cargar los nuevos datos.
  try {
    // Realiza una petición GET a la API para obtener la lista de archivos.
    // Por defecto, fetch realiza una petición GET.
    const res = await fetch('/api/files');
    // Parsea la respuesta del servidor (que se espera sea JSON) a un objeto JavaScript.
    const data = await res.json();

    // Verifica si la lista de archivos está vacía.
    if (data.files && data.files.length === 0) {
      // Si no hay archivos, muestra un mensaje en la tabla.
      fileTableBody.innerHTML = '<tr><td colspan="2">No hay archivos en el servidor</td></tr>';
    } else if (data.files) {
      // Si hay archivos, itera sobre la lista y llama a 'addFileRow' por cada nombre de archivo
      // para crear una fila en la tabla.
      data.files.forEach(name => addFileRow(name));
    } else {
      // Si la respuesta no tiene el formato esperado (ej. data.files no existe)
      fileTableBody.innerHTML = '<tr><td colspan="2">Respuesta inesperada del servidor</td></tr>';
      console.error('Respuesta inesperada del servidor:', data);
    }
  } catch (e) {
    // Si ocurre un error durante la petición fetch (ej. problema de red, servidor no responde),
    // muestra una alerta al usuario y un mensaje en la tabla.
    console.error('Error al cargar archivos:', e);
    fileTableBody.innerHTML = '<tr><td colspan="2">Error al cargar archivos. Intente de nuevo.</td></tr>';
    alert('Error al cargar archivos. Verifique la consola para más detalles.');
  }
}

// --- 2) Función para Agregar una Fila de Archivo a la Tabla ---
// Esta función crea una nueva fila (<tr>) en la tabla para un archivo dado,
// incluyendo su nombre y botones de acción (Descargar, Renombrar, Eliminar).
function addFileRow(filename) {
  const tr = document.createElement('tr'); // Crea un nuevo elemento <tr>.
  // Establece el contenido HTML de la fila.
  // Incluye el nombre del archivo y botones con llamadas a funciones JavaScript
  // (downloadFile, renameFile, deleteFile) cuando se hace clic en ellos.
  tr.innerHTML = `
    <td>${filename}</td>
    <td>
      <button onclick="downloadFile('${filename}')">Descargar</button>
      <button onclick="renameFile('${filename}')">Renombrar</button>
      <button onclick="deleteFile('${filename}')">Eliminar</button>
    </td>
  `;
  fileTableBody.appendChild(tr); // Añade la nueva fila al cuerpo de la tabla.
}

// --- 3) Manejador para la Subida de un Nuevo Archivo ---
// Escucha el evento 'submit' del formulario de subida.
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // Previene el comportamiento por defecto del formulario (que recargaría la página).

  // Verifica si se seleccionó un archivo.
  if (fileInput.files.length === 0) {
    alert('Por favor, seleccione un archivo para subir.');
    return;
  }

  // Crea un objeto FormData para enviar los datos del archivo.
  // FormData es necesario para enviar archivos (multipart/form-data).
  const formData = new FormData();
  formData.append('file', fileInput.files[0]); // Añade el archivo seleccionado al FormData.
                                               // El nombre 'file' debe coincidir con el esperado por Multer en el backend.

  try {
    // Realiza una petición POST a la API para subir el archivo.
    const res = await fetch('/api/files', {
      method: 'POST',
      body: formData // El cuerpo de la petición es el objeto FormData.
                     // 'Content-Type' se establece automáticamente por el navegador cuando se usa FormData.
    });

    if (!res.ok) { // Si la respuesta del servidor no es exitosa (ej. status 400, 500)
      const errorData = await res.json(); // Intenta leer el cuerpo del error como JSON
      throw new Error(errorData.error || `Error del servidor: ${res.status}`);
    }

    fileInput.value = ''; // Limpia el campo de selección de archivo después de una subida exitosa.
    loadFiles(); // Recarga la lista de archivos para mostrar el archivo recién subido.
    alert('Archivo subido exitosamente.');
  } catch (err) {
    //console.error('Error al subir el archivo:', err);
    //alert(`Error al subir el archivo: ${err.message}`);
  }
});

// --- 4) Función para Descargar un Archivo ---
// Inicia la descarga de un archivo abriendo la URL de la API de descarga en una nueva pestaña/ventana.
// El navegador manejará la descarga basándose en la cabecera 'Content-Disposition' enviada por el servidor.
function downloadFile(name) {
  // Construye la URL y la abre. El servidor (web-server.js) se encargará de enviar el archivo.
  window.open(`/api/files/${name}`);
}

// --- 5) Función para Eliminar un Archivo ---
// Esta función asíncrona maneja la eliminación de un archivo.
async function deleteFile(name) {
  // Pide confirmación al usuario antes de eliminar el archivo.
  if (!confirm(`¿Está seguro de que desea eliminar el archivo "${name}"?`)) {
    return; // Si el usuario cancela, no hace nada.
  }

  try {
    // Realiza una petición DELETE a la API para eliminar el archivo especificado.
    const res = await fetch(`/api/files/${name}`, { method: 'DELETE' });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `Error del servidor: ${res.status}`);
    }

    loadFiles(); // Recarga la lista de archivos para reflejar la eliminación.
    alert(`Archivo "${name}" eliminado exitosamente.`);
  } catch (err) {
    console.error('Error al eliminar el archivo:', err);
    alert(`Error al eliminar el archivo: ${err.message}`);
  }
}

// --- 6) Función para Renombrar un Archivo ---
// Esta función asíncrona maneja el renombramiento de un archivo.
async function renameFile(oldName) {
  // Pide al usuario que ingrese el nuevo nombre para el archivo.
  const newName = prompt(`Ingrese el nuevo nombre para el archivo "${oldName}":`, oldName);

  // Si el usuario cancela el prompt o no ingresa un nombre, no hace nada.
  if (!newName || newName.trim() === '') {
    alert('El renombrado fue cancelado o el nombre está vacío.');
    return;
  }
  if (newName === oldName) {
    alert('El nuevo nombre es igual al anterior. No se realizaron cambios.');
    return;
  }

  try {
    // Realiza una petición PUT a la API para renombrar el archivo.
    const res = await fetch(`/api/files/${oldName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json' // Indica que el cuerpo de la petición es JSON.
      },
      // Envía el nuevo nombre en el cuerpo de la petición, como un objeto JSON.
      body: JSON.stringify({ newName: newName.trim() })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || `Error del servidor: ${res.status}`);
    }

    loadFiles(); // Recarga la lista de archivos para reflejar el cambio de nombre.
    alert(`Archivo "${oldName}" renombrado a "${newName.trim()}" exitosamente.`);
  } catch (err) {
    console.error('Error al renombrar el archivo:', err);
    alert(`Error al renombrar el archivo: ${err.message}`);
  }
}

// --- Ejecución Inicial ---
// Llama a 'loadFiles()' cuando el script se carga por primera vez (y el DOM está listo,
// ya que este script usualmente se incluye al final del <body> o con 'defer').
// Esto asegura que la lista de archivos se muestre tan pronto como la página esté operativa.
loadFiles();
