// Script alternativo para nodemon que não depende de cmd.exe
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let serverProcess = null;
let watchTimeout = null;

function startServer() {
  if (serverProcess) {
    console.log('🔄 Reiniciando servidor...');
    serverProcess.kill();
  }

  console.log('🚀 Iniciando servidor...');
  const isWindows = process.platform === 'win32';
  serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: isWindows,
    cwd: __dirname
  });

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.log(`\n⚠️ Servidor encerrado com código ${code}`);
    }
  });
}

function watchFiles() {
  const filesToWatch = [
    'server.js',
    'routes',
    'middleware',
    'utils'
  ];

  filesToWatch.forEach(item => {
    const fullPath = path.join(__dirname, item);
    
    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) {
        // Watch directory
        fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
          if (filename && !filename.includes('node_modules')) {
            console.log(`\n📝 Arquivo alterado: ${filename}`);
            clearTimeout(watchTimeout);
            watchTimeout = setTimeout(() => {
              startServer();
            }, 500);
          }
        });
      } else {
        // Watch file
        fs.watchFile(fullPath, () => {
          console.log(`\n📝 Arquivo alterado: ${item}`);
          clearTimeout(watchTimeout);
          watchTimeout = setTimeout(() => {
            startServer();
          }, 500);
        });
      }
    }
  });
}

// Iniciar
startServer();
watchFiles();

console.log('👀 Observando mudanças nos arquivos...');
console.log('Pressione Ctrl+C para parar\n');

// Cleanup on exit
process.on('SIGINT', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit();
});

