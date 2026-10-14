// Reúne configurações e elementos da interface usados pelo fluxo de reservas.
const config = window.RESERVAS_CONFIG;
const rooms = config.rooms;
const roomCards = document.querySelector('#room-cards');
const roomSelect = document.querySelector('#room');
const dateInput = document.querySelector('#reservation-date');
const startSelect = document.querySelector('#start-time');
const endSelect = document.querySelector('#end-time');
const availability = document.querySelector('#availability');
const reservationForm = document.querySelector('#reservation-form');
const formMessage = document.querySelector('#form-message');
const serviceMessage = document.querySelector('#service-message');
const submitButton = document.querySelector('#submit-reservation');
const bookingFrame = document.querySelector('#booking-frame');
const bookingForm = document.querySelector('#booking-form');
const demoMode = !config.googleSheetsUrl.trim();
const timeSlots = Array.from({ length: 15 }, (_, index) => {
  const hour = index + 8;
  return `${String(hour).padStart(2, '0')}:00`;
});

// Guarda a disponibilidade atual e lê o espaço opcional recebido pela URL.
let currentReservations = [];
const requestedRoomId = new URLSearchParams(window.location.search).get('room');
let selectedRoomId = rooms.some((room) => room.id === requestedRoomId)
  ? requestedRoomId
  : rooms[0]?.id || '';
let requestNumber = 0;

// Formata uma data local como YYYY-MM-DD sem conversão de fuso horário.
function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Codifica texto dinâmico antes de inseri-lo em marcação HTML.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

// Verifica se dois períodos de reserva se sobrepõem.
function reservationOverlaps(start, end, reservation) {
  return start < reservation.end && end > reservation.start;
}

// Lê do navegador as reservas usadas somente no modo de demonstração.
function loadDemoReservations(date) {
  try {
    const saved = JSON.parse(localStorage.getItem('anhanguera-demo-reservations') || '[]');
    return saved.filter((reservation) => reservation.date === date);
  } catch (error) {
    console.error('Não foi possível ler as reservas de demonstração.', error);
    return [];
  }
}

// Exibe uma mensagem de status com o tipo visual informado.
function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `message message--${type}`;
  element.hidden = false;
}

// Oculta uma mensagem e limpa seu conteúdo anterior.
function hideMessage(element) {
  element.hidden = true;
  element.textContent = '';
}

// Consulta a planilha por JSONP e encerra a requisição em caso de erro ou timeout.
function jsonp(url, date, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const callbackName = `reservationCallback${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => finish(new Error('Tempo esgotado ao consultar as reservas.')), timeout);

    function finish(error, result) {
      window.clearTimeout(timer);
      delete window[callbackName];
      script.remove();
      if (error) reject(error);
      else resolve(result);
    }

    window[callbackName] = (result) => {
      if (result.error) finish(new Error(result.error));
      else finish(null, result);
    };
    script.onerror = () => finish(new Error('Não foi possível consultar a planilha de reservas.'));
    script.src = `${url}${url.includes('?') ? '&' : '?'}action=availability&date=${encodeURIComponent(date)}&callback=${callbackName}`;
    document.head.append(script);
  });
}

// Usa armazenamento local no modo de demonstração ou consulta o Apps Script.
async function getReservations(date) {
  if (demoMode) return loadDemoReservations(date);
  const result = await jsonp(config.googleSheetsUrl, date);
  return result.reservations;
}

// Monta os cartões de espaços e conecta seus botões à seleção do ambiente.
function renderRoomCards() {
  roomCards.innerHTML = rooms.map((room) => `
    <article class="room-card${room.id === selectedRoomId ? ' is-selected' : ''}">
      <img src="${escapeHtml(room.image)}" alt="${escapeHtml(room.imageAlt)}" loading="lazy">
      <div class="room-card__content">
        <h3>${escapeHtml(room.name)}</h3>
        <p>${escapeHtml(room.description)}</p>
        <button class="button button--outline" type="button" data-select-room="${escapeHtml(room.id)}">
          Consultar horários
        </button>
      </div>
    </article>
  `).join('');

  roomCards.querySelectorAll('[data-select-room]').forEach((button) => {
    button.addEventListener('click', () => selectRoom(button.dataset.selectRoom, true));
  });
}

// Preenche o seletor de espaços com a configuração disponível.
function fillRoomSelect() {
  roomSelect.innerHTML = rooms.map((room) =>
    `<option value="${escapeHtml(room.id)}">${escapeHtml(room.name)}</option>`
  ).join('');
  roomSelect.value = selectedRoomId;
}

// Informa se o período escolhido conflita com uma reserva do espaço ativo.
function isTimeUnavailable(start, end) {
  return currentReservations.some((reservation) =>
    reservation.roomId === selectedRoomId && reservationOverlaps(start, end, reservation)
  );
}

// Atualiza a grade de horários e as opções válidas de início.
function renderAvailability() {
  const roomReservations = currentReservations.filter((reservation) => reservation.roomId === selectedRoomId);
  availability.innerHTML = timeSlots.slice(0, -1).map((start, index) => {
    const end = timeSlots[index + 1];
    const reserved = roomReservations.some((reservation) => reservationOverlaps(start, end, reservation));
    return `<span class="time-slot${reserved ? ' time-slot--reserved' : ''}"${reserved ? ' aria-label="Horário reservado"' : ''}>
      ${start}${reserved ? '<small>Reservado</small>' : '<small>Disponível</small>'}
    </span>`;
  }).join('');

  const previousStart = startSelect.value;
  startSelect.innerHTML = timeSlots.slice(0, -1).map((start, index) => {
    const end = timeSlots[index + 1];
    const disabled = isTimeUnavailable(start, end);
    return `<option value="${start}" ${disabled ? 'disabled' : ''}>${start}${disabled ? ' — indisponível' : ''}</option>`;
  }).join('');
  if (previousStart && !startSelect.querySelector(`option[value="${previousStart}"]:not(:disabled)`)) {
    startSelect.selectedIndex = -1;
  } else if (previousStart) {
    startSelect.value = previousStart;
  }
  updateEndTimes();
}

// Limita as opções de término aos períodos posteriores ainda disponíveis.
function updateEndTimes() {
  const startIndex = timeSlots.indexOf(startSelect.value);
  if (startIndex < 0) {
    endSelect.innerHTML = '<option value="">Selecione um horário inicial disponível</option>';
    endSelect.disabled = true;
    return;
  }

  const previousEnd = endSelect.value;
  const availableEnds = timeSlots.slice(startIndex + 1).filter((end) =>
    !isTimeUnavailable(startSelect.value, end)
  );
  endSelect.disabled = availableEnds.length === 0;
  endSelect.innerHTML = availableEnds.map((end) =>
    `<option value="${end}">${end}</option>`
  ).join('');
  if (availableEnds.includes(previousEnd)) endSelect.value = previousEnd;
}

// Recarrega disponibilidade e ignora respostas antigas de consultas anteriores.
async function refreshAvailability() {
  const currentRequest = ++requestNumber;
  const requestedDate = dateInput.value;
  const requestedRoomId = selectedRoomId;
  hideMessage(formMessage);
  availability.innerHTML = '<p class="availability-loading">Consultando disponibilidade...</p>';
  startSelect.disabled = true;
  endSelect.disabled = true;
  submitButton.disabled = true;

  try {
    const reservations = await getReservations(requestedDate);
    if (currentRequest !== requestNumber) return;
    currentReservations = reservations;
    renderAvailability();
    startSelect.disabled = false;
    submitButton.disabled = false;
    if (demoMode) {
      showMessage(serviceMessage, 'Modo de demonstração: as reservas ficam apenas neste navegador e não bloqueiam horários para outras pessoas.', 'warning');
    } else {
      hideMessage(serviceMessage);
    }
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    availability.innerHTML = '';
    showMessage(serviceMessage, error.message, 'error');
  } finally {
    if (currentRequest === requestNumber) {
      submitButton.disabled = false;
      roomSelect.value = requestedRoomId;
    }
  }
}

// Atualiza o espaço selecionado e, quando solicitado, leva ao formulário.
function selectRoom(roomId, scrollToForm) {
  if (!rooms.some((room) => room.id === roomId)) return;
  selectedRoomId = roomId;
  roomSelect.value = roomId;
  renderRoomCards();
  refreshAvailability();
  if (scrollToForm) {
    document.querySelector('#reservation').scrollIntoView({ behavior: 'smooth' });
  }
}

// Valida localmente os campos temporais antes de enviar uma reserva.
function validateSubmission(formData) {
  const start = formData.get('start');
  const end = formData.get('end');
  if (!start || !end || end <= start) {
    throw new Error('Selecione um horário final posterior ao horário inicial.');
  }
  if (formData.get('date') < localDateString()) {
    throw new Error('A data da reserva não pode estar no passado.');
  }
  if (isTimeUnavailable(start, end)) {
    throw new Error('Esse período ficou indisponível. Escolha outro horário.');
  }
}

// Envia a solicitação ao Apps Script e aguarda confirmação pelo iframe.
function postReservation(payload) {
  return new Promise((resolve, reject) => {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onResponse);
      reject(new Error('A planilha não confirmou o recebimento. Verifique a conexão e tente novamente.'));
    }, 20000);

    function onResponse(event) {
      if (event.source !== bookingFrame.contentWindow || event.data?.type !== 'reservation-result' || event.data.nonce !== nonce) return;
      window.clearTimeout(timeout);
      window.removeEventListener('message', onResponse);
      if (event.data.ok) resolve();
      else reject(new Error(event.data.error || 'A reserva não foi registrada.'));
    }

    window.addEventListener('message', onResponse);
    bookingForm.action = config.googleSheetsUrl;
    bookingForm.querySelector('[name="payload"]').value = JSON.stringify({ ...payload, nonce });
    bookingForm.submit();
  });
}

reservationForm.addEventListener('submit', async (event) => {
  // Intercepta o envio para validar, registrar e atualizar a disponibilidade.
  event.preventDefault();
  hideMessage(formMessage);
  const formData = new FormData(reservationForm);

  try {
    validateSubmission(formData);
    const payload = {
      professor: formData.get('professor').trim(),
      discipline: formData.get('discipline').trim(),
      course: formData.get('course').trim(),
      roomId: selectedRoomId,
      roomName: rooms.find((room) => room.id === selectedRoomId).name,
      date: formData.get('date'),
      start: formData.get('start'),
      end: formData.get('end'),
      purpose: formData.get('purpose').trim(),
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Registrando...';
    if (demoMode) {
      const saved = JSON.parse(localStorage.getItem('anhanguera-demo-reservations') || '[]');
      saved.push(payload);
      localStorage.setItem('anhanguera-demo-reservations', JSON.stringify(saved));
    } else {
      await postReservation(payload);
    }

    showMessage(formMessage, demoMode
      ? 'Reserva de demonstração adicionada neste navegador. Ela não foi enviada à Faculdade.'
      : 'Reserva registrada com sucesso.',
    demoMode ? 'warning' : 'success');
    reservationForm.reset();
    dateInput.value = payload.date;
    roomSelect.value = selectedRoomId;
    await refreshAvailability();
  } catch (error) {
    showMessage(formMessage, error.message || 'Revise os dados e tente novamente.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Solicitar reserva';
  }
});

roomSelect.addEventListener('change', () => selectRoom(roomSelect.value, false));
dateInput.addEventListener('change', refreshAvailability);
startSelect.addEventListener('change', updateEndTimes);

// Inicializa os controles e consulta os horários da data atual.
dateInput.min = localDateString();
dateInput.value = localDateString();
fillRoomSelect();
renderRoomCards();
refreshAvailability();
