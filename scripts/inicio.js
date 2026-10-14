const roomCards = document.querySelector('#home-room-cards');

roomCards.innerHTML = window.RESERVAS_CONFIG.rooms.slice(0, 3).map((room) => `
  <article class="haircut home-room-card">
    <img src="${room.image}" alt="${room.imageAlt}" loading="lazy">
    <div class="haircut-info">
      <div>
        <strong>${room.name}</strong>
        <p>${room.description}</p>
      </div>
      <a class="room-booking-link" href="agendar.html?room=${encodeURIComponent(room.id)}">
        Agendar
      </a>
    </div>
  </article>
`).join('');
