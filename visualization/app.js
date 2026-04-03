const content = document.getElementById("doc-content");
const toc = document.getElementById("toc-items");
const metricStrip = document.getElementById("metric-strip");
const scenarioRail = document.getElementById("scenario-rail");
const progressBar = document.getElementById("scroll-progress");
const toTop = document.getElementById("to-top");
const hero = document.querySelector(".hero");
const fxCanvas = document.getElementById("fx-canvas");

const slugCounts = new Map();

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function resolvePath(url) {
  if (/^(https?:|mailto:|tel:|#|data:)/i.test(url)) {
    return url;
  }
  if (url.startsWith("../") || url.startsWith("/")) {
    return url;
  }
  if (url.startsWith("./")) {
    return `../${url.slice(2)}`;
  }
  return `../${url}`;
}

function slugify(raw) {
  const base = raw
    .toLowerCase()
    .trim()
    .replace(/[`~!@#$%^&*()+=\[\]{};:'",.<>/?\\|]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const safe = base || "section";
  const count = slugCounts.get(safe) ?? 0;
  slugCounts.set(safe, count + 1);
  return count === 0 ? safe : `${safe}-${count + 1}`;
}

function renderInline(text) {
  if (!text) {
    return "";
  }

  const tokenMap = [];
  const token = (html) => {
    const index = tokenMap.length;
    tokenMap.push(html);
    return `@@TOKEN_${index}@@`;
  };

  let working = text;

  working = working.replace(/`([^`]+)`/g, (_, code) => token(`<code>${escapeHtml(code)}</code>`));

  working = working.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const resolved = resolvePath(href.trim());
    const external = /^(https?:|mailto:|tel:)/i.test(resolved);
    const attrs = external ? ' target="_blank" rel="noreferrer"' : "";
    return token(`<a href="${escapeAttr(resolved)}"${attrs}>${escapeHtml(label.trim())}</a>`);
  });

  working = escapeHtml(working)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return working.replace(/@@TOKEN_(\d+)@@/g, (_, index) => tokenMap[Number(index)] ?? "");
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableStart(lines, index) {
  if (index + 1 >= lines.length) {
    return false;
  }
  const current = lines[index].trim();
  const next = lines[index + 1].trim();
  if (!current.includes("|")) {
    return false;
  }
  return /^\|?\s*[:\- ]+\|[|:\- ]*\s*$/.test(next);
}

function isListLine(line) {
  return /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line);
}

function isBlockStart(lines, index) {
  const line = lines[index];
  if (!line || line.trim() === "") {
    return true;
  }

  return (
    /^#{1,6}\s+/.test(line) ||
    /^```/.test(line.trim()) ||
    /^>\s*/.test(line) ||
    /^-{3,}\s*$/.test(line.trim()) ||
    /^!\[[^\]]*\]\([^)]+\)\s*$/.test(line.trim()) ||
    isListLine(line) ||
    isTableStart(lines, index)
  );
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headings = [];
  let html = "";

  let inCode = false;
  let codeLang = "";
  let codeLines = [];
  let listType = null;

  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };

  const closeCode = () => {
    const langClass = codeLang ? ` class="language-${escapeAttr(codeLang)}"` : "";
    html += `<pre><code${langClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`;
    inCode = false;
    codeLang = "";
    codeLines = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inCode) {
      if (/^```/.test(trimmed)) {
        closeCode();
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (!trimmed) {
      closeList();
      continue;
    }

    if (/^```/.test(trimmed)) {
      closeList();
      inCode = true;
      codeLang = trimmed.slice(3).trim();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const id = slugify(title);
      headings.push({ level, text: title, id });
      html += `<h${level} id="${escapeAttr(id)}">${renderInline(title)}</h${level}>`;
      continue;
    }

    if (isTableStart(lines, i)) {
      closeList();
      const headerCells = splitTableRow(lines[i]);
      const rows = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes("|")) {
        rows.push(splitTableRow(lines[j]));
        j += 1;
      }

      html += "<table><thead><tr>";
      html += headerCells.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
      html += "</tr></thead><tbody>";
      rows.forEach((row) => {
        html += "<tr>";
        for (let c = 0; c < headerCells.length; c += 1) {
          html += `<td>${renderInline(row[c] ?? "")}</td>`;
        }
        html += "</tr>";
      });
      html += "</tbody></table>";
      i = j - 1;
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      closeList();
      const alt = imageMatch[1].trim();
      const src = resolvePath(imageMatch[2].trim());
      html += `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />`;
      if (alt) {
        html += `<figcaption>${renderInline(alt)}</figcaption>`;
      }
      html += "</figure>";
      continue;
    }

    if (/^>\s*/.test(line)) {
      closeList();
      const quoteLines = [line.replace(/^>\s?/, "")];
      while (i + 1 < lines.length && /^>\s*/.test(lines[i + 1])) {
        quoteLines.push(lines[i + 1].replace(/^>\s?/, ""));
        i += 1;
      }
      html += `<blockquote><p>${renderInline(quoteLines.join(" "))}</p></blockquote>`;
      continue;
    }

    if (/^-{3,}\s*$/.test(trimmed)) {
      closeList();
      html += "<hr />";
      continue;
    }

    const listMatch = line.match(/^\s*([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const type = /\d+\./.test(listMatch[1]) ? "ol" : "ul";
      if (listType !== type) {
        closeList();
        listType = type;
        html += `<${type}>`;
      }
      html += `<li>${renderInline(listMatch[2].trim())}</li>`;
      continue;
    }

    closeList();
    const paragraph = [line.trim()];
    while (i + 1 < lines.length && !isBlockStart(lines, i + 1)) {
      paragraph.push(lines[i + 1].trim());
      i += 1;
    }
    html += `<p>${renderInline(paragraph.join(" "))}</p>`;
  }

  closeList();
  if (inCode) {
    closeCode();
  }

  return { html, headings };
}

function groupIntoSections(article) {
  const fragment = document.createDocumentFragment();
  let currentSection = null;

  [...article.children].forEach((element) => {
    if (element.tagName === "H2") {
      currentSection = document.createElement("section");
      currentSection.className = "doc-section";
      fragment.appendChild(currentSection);
      currentSection.appendChild(element);
      return;
    }

    if (!currentSection) {
      currentSection = document.createElement("section");
      currentSection.className = "doc-section";
      fragment.appendChild(currentSection);
    }
    currentSection.appendChild(element);
  });

  article.replaceChildren(fragment);
}

function addCodeCopyButtons() {
  content.querySelectorAll("pre").forEach((pre) => {
    const wrapper = document.createElement("div");
    wrapper.className = "code-wrap";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const button = document.createElement("button");
    button.className = "copy-btn";
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        button.textContent = "Copied";
      } catch {
        button.textContent = "Failed";
      }
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1000);
    });

    wrapper.appendChild(button);
  });
}

function renderMetrics(stats) {
  const entries = [
    [stats.scenarios, "Сценариев"],
    [stats.stakeholderReqs, "Stakeholder reqs"],
    [stats.systemReqs, "System reqs"],
    [stats.nfrCount, "NFR"],
    [stats.riskCount, "Рисков"],
    [stats.testCount, "Тест-кейсов"],
  ];

  metricStrip.innerHTML = entries
    .map(
      ([value, label], idx) =>
        `<div class="metric" style="animation-delay:${idx * 70}ms"><span class="metric-value" data-target="${value}">0</span><span class="metric-label">${label}</span></div>`,
    )
    .join("");

  metricStrip.querySelectorAll(".metric-value").forEach((el) => {
    const target = Number(el.dataset.target || "0");
    const start = performance.now();
    const duration = 900 + Math.min(target * 8, 600);

    const tick = (now) => {
      const ratio = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - ratio) ** 3;
      el.textContent = Math.round(target * eased).toString();
      if (ratio < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  });
}

function renderScenarioRail(scenarios) {
  if (!scenarios.length) {
    scenarioRail.innerHTML = "";
    return;
  }

  scenarioRail.innerHTML = scenarios
    .map(
      (scenario) =>
        `<a class="scenario-pill" href="#${escapeAttr(scenario.id)}">${escapeHtml(scenario.short)}: ${escapeHtml(scenario.title)}</a>`,
    )
    .join("");
}

function extractStats(markdown, headings) {
  const readCount = (regex, fallback = 0) => {
    const hit = markdown.match(regex);
    return hit ? Number(hit[1]) : fallback;
  };

  const scenarioHeadings = headings
    .filter((item) => item.level === 3)
    .map((item) => {
      const match = item.text.match(/Сценарий\s+(S\d+)\.\s+(.+)/i);
      if (!match) {
        return null;
      }
      return {
        id: item.id,
        short: match[1],
        title: match[2],
      };
    })
    .filter(Boolean);

  return {
    scenarios: scenarioHeadings.length,
    stakeholderReqs: readCount(/Stakeholder requirements\s*\((\d+)\s*шт/i, 0),
    systemReqs: readCount(/System requirements\s*\((\d+)\s*шт/i, 0),
    nfrCount: readCount(/NFR \/ качество\s*\((\d+)\s*шт/i, 0),
    riskCount: readCount(/Регистр рисков\s*\((\d+)\s*шт/i, 0),
    testCount: readCount(/Тест-кейсы\s*\((\d+)\s*шт/i, 0),
    scenarioHeadings,
  };
}

function renderToc(headings) {
  const filtered = headings.filter((item) => item.level >= 2 && item.level <= 3);

  toc.innerHTML = filtered
    .map(
      (item) =>
        `<a class="toc-link depth-${item.level}" href="#${escapeAttr(item.id)}">${escapeHtml(item.text)}</a>`,
    )
    .join("");
}

function setupRevealAnimations() {
  const nodes = content.querySelectorAll("h1, h2, h3, h4, p, ul, ol, pre, table, figure, blockquote, hr");
  const observer = new IntersectionObserver(
    (entries, io) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );

  nodes.forEach((node) => {
    node.classList.add("reveal");
    observer.observe(node);
  });
}

function setupActiveToc() {
  const links = [...toc.querySelectorAll(".toc-link")];
  const headings = [...content.querySelectorAll("h2, h3")];
  const byId = new Map(links.map((link) => [link.getAttribute("href").slice(1), link]));
  const tocPanel = document.querySelector(".toc");
  const indicator = document.createElement("span");
  indicator.className = "toc-indicator";
  toc.prepend(indicator);
  let activeId = null;
  let ticking = false;

  if (!links.length || !headings.length) {
    indicator.remove();
    return;
  }

  const moveIndicator = (link) => {
    if (!link) {
      indicator.style.opacity = "0";
      return;
    }

    indicator.style.height = `${link.offsetHeight}px`;
    indicator.style.transform = `translateY(${link.offsetTop}px)`;
    indicator.style.opacity = "1";
  };

  const ensureVisible = (link) => {
    if (!link || !tocPanel) {
      return;
    }

    const pad = 14;
    const panelRect = tocPanel.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const topDelta = linkRect.top - (panelRect.top + pad);

    if (topDelta < 0) {
      tocPanel.scrollBy({ top: topDelta, behavior: "smooth" });
      return;
    }

    const bottomDelta = linkRect.bottom - (panelRect.bottom - pad);
    if (bottomDelta > 0) {
      tocPanel.scrollBy({ top: bottomDelta, behavior: "smooth" });
    }
  };

  const setActive = (id) => {
    if (!id || id === activeId) {
      return;
    }

    activeId = id;
    links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${id}`));
    const activeLink = byId.get(id);
    moveIndicator(activeLink);
    ensureVisible(activeLink);
  };

  const syncActiveLink = () => {
    const threshold = 130;
    let currentId = headings[0].id;

    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= threshold) {
        currentId = heading.id;
      } else {
        break;
      }
    }

    setActive(currentId);
    ticking = false;
  };

  const onScroll = () => {
    if (ticking) {
      return;
    }
    ticking = true;
    requestAnimationFrame(syncActiveLink);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  syncActiveLink();
}

function setupScrollUI() {
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    progressBar.style.width = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;

    const show = window.scrollY > 760;
    toTop.classList.toggle("show", show);
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  update();
}

function setupHeroParallax() {
  if (!hero) {
    return;
  }

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = null;

  const animate = () => {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;
    hero.style.setProperty("--pointer-x", String(currentX));
    hero.style.setProperty("--pointer-y", String(currentY));

    if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > 0.002) {
      rafId = requestAnimationFrame(animate);
    } else {
      rafId = null;
    }
  };

  const schedule = () => {
    if (rafId === null) {
      rafId = requestAnimationFrame(animate);
    }
  };

  const setTarget = (clientX, clientY) => {
    const rect = hero.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
    targetX = Math.max(-1, Math.min(1, x));
    targetY = Math.max(-1, Math.min(1, y));
    schedule();
  };

  hero.addEventListener("mousemove", (event) => {
    setTarget(event.clientX, event.clientY);
  });

  hero.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    if (touch) {
      setTarget(touch.clientX, touch.clientY);
    }
  });

  hero.addEventListener("mouseleave", () => {
    targetX = 0;
    targetY = 0;
    schedule();
  });
}

function setup3DTilts() {
  const targets = [...document.querySelectorAll(".metric, .scenario-pill")];
  targets.forEach((item) => {
    item.style.transformStyle = "preserve-3d";

    const reset = () => {
      item.style.transform = "";
    };

    item.addEventListener("mousemove", (event) => {
      const rect = item.getBoundingClientRect();
      const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
      const offsetY = (event.clientY - rect.top) / rect.height - 0.5;
      const rotateY = offsetX * 10;
      const rotateX = offsetY * -9;
      item.style.transform = `translateZ(0) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    });

    item.addEventListener("mouseleave", reset);
    item.addEventListener("blur", reset);
  });
}

function setupBoomFx() {
  const shockwave = (x, y) => {
    const node = document.createElement("span");
    node.className = "shockwave";
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 560);
  };

  const domBlast = (x, y) => {
    const flash = document.createElement("span");
    flash.className = "boom-flash";
    flash.style.left = `${x}px`;
    flash.style.top = `${y}px`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 520);
  };

  document.addEventListener("pointerdown", (event) => {
    domBlast(event.clientX, event.clientY);
    shockwave(event.clientX, event.clientY);
  });

  if (scenarioRail) {
    scenarioRail.addEventListener("pointerover", (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.classList.contains("scenario-pill")) {
        return;
      }
      const rect = target.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      domBlast(cx, cy);
    });
  }
}

function renderError(message) {
  content.innerHTML = `<p>${escapeHtml(message)}</p>`;
}

function bootstrap() {
  try {
    const markdown = typeof window.CASE_MARKDOWN === "string" ? window.CASE_MARKDOWN : "";
    if (!markdown.trim()) {
      renderError("Не удалось прочитать markdown-контент из case-markdown.js");
      return;
    }

    const { html, headings } = markdownToHtml(markdown);
    content.innerHTML = html;

    groupIntoSections(content);
    addCodeCopyButtons();
    renderToc(headings);

    const stats = extractStats(markdown, headings);
    renderMetrics(stats);
    renderScenarioRail(stats.scenarioHeadings);

    setupHeroParallax();
    setup3DTilts();
    setupBoomFx();
    setupRevealAnimations();
    setupActiveToc();
    setupScrollUI();
  } catch (error) {
    renderError(`Ошибка рендера: ${error instanceof Error ? error.message : String(error)}`);
  }
}

bootstrap();
