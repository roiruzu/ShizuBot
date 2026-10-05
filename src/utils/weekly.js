function getWeekKey(date = new Date(), timezone = "Europe/Istanbul") {
  // Europe/Istanbul UTC+3; weekly reset is defined in Istanbul local time.
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);

  const localDay = shifted.getUTCDay();
  const diff = localDay === 0 ? -6 : 1 - localDay;
  shifted.setUTCDate(shifted.getUTCDate() + diff);

  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function getIstanbulNow() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000);
}

function isResetWindow(date = getIstanbulNow()) {
  return (
    date.getUTCDay() === 0 &&
    date.getUTCHours() === 23 &&
    date.getUTCMinutes() === 59
  );
}

module.exports = {
  getWeekKey,
  getIstanbulNow,
  isResetWindow
};
