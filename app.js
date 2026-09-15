const form = document.querySelector('#rota-form');
const errorField = document.querySelector('#form-error');
const result = document.querySelector('#result');
const weeks = document.querySelector('#weeks');
let currentPlan = [];

function mondayOf(value) {
  const date = new Date(`${value}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime()) || localDate(date) !== value) {
    throw new Error('Choose a valid first week.');
  }
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return date;
}

function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseItems(value, separator, max, label) {
  const items = value.split(separator).map(item => item.trim()).filter(Boolean);
  if (items.length < 1 || items.length > max) {
    throw new Error(`Add between one and ${max} ${label}.`);
  }
  if (items.some(item => item.length > 80)) {
    throw new Error(`Keep each ${label.slice(0, -1)} under 81 characters.`);
  }
  return items;
}

function buildPlan(people, chores, firstMonday) {
  return Array.from({ length: 4 }, (_, weekIndex) => {
    const monday = new Date(firstMonday);
    monday.setDate(monday.getDate() + weekIndex * 7);
    return {
      monday,
      assignments: chores.map((chore, choreIndex) => ({
        chore,
        person: people[(choreIndex + weekIndex) % people.length],
      })),
    };
  });
}

function renderPlan(plan) {
  weeks.replaceChildren();
  const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  plan.forEach((week, index) => {
    const card = document.createElement('article');
    card.className = 'week-card';
    const header = document.createElement('div');
    header.className = 'week-header';
    const title = document.createElement('strong');
    title.textContent = `Week ${String(index + 1).padStart(2, '0')}`;
    const date = document.createElement('time');
    date.dateTime = localDate(week.monday);
    date.textContent = dateFormatter.format(week.monday);
    header.append(title, date);
    card.append(header);
    week.assignments.forEach(assignment => {
      const row = document.createElement('div');
      row.className = 'week-row';
      const chore = document.createElement('span');
      chore.textContent = assignment.chore;
      const person = document.createElement('b');
      person.textContent = assignment.person;
      row.append(chore, person);
      card.append(row);
    });
    weeks.append(card);
  });
}

function csvCell(value) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

form.addEventListener('submit', event => {
  event.preventDefault();
  errorField.textContent = '';
  try {
    const people = parseItems(form.elements.people.value, ',', 8, 'people');
    if (new Set(people.map(person => person.toLocaleLowerCase())).size !== people.length) {
      throw new Error('Use a different name for each person.');
    }
    const chores = parseItems(form.elements.chores.value, /\r?\n/, 30, 'chores');
    const monday = mondayOf(form.elements.week.value);
    currentPlan = buildPlan(people, chores, monday);
    renderPlan(currentPlan);
    result.hidden = false;
    result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  } catch (error) {
    currentPlan = [];
    result.hidden = true;
    errorField.textContent = error.message;
  }
});

document.querySelector('#print').addEventListener('click', () => window.print());

document.querySelector('#download').addEventListener('click', () => {
  if (!currentPlan.length) return;
  const rows = [['Week', 'Starting Monday', 'Chore', 'Person']];
  currentPlan.forEach((week, index) => {
    week.assignments.forEach(assignment => {
      rows.push([String(index + 1), localDate(week.monday), assignment.chore, assignment.person]);
    });
  });
  const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `rotalantern-${localDate(currentPlan[0].monday)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

form.elements.chores.value = 'Kitchen\nBathroom\nFloors\nBins';
form.elements.week.value = localDate(mondayOf(localDate(new Date())));
