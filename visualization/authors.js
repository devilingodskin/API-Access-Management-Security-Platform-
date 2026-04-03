const counters = [...document.querySelectorAll(".stat-value")];
const panicFill = document.getElementById("panic-fill");
const panicValue = document.getElementById("panic-value");
const statusLine = document.getElementById("status-line");
const authorCards = [...document.querySelectorAll(".author-card")];
const yearNode = document.getElementById("year");
const canvas = document.getElementById("chaos-canvas");

if (yearNode) {
  yearNode.textContent = new Date().getFullYear().toString();
}

function animateCount(node, target) {
  const start = performance.now();
  const duration = 1300 + Math.min(target * 3, 500);

  const frame = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - t) ** 4;
    node.textContent = Math.round(target * eased).toString();
    if (t < 1) {
      requestAnimationFrame(frame);
    }
  };

  requestAnimationFrame(frame);
}

function setupCounterReveal() {
  const observer = new IntersectionObserver(
    (entries, io) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const target = Number(entry.target.getAttribute("data-target") || "0");
        animateCount(entry.target, target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.35 },
  );

  counters.forEach((counter) => observer.observe(counter));
}

function setupPanicMeter() {
  let value = 27;

  const tick = () => {
    value += Math.floor((Math.random() - 0.35) * 8);
    value = Math.max(71, Math.min(99, value));

    panicFill.style.width = `${value}%`;
    panicValue.textContent = String(value);
  };

  tick();
  setInterval(tick, 620);
}

function typeLine(text, speed = 22) {
  return new Promise((resolve) => {
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
    "> compiling courage... ok",
    "> syncing markdown with reality... warning: deadlines detected",
    "> rendering animations... status: still alive",
    "> final review... actually one more final review",
    "> deploy complete. coffee level: critical",
  ];

  while (true) {
    for (const line of lines) {
      await typeLine(line);
      await wait(900);
    }
  }
}

function burst(x, y) {
  const node = document.createElement("span");
  node.className = "burst";
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 520);
}

function setupAuthorCardBursts() {
  authorCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      burst(event.clientX, event.clientY);
      burst(centerX + 18, centerY - 12);
      burst(centerX - 16, centerY + 10);
    });
  });
}

function setupCanvasDust() {
  return;
}

setupCounterReveal();
setupPanicMeter();
runStatusLoop();
setupAuthorCardBursts();
setupCanvasDust();
