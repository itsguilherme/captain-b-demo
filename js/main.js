/* Captain B LLC — demo site behaviour. No backend: the estimate form validates and
   goes to the thank-you page. Before launch, point FORM_ENDPOINT at the agency
   booking-backend (browser -> booking-backend -> CRM) and add the real GA4 / Meta IDs. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var FORM_ENDPOINT = ""; // TODO before launch: booking-backend lead endpoint. Empty = demo mode.
  window.dataLayer = window.dataLayer || [];
  function track(event, data) {
    var payload = Object.assign({ event: event }, data || {});
    window.dataLayer.push(payload);
    // TODO before launch: gtag('event', ...) for GA4 and fbq('track', 'Lead') for the Meta Pixel.
  }

  /* ---- mobile menu ---- */
  var menuBtn = document.querySelector("[data-menu-open]");
  var panel = document.getElementById("menu");
  var lastFocus = null;
  function setMenu(open) {
    if (!panel) return;
    panel.dataset.open = open ? "true" : "false";
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { lastFocus = document.activeElement; var f = panel.querySelector("button, a"); if (f) f.focus(); }
    else if (lastFocus) { lastFocus.focus(); }
  }
  if (menuBtn && panel) {
    menuBtn.addEventListener("click", function () { setMenu(true); });
    panel.querySelectorAll("[data-menu-close], nav a, .menu-panel__foot a").forEach(function (el) {
      el.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.dataset.open === "true") setMenu(false); });
  }

  /* ---- reveal on enter (content stays visible without JS) ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.dataset.in = "true"; io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.dataset.in = "true"; });
  }

  /* ---- mobile action bar: show after the hero, hide over the form ---- */
  var bar = document.querySelector(".action-bar");
  var hero = document.querySelector(".hero, .page-top");
  var est = document.getElementById("estimate");
  if (bar && "IntersectionObserver" in window) {
    var pastHero = false, formVisible = false;
    function syncBar() { var on = pastHero && !formVisible; bar.dataset.show = on ? "true" : "false"; document.body.dataset.bar = on ? "true" : "false"; }
    if (hero) new IntersectionObserver(function (e) { pastHero = !e[0].isIntersecting; syncBar(); }, { threshold: 0.05 }).observe(hero);
    var card = est;
    if (card) new IntersectionObserver(function (e) { formVisible = e[0].isIntersecting; syncBar(); }, { threshold: 0.15 }).observe(card);
  }

  /* ---- project filmstrip controls ---- */
  document.querySelectorAll("[data-strip]").forEach(function (wrap) {
    var strip = wrap.querySelector(".strip");
    var prev = wrap.querySelector("[data-prev]");
    var next = wrap.querySelector("[data-next]");
    if (!strip || !prev || !next) return;
    function step(dir) {
      var fig = strip.querySelector("figure");
      var w = fig ? fig.getBoundingClientRect().width + 20 : strip.clientWidth * 0.75;
      strip.scrollBy({ left: dir * w, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    function sync() {
      prev.disabled = strip.scrollLeft < 8;
      next.disabled = strip.scrollLeft + strip.clientWidth > strip.scrollWidth - 8;
    }
    prev.addEventListener("click", function () { step(-1); });
    next.addEventListener("click", function () { step(1); });
    strip.addEventListener("scroll", function () { window.requestAnimationFrame(sync); }, { passive: true });
    sync();
  });

  /* ---- service links preselect the project type in the estimate form ---- */
  var form = document.getElementById("estimate-form");
  function selectType(type) {
    if (!form) return;
    var sel = form.querySelector('select[name="project_type"]');
    if (sel && sel.querySelector('option[value="' + type + '"]')) { sel.value = type; clearErr(form.querySelector('[data-field="project_type"]')); }
  }
  if (form) {
    document.querySelectorAll("a[data-type]").forEach(function (a) {
      a.addEventListener("click", function () { selectType(a.dataset.type); track("estimate_cta_click", { project_type: a.dataset.type }); });
    });
    var qp = new URLSearchParams(location.search).get("type");
    if (qp) selectType(qp);
  }

  /* ---- form validation + demo submit ---- */
  function setErr(field, on) { if (field) field.dataset.invalid = on ? "true" : "false"; }
  function clearErr(field) { setErr(field, false); }
  if (form) {
    form.setAttribute("novalidate", "");
    var phoneDigits = function (v) { return (v || "").replace(/\D/g, ""); };
    form.addEventListener("input", function (e) {
      var f = e.target.closest("[data-field]");
      if (f && f.dataset.invalid === "true") clearErr(f);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, first = null;
      function check(name, valid) {
        var field = form.querySelector('[data-field="' + name + '"]');
        setErr(field, !valid);
        if (!valid) { ok = false; if (!first) first = field; }
      }
      var data = new FormData(form);
      check("project_type", !!data.get("project_type"));
      check("name", (data.get("name") || "").trim().length >= 2);
      var d = phoneDigits(data.get("phone"));
      check("phone", d.length === 10 || (d.length === 11 && d[0] === "1"));
      check("zip", /^\d{5}$/.test((data.get("zip") || "").trim()));
      var em = (data.get("email") || "").trim();
      check("email", !em || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));
      if (!ok) {
        var target = first.querySelector("input, select, textarea");
        if (target) target.focus();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      btn.setAttribute("aria-busy", "true");
      var label = btn.textContent;
      btn.textContent = btn.dataset.sending || "Sending your request";
      track("generate_lead", { project_type: data.get("project_type"), form: form.dataset.formName || "estimate", language: document.documentElement.lang });
      var thanks = form.getAttribute("action") || "thank-you/";
      if (!FORM_ENDPOINT) { window.location.href = thanks; return; } // demo mode: nothing is sent anywhere
      fetch(FORM_ENDPOINT, { method: "POST", body: data })
        .then(function (r) { if (!r.ok) throw new Error(r.status); window.location.href = thanks; })
        .catch(function () {
          btn.removeAttribute("aria-busy");
          btn.textContent = label;
          var fail = form.querySelector("[data-send-error]");
          if (fail) fail.hidden = false;
        });
    });
  }


  /* ---- header shadow once the page scrolls ---- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.dataset.scrolled = window.scrollY > 8 ? "true" : "false"; };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---- services dropdown (hover on desktop, click/keyboard everywhere) ---- */
  document.querySelectorAll(".dd").forEach(function (dd) {
    var btn = dd.querySelector(".dd__btn");
    var closeT;
    function set(open) { dd.dataset.open = open ? "true" : "false"; btn.setAttribute("aria-expanded", open ? "true" : "false"); }
    btn.addEventListener("click", function () { set(dd.dataset.open !== "true"); });
    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      dd.addEventListener("mouseenter", function () { clearTimeout(closeT); set(true); });
      dd.addEventListener("mouseleave", function () { closeT = setTimeout(function () { set(false); }, 160); });
    }
    dd.addEventListener("keydown", function (e) { if (e.key === "Escape") { set(false); btn.focus(); } });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) set(false); });
    dd.addEventListener("focusout", function (e) { if (!dd.contains(e.relatedTarget)) set(false); });
  });

  /* ---- auto carousel ---- */
  document.querySelectorAll("[data-carousel]").forEach(function (c) {
    var slides = c.querySelectorAll("img[data-slide]");
    var dots = c.querySelectorAll("[data-go]");
    var i = 0, timer = null;
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.dataset.active = k === i ? "true" : "false"; if (k === (i + 1) % slides.length) s.loading = "eager"; });
      dots.forEach(function (d, k) { if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
    }
    function start() { if (!reduce && !timer) timer = setInterval(function () { go(i + 1); }, 4200); }
    function stop() { clearInterval(timer); timer = null; }
    dots.forEach(function (d) { d.addEventListener("click", function () { stop(); go(+d.dataset.go); start(); }); });
    c.addEventListener("mouseenter", stop); c.addEventListener("mouseleave", start);
    c.addEventListener("focusin", stop); c.addEventListener("focusout", start);
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    start();
  });

  /* ---- WhatsApp click tracking ---- */
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(function (a) {
    a.addEventListener("click", function () { track("click_whatsapp", { location: a.dataset.where || "page" }); });
  });

  /* ---- call tracking hook ---- */
  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener("click", function () { track("click_to_call", { location: a.dataset.where || "page" }); });
  });

  var y = document.querySelectorAll("[data-year]");
  y.forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
