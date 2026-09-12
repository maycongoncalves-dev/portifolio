const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const brandIntro = document.querySelector(".brand-intro");
const introProgress = document.querySelector("[data-intro-progress]");
const introRequested = root.classList.contains("intro-pending");
const lockedSurfaces = document.querySelectorAll(".site-header, main, .site-footer");
let introUnlocked = false;

// Privacy-first analytics layer. Events are ready for GA4, Plausible or Umami
// without collecting personal data before a provider is configured.
window.krythosDataLayer = window.krythosDataLayer || [];

function trackEvent(eventName, properties = {}) {
  const event = {
    event: eventName,
    page_path: window.location.pathname,
    page_title: document.title,
    ...properties
  };

  window.krythosDataLayer.push(event);
  window.dispatchEvent(new CustomEvent("krythos:analytics", { detail: event }));

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, properties);
  }

  if (typeof window.plausible === "function") {
    window.plausible(eventName, { props: properties });
  }

  if (window.umami && typeof window.umami.track === "function") {
    window.umami.track(eventName, properties);
  }
}

window.krythosTrack = trackEvent;

trackEvent("page_view", {
  referrer_type: document.referrer ? "referral" : "direct"
});

document.addEventListener("click", (event) => {
  const trackedLink = event.target.closest("[data-analytics-event]");
  if (!trackedLink) return;

  const href = trackedLink.getAttribute("href") || "";
  const destination = href.includes("wa.me")
    ? "whatsapp"
    : href.includes("instagram.com")
      ? "instagram"
      : href.startsWith("#")
        ? "internal"
        : "external";

  trackEvent(trackedLink.dataset.analyticsEvent, {
    placement: trackedLink.dataset.analyticsLabel || "unspecified",
    destination
  });
});

function rememberIntro() {
  try {
    sessionStorage.setItem("krythos-intro-seen", "true");
  } catch (error) {
    // The experience remains functional when storage is unavailable.
  }
}

function unlockPage() {
  if (introUnlocked) return;
  introUnlocked = true;
  window.clearTimeout(window.__krythosIntroFallback);
  root.classList.remove("intro-pending");
  document.body.removeAttribute("aria-busy");
  lockedSurfaces.forEach((surface) => { surface.inert = false; });
  rememberIntro();
}

function hideBrandIntro() {
  if (!brandIntro) return;
  brandIntro.hidden = true;
  brandIntro.setAttribute("aria-hidden", "true");
}

function useStaticIntro() {
  if (!introRequested || !brandIntro) {
    unlockPage();
    hideBrandIntro();
    return;
  }

  brandIntro.classList.add("no-gsap");
  window.setTimeout(() => {
    unlockPage();
    if (brandIntro.animate) {
      const fade = brandIntro.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 240, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" }
      );
      fade.finished.then(hideBrandIntro, hideBrandIntro);
    } else {
      hideBrandIntro();
    }
  }, 420);
}

function playBrandIntro() {
  if (!introRequested) {
    window.clearTimeout(window.__krythosIntroFallback);
    hideBrandIntro();
    return;
  }

  if (!brandIntro) {
    unlockPage();
    return;
  }

  document.body.setAttribute("aria-busy", "true");
  lockedSurfaces.forEach((surface) => { surface.inert = true; });

  if (reduceMotion.matches || !window.gsap || !window.MorphSVGPlugin) {
    useStaticIntro();
    return;
  }

  try {
    const { gsap, MorphSVGPlugin } = window;
    gsap.registerPlugin(MorphSVGPlugin);
    MorphSVGPlugin.convertToPath(".intro-shape");

    const pairs = [
      ["#shape-k", "#letter-k"],
      ["#shape-r", "#letter-r"],
      ["#shape-y", "#letter-y"],
      ["#shape-t", "#letter-t"],
      ["#shape-h", "#letter-h"],
      ["#shape-o", "#letter-o"],
      ["#shape-s", "#letter-s"]
    ];
    const shapes = pairs.map(([shape]) => document.querySelector(shape)).filter(Boolean);
    const surface = document.querySelector(".intro-surface-line");
    const reflection = document.querySelector(".intro-reflection");
    const meter = { value: 0 };

    gsap.set(surface, { scaleX: 0, transformOrigin: "50% 50%" });
    gsap.set(shapes, {
      opacity: 0,
      scale: .62,
      y: (index) => index % 2 === 0 ? -22 : 22,
      transformOrigin: "50% 50%"
    });
    gsap.set(reflection, { opacity: 0, x: 0 });

    const timeline = gsap.timeline({
      defaults: { ease: "power4.inOut" },
      onComplete: hideBrandIntro
    });

    timeline
      .to(surface, { scaleX: 1, duration: .42 })
      .to(shapes, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: .5,
        stagger: .055,
        ease: "power3.out"
      }, "-=.16")
      .addLabel("morph", ">-.04");

    pairs.forEach(([shape, letter], index) => {
      timeline.to(shape, {
        duration: .88,
        morphSVG: letter
      }, `morph+=${index * .045}`);
    });

    timeline
      .to(meter, {
        value: 100,
        duration: 1.25,
        ease: "power2.inOut",
        onUpdate: () => {
          if (introProgress) introProgress.textContent = String(Math.round(meter.value)).padStart(2, "0");
        }
      }, "morph")
      .to(surface, { opacity: .12, y: 13, duration: .55 }, "morph+=.68")
      .to(reflection, { opacity: .9, x: 1450, duration: .62, ease: "power2.inOut" }, "morph+=.92")
      .addLabel("emerge", "morph+=1.46")
      .call(unlockPage, [], "emerge")
      .to(brandIntro, {
        clipPath: "inset(0 0 100% 0)",
        duration: .72,
        ease: "power4.inOut"
      }, "emerge")
      .from(".site-header", { y: -18, opacity: 0, duration: .62, ease: "power3.out" }, "emerge+=.18")
      .from(".hero-content", { y: 26, opacity: 0, duration: .72, ease: "power3.out" }, "emerge+=.2");
  } catch (error) {
    useStaticIntro();
  }
}

playBrandIntro();

const header = document.querySelector("[data-header]");
const progress = document.querySelector(".scroll-progress span");
const hero = document.querySelector(".hero");
const menu = document.querySelector("#mobile-menu");
const menuToggle = document.querySelector(".menu-toggle");
const menuClose = document.querySelector(".menu-close");
const pageMain = document.querySelector("main");
const pageFooter = document.querySelector(".site-footer");

function updateScrollState() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  header?.classList.toggle("scrolled", y > 24);
  if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
}

let scrollQueued = false;
window.addEventListener("scroll", () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    updateScrollState();
    scrollQueued = false;
  });
}, { passive: true });
updateScrollState();

if (hero && !reduceMotion.matches && window.matchMedia("(pointer: fine)").matches) {
  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    hero.style.setProperty("--pointer-x", `${x.toFixed(2)}%`);
    hero.style.setProperty("--pointer-y", `${y.toFixed(2)}%`);
  });
  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--pointer-x", "72%");
    hero.style.setProperty("--pointer-y", "76%");
  });
}

function setMenu(open) {
  menu?.classList.toggle("open", open);
  menu?.setAttribute("aria-hidden", String(!open));
  menuToggle?.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
  if (pageMain) pageMain.inert = open;
  if (pageFooter) pageFooter.inert = open;
  if (header) header.inert = open;

  const label = menuToggle?.querySelector(".sr-only");
  if (label) label.textContent = open ? "Fechar menu" : "Abrir menu";
  if (open) menuClose?.focus();
}

menuToggle?.addEventListener("click", () => setMenu(true));
menuClose?.addEventListener("click", () => {
  setMenu(false);
  menuToggle?.focus();
});
menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));

document.addEventListener("keydown", (event) => {
  if (!menu?.classList.contains("open")) return;

  if (event.key === "Escape") {
    setMenu(false);
    menuToggle?.focus();
    return;
  }

  if (event.key === "Tab") {
    const focusable = [...menu.querySelectorAll("a, button")].filter((element) => !element.hasAttribute("disabled"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

document.querySelectorAll(".capability-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const item = trigger.closest(".capability-item");
    const detail = item?.querySelector(".capability-detail");
    const isOpen = trigger.getAttribute("aria-expanded") === "true";

    document.querySelectorAll(".capability-trigger").forEach((other) => {
      if (other === trigger) return;
      other.setAttribute("aria-expanded", "false");
      const otherDetail = other.closest(".capability-item")?.querySelector(".capability-detail");
      if (otherDetail) otherDetail.hidden = true;
    });

    trigger.setAttribute("aria-expanded", String(!isOpen));
    if (detail) detail.hidden = isOpen;

    if (!isOpen) {
      trackEvent("capability_open", {
        capability: trigger.querySelector(".cap-title")?.textContent?.trim() || "unspecified"
      });
    }
  });
});

const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !reduceMotion.matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: "0px 0px -42px" });
  reveals.forEach((element) => observer.observe(element));
} else {
  reveals.forEach((element) => element.classList.add("visible"));
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());
