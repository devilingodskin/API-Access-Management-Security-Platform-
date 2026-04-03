const statusLine = document.getElementById("status-line");
const authorCards = [...document.querySelectorAll(".author-card")];
const yearNode = document.getElementById("year");

if (yearNode) {
  yearNode.textContent = new Date().getFullYear().toString();
}

function typeLine(text, speed = 22) {
  return new Promise((resolve) => {
    if (!statusLine) {
      resolve();
      return;
    }

    let i = 0;
    const step = () => {
      statusLine.textContent = text.slice(0, i);
      i += 1;
      if (i <= text.length) {
        setTimeout(step, speed);
      } else {
        resolve();
      }
    };
    step();
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStatusLoop() {
  if (!statusLine) {
    return;
  }

  const lines = [
    "> уважение авторам: initialized",
    "> благодарность за каждый фикс: active",
    "> стабильность проекта: maintained",
    "> человеческий ресурс: держится на уважении",
  ];

  while (true) {
    for (const line of lines) {
      await typeLine(line);
      await wait(950);
    }
  }
}

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
  const likes = ["👍", "👍", "👍", "👍", "👍", "👍", "👍"];

  likes.forEach((icon, index) => {
    setTimeout(() => {
      emitLike(baseX + (Math.random() - 0.5) * 34, baseY + (Math.random() - 0.5) * 18, icon);
    }, index * 55);
  });
}

function setupAuthorCardRespect() {
  authorCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      launchRespectWave(card, event);
    });
  });
}

runStatusLoop();
setupAuthorCardRespect();
