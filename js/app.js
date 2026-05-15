import { APP_CONFIG } from "./config.js";
import { loadRatingsData } from "./data-loader.js";
import { renderRatings, updateResultCount } from "./ui.js";

const state = {
  data: null,
  category: "consolidated",
  limit: 5,
  query: "",
  monthIndex:
    typeof APP_CONFIG.defaultMonthIndex === "number"
      ? APP_CONFIG.defaultMonthIndex
      : typeof APP_CONFIG.actualMonthIndex === "number"
        ? APP_CONFIG.actualMonthIndex
        : 0,
};

const applyContactLinks = () => {
  document.querySelectorAll("[data-contact-link]").forEach((link) => {
    link.setAttribute("href", APP_CONFIG.contactUrl);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener");
  });
};

const filterData = () => {
  const query = state.query.toLowerCase();
  const items = state.data?.months?.[state.monthIndex]?.items || [];
  if (!query) {
    return items;
  }
  return items.filter((item) =>
    item.name.toLowerCase().includes(query)
  );
};

const renderMessage = (list, message) => {
  list.innerHTML = `<li class="rating-card">${message}</li>`;
};

const updateList = () => {
  const list = document.getElementById("ratingList");
  const resultCount = document.getElementById("resultCount");
  if (!list || !resultCount) {
    return;
  }

  const filtered = filterData();
  if (!filtered.length) {
    renderMessage(list, "Данные не найдены.");
    updateResultCount(resultCount, 0);
    return;
  }

  const { total } = renderRatings(list, filtered, state.category, state.limit);
  updateResultCount(resultCount, total);
};

const setActiveYear = () => {
  const yearEl = document.getElementById("activeYear");
  const periodEl = document.getElementById("activePeriod");
  const month = state.data?.months?.[state.monthIndex]?.name || APP_CONFIG.months[0];
  const year = state.data?.year || APP_CONFIG.year;
  if (yearEl) yearEl.textContent = String(year);
  if (periodEl) periodEl.textContent = `${month} ${year}`;
};

const setupSearch = () => {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    updateList();
  });
};

const setupMonths = () => {
  const menu = document.getElementById("monthMenu");
  const toggle = document.getElementById("monthToggle");
  if (!menu) return;

  const months = state.data?.months?.length
    ? state.data.months
    : APP_CONFIG.months.map((name, index) => ({ name, number: index + 1, items: [] }));

  menu.innerHTML = "";
  const actualIndex =
    typeof APP_CONFIG.actualMonthIndex === "number"
      ? APP_CONFIG.actualMonthIndex
      : months.length - 1;

  if (state.monthIndex < 0 || state.monthIndex >= months.length) {
    state.monthIndex =
      typeof APP_CONFIG.defaultMonthIndex === "number" ? APP_CONFIG.defaultMonthIndex : 0;
  }

  months.forEach((month, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "month-option";
    button.textContent = month.name;
    button.dataset.index = String(index);
    if (index === state.monthIndex) {
      button.classList.add("active");
      if (toggle) {
        toggle.textContent = month.name;
      }
    }
    if (index === actualIndex) {
      button.classList.add("is-actual");
    }
    button.addEventListener("click", () => {
      state.monthIndex = index;
      if (toggle) {
        toggle.textContent = month.name;
      }
      menu.querySelectorAll(".month-option").forEach((el) =>
        el.classList.toggle("active", el.dataset.index === String(index))
      );
      menu.classList.remove("is-open");
      setActiveYear();
      updateList();
    });
    menu.append(button);
  });

  if (toggle) {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.toggle("is-open");
    });
    menu.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    document.addEventListener("click", () => {
      menu.classList.remove("is-open");
    });
  }
};

const setupTabs = () => {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const { tab } = event.currentTarget.dataset;
      if (!tab) return;
      state.category = tab;
      const category = APP_CONFIG.categories.find((item) => item.id === tab);
      const parentId = category?.parent;
      const openSocial = tab === "social" || parentId === "social";

      document.querySelectorAll(".tab-button, .tab-subbutton").forEach((el) => {
        el.classList.toggle("active", el.dataset.tab === tab);
        el.classList.toggle("is-parent-active", parentId && el.dataset.tab === parentId);
      });

      document.querySelectorAll(".tab-group").forEach((group) => {
        const groupTab = group.dataset.tab;
        group.classList.toggle("is-open", openSocial && groupTab === "social");
      });
      updateList();
    });
  });

  document.querySelectorAll(".tab-group").forEach((group) => {
    const groupButton = group.querySelector(".tab-button");
    if (!groupButton) return;
    groupButton.addEventListener("click", (event) => {
      if (group.dataset.tab !== "social") return;
      event.stopPropagation();
      group.classList.toggle("is-open");
    });

    const submenu = group.querySelector(".tab-submenu");
    if (submenu) {
      submenu.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".tab-group")) {
      return;
    }
    document.querySelectorAll(".tab-group").forEach((group) => {
      group.classList.remove("is-open");
    });
  });
};

const setupLimits = () => {
  document.querySelectorAll(".limit-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      const { limit } = event.currentTarget.dataset;
      state.limit = limit === "all" ? "all" : Number(limit);
      document
        .querySelectorAll(".limit-button")
        .forEach((el) =>
          el.classList.toggle(
            "active",
            el.dataset.limit === String(limit)
          )
        );
      updateList();
    });
  });
};

const init = async () => {
  document.body.classList.add("page-transition");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add("is-loaded");
    });
  });

  applyContactLinks();

  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href") || "";
      const isAnchor = href.startsWith("#");
      const isExternal = link.target === "_blank" || link.rel?.includes("noopener");
      if (isAnchor || isExternal || href === "") {
        return;
      }
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }
      event.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(() => {
        window.location.href = href;
      }, 220);
    });
  });

  window.addEventListener("pageshow", () => {
    document.body.classList.remove("is-leaving");
  });
  setActiveYear();
  setupSearch();
  setupTabs();
  setupLimits();

  try {
    const hasRating = document.getElementById("ratingList");
    if (hasRating) {
      state.data = await loadRatingsData();
      setupMonths();
      setActiveYear();
      updateList();
    }
  } catch (error) {
    const list = document.getElementById("ratingList");
    if (list) {
      const hint =
        window.location.protocol === "file:"
          ? "Для загрузки данных откройте сайт через локальный сервер."
          : "Не удалось загрузить данные.";
      renderMessage(list, hint);
    }
  }
};

init();
