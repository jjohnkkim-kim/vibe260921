(function () {
  "use strict";

  const EMAIL = "jjohnkkim@gmail.com";

  // 기술 스택 데이터
  const skills = [
    {
      name: "바이브코딩",
      desc: "AI 코딩 도구를 활용한 기획 → 구현 → 개선 워크플로",
      example: "뱀 게임, 테트리스를 AI와 대화하며 완성",
    },
    {
      name: "Python",
      desc: "스크립트, 자동화, 게임/도구 제작",
      example: "tkinter 기반 사람 vs AI 뱀 게임",
    },
    {
      name: "HTML5",
      desc: "시맨틱 마크업, Canvas, CSS3, JavaScript",
      example: "Canvas 기반 테트리스, 이 프로필 사이트",
    },
  ];

  // 프로젝트 데이터 - 항목을 추가하면 카드가 자동으로 생성됩니다.
  const projects = [
    {
      title: "뱀 게임",
      desc: "사람이 조종하는 뱀과 AI 뱀이 사과를 두고 경쟁하는 대결형 게임.",
      tags: ["Python", "tkinter", "AI"],
      links: [{ label: "소스 보기", href: "../snake.py" }],
    },
    {
      title: "테트리스",
      desc: "고스트 블록, 다음 블록 미리보기, 레벨 시스템을 갖춘 웹 테트리스.",
      tags: ["HTML5", "Canvas", "JavaScript"],
      links: [
        { label: "데모 실행", href: "../game01/tetris.html" },
      ],
    },
  ];

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function renderSkills() {
    const box = document.getElementById("skillList");
    skills.forEach((s) => {
      const card = el("article", "card");
      card.appendChild(el("h3", null, s.name));
      card.appendChild(el("p", null, s.desc));
      const c = el("p", "case");
      c.appendChild(el("strong", null, "대표 사례: "));
      c.appendChild(document.createTextNode(s.example));
      card.appendChild(c);
      box.appendChild(card);
    });
  }

  function renderProjects() {
    const box = document.getElementById("projectList");
    projects.forEach((p) => {
      const card = el("article", "card");
      card.appendChild(el("h3", null, p.title));
      card.appendChild(el("p", null, p.desc));
      const tags = el("div", "tags");
      p.tags.forEach((t) => tags.appendChild(el("span", "tag", t)));
      card.appendChild(tags);
      if (p.links && p.links.length) {
        const links = el("div", "links");
        p.links.forEach((l) => {
          const a = el("a", null, l.label);
          a.href = l.href;
          a.target = "_blank";
          a.rel = "noopener";
          links.appendChild(a);
        });
        card.appendChild(links);
      }
      box.appendChild(card);
    });
  }

  // 테마 전환
  function setupTheme() {
    const root = document.documentElement;
    const btn = document.getElementById("themeToggle");
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  // 이메일 복사
  function setupCopy() {
    const btn = document.getElementById("copyBtn");
    const msg = document.getElementById("copyMsg");
    btn.addEventListener("click", async () => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(EMAIL);
        ok = true;
      } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = EMAIL;
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand("copy"); } catch (e2) {}
        document.body.removeChild(ta);
      }
      msg.textContent = ok ? "이메일 주소가 복사되었습니다." : "복사에 실패했습니다. 직접 선택해 주세요.";
      setTimeout(() => { msg.textContent = ""; }, 2500);
    });
  }

  renderSkills();
  renderProjects();
  setupTheme();
  setupCopy();
  document.getElementById("year").textContent = new Date().getFullYear();
})();
