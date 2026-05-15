const formatScore = (value) => {
  if (value === null || value === undefined) {
    return "—";
  }
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
};

const buildCard = (item, index, score) => {
  const li = document.createElement("li");
  li.className = "rating-card";

  const rank = document.createElement("div");
  rank.className = "rating-rank";
  rank.textContent = String(index + 1);

  const name = document.createElement("div");
  name.className = "rating-name";
  name.textContent = item.name;

  const value = document.createElement("div");
  value.className = "rating-score";
  value.textContent = formatScore(score);

  li.append(rank, name, value);
  return li;
};

export const renderRatings = (target, items, categoryId, limit) => {
  target.innerHTML = "";

  const filtered = items
    .map((item) => {
      const score =
        categoryId === "agenda" ? null : item.scores[categoryId];
      return { ...item, score };
    })
    .sort((a, b) => {
      const aScore = a.score ?? -Infinity;
      const bScore = b.score ?? -Infinity;
      if (bScore === aScore) {
        return a.name.localeCompare(b.name, "ru");
      }
      return bScore - aScore;
    });

  const visible =
    limit === "all" ? filtered : filtered.slice(0, Number(limit));

  visible.forEach((item, index) => {
    target.append(buildCard(item, index, item.score));
  });

  return {
    total: filtered.length,
    shown: visible.length,
  };
};

export const updateResultCount = (element, count) => {
  element.textContent = `${count} вузов`;
};
