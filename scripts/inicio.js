// Seleciona a área da página inicial que receberá os cartões de espaços.
const roomCards = document.querySelector('#home-room-cards');

// Cria os cartões iniciais e direciona cada ação para o espaço escolhido.
roomCards.innerHTML = window.RESERVAS_CONFIG.rooms.slice(0, 3).map((room) => `
  <article class="haircut home-room-card">
    <img src="${room.image}" alt="${room.imageAlt}" loading="lazy">
    <div class="haircut-info">
      <div>
        <strong>${room.name}</strong>
        <p>${room.description}</p>
      </div>
      <a class="room-booking-link" href="html/agendar.html?room=${encodeURIComponent(room.id)}">
        Agendar
      </a>
    </div>
  </article>
`).join('');
