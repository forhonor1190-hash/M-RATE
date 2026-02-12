import { APP_CONFIG } from "./config.js";

const normalizeName = (value) => String(value || "").trim();

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "number" && Number.isNaN(value)) {
    return null;
  }
  const normalized = String(value).replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const computeSocialTotal = (row, columns) => {
  const values = columns
    .map((col) => parseNumber(row[col]))
    .filter((val) => val !== null);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, val) => sum + val, 0);
};

const withCacheBust = (url) => {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
};

const fetchJson = async (url) => {
  const response = await fetch(withCacheBust(url));
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${url}`);
  }
  return response.json();
};

const fetchWorkbook = async (url) => {
  if (!window.XLSX) {
    throw new Error("XLSX не найден");
  }
  const response = await fetch(withCacheBust(url));
  if (!response.ok) {
    throw new Error(`Не удалось загрузить ${url}`);
  }
  const data = await response.arrayBuffer();
  return window.XLSX.read(data, { type: "array" });
};

const buildItemsFromRows = (rows, universities, allowed) => {
  const rowsMap = new Map();
  rows.forEach((row) => {
    const name = normalizeName(row["Вуз"]);
    if (name) {
      rowsMap.set(name, row);
    }
  });

  return universities
    .map((name) => {
      const normalized = normalizeName(name);
      if (!allowed.has(normalized)) {
        return null;
      }
      const row = rowsMap.get(normalized) || {};
      const scores = {};
      APP_CONFIG.categories.forEach((category) => {
        scores[category.id] = parseNumber(row[category.column]);
      });
      if (scores.social === null) {
        scores.social = computeSocialTotal(row, [
          "ВКонтакте",
          "Telegram",
          "MAX",
          "Rutube",
        ]);
      }
      return { name: normalized, scores };
    })
    .filter(Boolean);
};

const buildMonthsFromWorkbook = (workbook, universities, allowed) => {
  const sheetNames = workbook.SheetNames;
  const fallbackSheet = workbook.Sheets[sheetNames[0]];
  const fallbackRows = window.XLSX.utils.sheet_to_json(fallbackSheet, {
    defval: "",
  });

  return APP_CONFIG.months.map((monthName, index) => {
    const sheetName = sheetNames.find(
      (name) => name.toLowerCase() === monthName.toLowerCase()
    );
    const sheet = sheetName ? workbook.Sheets[sheetName] : fallbackSheet;
    const rows = sheetName
      ? window.XLSX.utils.sheet_to_json(sheet, { defval: "" })
      : fallbackRows;

    return {
      name: monthName,
      number: index + 1,
      items: buildItemsFromRows(rows, universities, allowed),
    };
  });
};

export const loadRatingsData = async () => {
  const universities = await fetchJson(APP_CONFIG.data.universities);
  const allowed = new Set(universities.map(normalizeName));

  const preferExcel = window.location.protocol === "file:";

  const loadFromExcel = async () => {
    const workbook = await fetchWorkbook(APP_CONFIG.data.ratingsXlsx);
    return {
      year: APP_CONFIG.year,
      months: buildMonthsFromWorkbook(workbook, universities, allowed),
    };
  };

  const loadFromJson = async () => {
    const ratings = await fetchJson(APP_CONFIG.data.ratingsJson);
    const socialColumns = ["vk", "tg", "ok", "rt"];

    const months = ratings.months.map((month) => {
      const items = month.items
        .map((row) => {
          const normalized = normalizeName(row.name);
          if (!allowed.has(normalized)) {
            return null;
          }
          const scores = {};
          APP_CONFIG.categories.forEach((category) => {
            scores[category.id] = parseNumber(row.scores?.[category.id]);
          });
          if (scores.social === null) {
            scores.social = computeSocialTotal(row.scores || {}, socialColumns);
          }
          return { name: normalized, scores };
        })
        .filter(Boolean);

      return {
        name: month.name,
        number: month.number,
        items,
      };
    });

    return {
      year: ratings.year,
      months,
    };
  };

  try {
    return preferExcel ? await loadFromExcel() : await loadFromJson();
  } catch (error) {
    return preferExcel ? await loadFromJson() : await loadFromExcel();
  }
};
