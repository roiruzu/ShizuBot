function getLocalParts(date, timezone="Europe/Istanbul") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year:"numeric", month:"2-digit", day:"2-digit",
    weekday:"short", hour:"2-digit", minute:"2-digit", hourCycle:"h23"
  }).formatToParts(date);
  const out={};
  for(const p of parts) if(p.type!=="literal") out[p.type]=p.value;
  return out;
}

function getWeekKey(date=new Date(), timezone="Europe/Istanbul") {
  const p=getLocalParts(date,timezone);
  const base=new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)));
  const day=base.getUTCDay();
  const diff=day===0 ? -6 : 1-day;
  base.setUTCDate(base.getUTCDate()+diff);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth()+1).padStart(2,"0")}-${String(base.getUTCDate()).padStart(2,"0")}`;
}

function isResetWindow(date=new Date(), timezone="Europe/Istanbul") {
  const p=getLocalParts(date,timezone);
  const weekday=new Intl.DateTimeFormat("en-US",{timeZone:timezone,weekday:"short"}).format(date);
  return weekday === "Sun" && Number(p.hour) === 23 && Number(p.minute) === 59;
}

function getIstanbulNow(){return new Date();}
module.exports={getWeekKey,getLocalParts,isResetWindow,getIstanbulNow};
