import './install.css';

const installIcon = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></svg>';
const installedIcon = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';

/** Native installation when supported; a visible, accessible guide everywhere else. */
export function setupInstallation(button) {
  if (!button) return () => {};
  const displayMode = window.matchMedia('(display-mode: standalone)');
  const appleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const androidDevice = /Android/.test(navigator.userAgent);
  const dialog = document.createElement('dialog');
  dialog.className = 'install-dialog';
  dialog.setAttribute('aria-labelledby', 'install-title');
  dialog.setAttribute('aria-describedby', 'install-description');
  dialog.innerHTML = `
    <div class="install-dialog-heading"><span class="install-dialog-symbol">${installIcon}</span><form method="dialog"><button class="icon-button" type="submit" aria-label="Cerrar ayuda de instalación" autofocus><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></form></div>
    <h2 id="install-title">Llévala contigo</h2>
    <p id="install-description">Añade Urgencias a tu pantalla de inicio para abrirla como una aplicación.</p>
    <p class="install-prompt-status" role="status" hidden></p>
    <div class="install-platforms">
      <details ${appleDevice ? 'open' : ''}><summary>iPhone y iPad · Safari</summary><ol><li>Abre esta página en <strong>Safari</strong>.</li><li>Abre el menú de la página y pulsa <strong>Compartir</strong>.</li><li>Elige <strong>Añadir a pantalla de inicio</strong>. Si aparece <strong>Abrir como app</strong>, actívalo.</li><li>Pulsa <strong>Añadir</strong> y abre Urgencias desde su icono.</li></ol></details>
      <details ${androidDevice ? 'open' : ''}><summary>Android · Chrome</summary><ol><li>Abre esta página en <strong>Chrome</strong>.</li><li>Abre el menú <strong>⋮</strong> y busca <strong>Instalar app</strong>, <strong>Instalar y crear acceso directo</strong> o <strong>Añadir a pantalla de inicio</strong>, según la versión.</li><li>Confirma la instalación y abre Urgencias desde su icono.</li></ol></details>
      <details ${!appleDevice && !androidDevice ? 'open' : ''}><summary>Ordenador · Chrome, Edge o Safari</summary><p>En Chrome y Edge, busca el icono de instalación en la barra de direcciones o la opción <strong>Instalar</strong> del menú. En Chrome también puede estar en <strong>Enviar, guardar y compartir → Instalar página como aplicación</strong>. En Safari para Mac, usa <strong>Archivo → Añadir al Dock</strong> si está disponible.</p></details>
    </div>
    <section class="install-offline-guide" aria-labelledby="install-offline-title"><h3 id="install-offline-title">Prepara también tu biblioteca sin conexión</h3><ol><li>Primero instala y abre la app desde su icono.</li><li>Desde la app instalada, importa tu archivo personal <strong>Biblioteca.urgencias</strong> y espera a que termine de guardarse.</li><li>Pulsa <strong>Preparar uso sin conexión</strong> y espera al estado <strong>Lista para usar sin conexión</strong>.</li></ol><p>La app guarda en este dispositivo el buscador y los PDF cifrados. Podrás desbloquearla con tu contraseña sin Internet. El libro se incorpora desde tu archivo personal.</p><p>Haz la importación desde la app instalada para que la biblioteca quede guardada en ella. Conserva una copia del archivo: si borras los datos de la app o el navegador libera su almacenamiento, tendrás que importarlo de nuevo.</p></section>
    <form method="dialog" class="install-dialog-actions"><button class="button button-primary" type="submit">Entendido</button></form>`;
  document.body.append(dialog);

  let promptEvent;
  let installedFromEvent = false;
  let returnFocus;
  let disposed = false;
  const isInstalled = () => installedFromEvent || displayMode.matches || navigator.standalone === true;
  const updateState = () => {
    const installed = isInstalled();
    button.hidden = false;
    button.innerHTML = `${installed ? installedIcon : installIcon}<span>${installed ? 'App instalada' : 'Instalar app'}</span>`;
    button.setAttribute('aria-label', installed ? 'App instalada. Ver ayuda de uso sin conexión' : 'Instalar Urgencias en este dispositivo');
    button.setAttribute('aria-controls', 'install-help');
    button.setAttribute('aria-haspopup', 'dialog');
    dialog.querySelector('#install-title').textContent = installed ? 'Tu app, también sin conexión' : 'Llévala contigo';
    dialog.querySelector('#install-description').textContent = installed
      ? 'Ya estás usando Urgencias como aplicación. No necesitas instalarla de nuevo.'
      : 'Añade Urgencias a tu pantalla de inicio para abrirla como una aplicación.';
    dialog.querySelector('.install-platforms').hidden = installed;
  };
  dialog.id = 'install-help';
  const showGuide = (message = '') => {
    updateState();
    const status = dialog.querySelector('.install-prompt-status');
    status.textContent = message;
    status.hidden = !message;
    returnFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
  };
  const beforeInstall = (event) => {
    event.preventDefault();
    promptEvent = event;
    updateState();
  };
  const installed = () => {
    installedFromEvent = true;
    promptEvent = undefined;
    updateState();
  };
  const clickInstall = async () => {
    if (!promptEvent || isInstalled()) { showGuide(); return; }
    const currentPrompt = promptEvent;
    promptEvent = undefined;
    button.disabled = true;
    try {
      const result = await currentPrompt.prompt();
      const choice = result?.outcome ? result : await currentPrompt.userChoice;
      if (!disposed) showGuide(choice?.outcome === 'accepted'
        ? 'Instalación solicitada. Cuando aparezca el icono de Urgencias, ábrelo y prepara tu biblioteca.'
        : 'Puedes instalarla más adelante desde el menú de tu navegador.');
    } catch {
      if (!disposed) showGuide('Puedes completar la instalación desde el menú de tu navegador.');
    } finally {
      if (!disposed) button.disabled = false;
    }
  };
  const closeGuide = () => {
    const target = returnFocus?.isConnected ? returnFocus : button;
    target.focus();
  };
  window.addEventListener('beforeinstallprompt', beforeInstall);
  window.addEventListener('appinstalled', installed);
  displayMode.addEventListener('change', updateState);
  button.addEventListener('click', clickInstall);
  dialog.addEventListener('close', closeGuide);
  updateState();
  return () => {
    disposed = true;
    promptEvent = undefined;
    window.removeEventListener('beforeinstallprompt', beforeInstall);
    window.removeEventListener('appinstalled', installed);
    displayMode.removeEventListener('change', updateState);
    button.removeEventListener('click', clickInstall);
    dialog.removeEventListener('close', closeGuide);
    dialog.remove();
  };
}
