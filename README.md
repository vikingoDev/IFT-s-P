# 📘 SFTP

Esta es una aplicación multiplataforma hecha en Node.js con una arquitectura simple de cliente-servidor basada en TCP, una interfaz web segura por HTTPS, integrando TLS y operaciones CRUD, para realizar operaciones seguras de transferencia de archivos entre clientes y servidor.
El objetivo es mostrar el armado progresivo de una herramienta de red con manejo real de archivos, seguridad, validación de errores e interacción multiplataforma.

---

## 🔵 Cómo funciona el sistema?

Está compuesto por tres capas:

### 1. **Servidor de archivos seguro (**``**)**

- Corre sobre TLS (puerto 6000).
- Administra archivos locales en la carpeta `/files`.
- Soporta comandos: `LIST`, `GET`, `PUT`, `DELETE`, `RENAME`.

### 2. **Cliente TLS (**``**)**

- Cliente programático que se conecta al servidor TLS.
- Ejecuta comandos y maneja archivos como buffer.
- Es utilizado por la interfaz web y `secure-client.js`.

### 3. **Servidor web con UI (**``**)**

- Servidor HTTPS (puerto 3000) que sirve el frontend en `/public`.
- Traduce acciones del usuario a comandos TLS contra `secure-server.js` usando `tls-client.js`.
- Usa `express`, `multer`, `cors` y `https`.

### 4. **Frontend (**``**, **``**)**

- Interfaz visual para subir, descargar, eliminar y renombrar archivos.
- Se comunica vía fetch API con `web-server.js`.

---

## 🔵 Instrucciones para ejecutar

### ✅ Requisitos

- Node.js instalado
- Certificados TLS válidos en `certs/`:
  - `server-cert.pem`
  - `server-key.pem`

### ✅ Estructura de carpetas

```
FTSApp/
├── certs/            # Certificados TLS
├── files/            # Archivos del servidor
├── uploads/          # Temporales de Multer
├── downloads/        # Descargas desde CLI
├── legacy_versions/  # Versiones anteriores del proyecto
├── public/           # index.html, style.css, main.js
├── secure-server.js
├── secure-client.js
├── tls-client.js
├── web-server.js
├── .gitignore
└── README.md
```

### ✅ Iniciar el server

```bash
# 1. Iniciar server TLS
node secure-server.js

# 2. Iniciar server web UI
node web-server.js
```

Abrir el navegador en: `https://localhost:3000` (aceptar el certificado si es autofirmado).

Opcional: ejecutar `node secure-client.js` para interactuar desde la terminal.

---

## 🔵 Ejemplos de uso y pruebas ejecutadas

### ✅ Acciones disponibles desde la UI

- **Subir archivo** (formulario web)
- **Descargar archivo** (botón “Descargar”)
- **Eliminar archivo** (botón “Eliminar”)
- **Renombrar archivo** (botón “Renombrar”)

Nota: la función de "Subir archivo" no refreshea automáticamente la vista del sitio, sino que requiere abrir otra instancia para que se visualice correctamente. Se intentó corregir el comportamiento sin éxito y rompiendo todo, por lo que se decidió dejarlo como está.

### ✅ Comandos disponibles en CLI (`secure-client.js`)

```
LIST
GET archivo.txt
PUT archivo.txt
DELETE archivo.txt
RENAME viejo.txt nuevo.txt
SALIR
```

### ✅ Pruebas realizadas

#### 🗒️ estados del proyecto

1. Servidor TCP básico (`client.js` + `worker.js`)
2. Envío de archivo único vía TCP (`file-server.js` y `file-client.js`)
3. Servidor TLS por consola
4. Versión final con UI web segura

#### 🗒️ Pruebas funcionales

- Subida de `.txt`, `.jpg`, `.pdf`, `.zip`, `.exe`
- Renombrado reflejado en la UI
- Descarga inmediata tras GET o botón web
- Eliminación inmediata

#### 🧾 Pruebas de manejo de errores

- Comando `COPY` (inválido) devuelve `ERROR: Unknown command`
- `GET` y `PUT` con archivo inexistente devuelven un error controlado.
- Simulación de archivo con permisos denegados (chmod 000) devuelve un error controlado.
- Interrupción de cliente durante `PUT` no cuelga el servidor (se cierra la conexión sin problema).
- Archivos con nombre inválido (espacios, símbolos) no son bloqueados, pero se cargan correctamente.

---

## 📌 Notas

- Todas las comunicaciones usan TLS/HTTPS.
- Los errores son manejados con respuestas adecuadas.
- El sistema es extensible a múltiples usuarios.

