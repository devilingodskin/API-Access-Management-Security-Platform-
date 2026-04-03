const authorCards = [...document.querySelectorAll(".author-card")];

function emitLike(x, y, text = "👍") {
  const node = document.createElement("span");
  node.className = "respect-like";
  node.textContent = text;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  node.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 120)}px`);
  node.style.setProperty("--dy", `${-(100 + Math.round(Math.random() * 90))}px`);
  node.style.setProperty("--rot", `${Math.round((Math.random() - 0.5) * 40)}deg`);
  node.style.setProperty("--scale", (1 + Math.random() * 0.45).toFixed(2));
  node.style.setProperty("--dur", `${840 + Math.round(Math.random() * 420)}ms`);
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1400);
}

function launchRespectWave(card, event) {
  const rect = card.getBoundingClientRect();
  const baseX = event.clientX || rect.left + rect.width / 2;
  const baseY = event.clientY || rect.top + rect.height / 2;

  for (let i = 0; i < 8; i += 1) {
    setTimeout(() => {
      emitLike(baseX + (Math.random() - 0.5) * 36, baseY + (Math.random() - 0.5) * 20);
    }, i * 52);
  }
}

function setupAuthorCardRespect() {
  authorCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      launchRespectWave(card, event);
    });
  });
}

setupAuthorCardRespect();
