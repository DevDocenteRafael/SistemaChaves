// Nome da aba e colunas usadas para armazenar as solicitações de reserva.
const SHEET_NAME = 'Reservas';
const HEADERS = [
  'Registrada em',
  'Professor',
  'Disciplina',
  'Curso ou turma',
  'ID do espaço',
  'Espaço',
  'Data',
  'Início',
  'Término',
  'Finalidade',
];

// Retorna as reservas de uma data por JSONP para permitir a consulta no site.
function doGet(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  const callback = parameters.callback || '';
  try {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
      throw new Error('Parâmetro de consulta inválido.');
    }
    const date = parameters.date || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Informe uma data válida.');
    }
    const reservations = readReservations_()
      .filter((reservation) => reservation.date === date)
      .map(({ roomId, date: reservationDate, start, end }) => ({
        roomId,
        date: reservationDate,
        start,
        end,
      }));
    return jsonp_(callback, { reservations });
  } catch (error) {
    return jsonp_(callback, { error: error.message });
  }
}

// Valida e registra a reserva sob bloqueio para impedir conflitos simultâneos.
function doPost(event) {
  let nonce = '';
  try {
    const payload = JSON.parse(event.parameter.payload || '{}');
    nonce = String(payload.nonce || '');
    validatePayload_(payload);

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('O sistema está ocupado. Tente novamente em alguns segundos.');
    }
    try {
      const sheet = getReservationsSheet_();
      const reservations = readReservations_();
      const conflict = reservations.some((reservation) =>
        reservation.roomId === payload.roomId &&
        reservation.date === payload.date &&
        payload.start < reservation.end &&
        payload.end > reservation.start
      );
      if (conflict) {
        throw new Error('Esse horário acabou de ser reservado. Atualize a disponibilidade e escolha outro.');
      }
      sheet.appendRow([
        new Date(),
        safeTextCell_(payload.professor),
        safeTextCell_(payload.discipline),
        safeTextCell_(payload.course),
        payload.roomId,
        payload.roomName,
        payload.date,
        payload.start,
        payload.end,
        safeTextCell_(payload.purpose),
      ]);
    } finally {
      lock.releaseLock();
    }
    return postResult_(nonce, true, '');
  } catch (error) {
    return postResult_(nonce, false, error.message || 'Não foi possível registrar a reserva.');
  }
}

// Confere campos obrigatórios, limites e regras de data e horário.
function validatePayload_(payload) {
  const requiredFields = ['professor', 'discipline', 'course', 'roomId', 'roomName', 'date', 'start', 'end', 'purpose'];
  if (!requiredFields.every((field) => typeof payload[field] === 'string' && payload[field].trim())) {
    throw new Error('Preencha todos os campos obrigatórios.');
  }
  const dateParts = payload.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsedDate = dateParts
    ? new Date(Date.UTC(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3])))
    : null;
  if (!parsedDate || parsedDate.toISOString().slice(0, 10) !== payload.date ||
      !/^([01]\d|2[0-3]):00$/.test(payload.start) ||
      !/^([01]\d|2[0-3]):00$/.test(payload.end) ||
      payload.start < '08:00' || payload.end > '22:00' ||
      payload.end <= payload.start) {
    throw new Error('Data ou horário inválido.');
  }
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (payload.date < today) throw new Error('A data da reserva não pode estar no passado.');
  if (payload.professor.length > 160 || payload.discipline.length > 120 ||
      payload.course.length > 120 || payload.purpose.length > 1000) {
    throw new Error('Um ou mais campos excedem o limite de caracteres.');
  }
}

// Evita que textos iniciados por operadores sejam interpretados como fórmulas.
function safeTextCell_(value) {
  const text = value.trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

// Lê as linhas registradas e converte os campos usados na disponibilidade.
function readReservations_() {
  const sheet = getReservationsSheet_();
  if (sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getDisplayValues();
  return rows.map((row) => ({
    roomId: row[4],
    date: row[6],
    start: row[7],
    end: row[8],
  })).filter((reservation) => reservation.roomId && reservation.date && reservation.start && reservation.end);
}

// Obtém a aba de reservas e a prepara quando ainda não existe.
function getReservationsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Vincule o Apps Script a uma planilha do Google.');
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Serializa a resposta de consulta no formato JSONP esperado pelo navegador.
function jsonp_(callback, result) {
  const json = JSON.stringify(result).replace(/</g, '\\u003c');
  return ContentService.createTextOutput(`${callback}(${json});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// Devolve ao formulário uma confirmação legível dentro do iframe oculto.
function postResult_(nonce, ok, error) {
  const result = JSON.stringify({ type: 'reservation-result', nonce, ok, error }).replace(/</g, '\\u003c');
  const html = `<script>window.parent.postMessage(${result}, '*');</script>`;
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
