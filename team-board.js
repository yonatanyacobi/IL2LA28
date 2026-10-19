'use strict';

(() => {
  const statuses = new Map([['backlog', 'בתכנון'], ['in_progress', 'בעבודה'], ['review', 'בבדיקה'], ['done', 'הושלם'], ['blocked', 'ממתין לפתרון']]);
  const priorities = new Map([['P0', 'דחוף'], ['P1', 'גבוהה'], ['P2', 'רגילה']]);
  const formatter = new Intl.DateTimeFormat('he-IL', {timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short'});
  const el = id => document.getElementById(id);
  let board = null;
  let loading = false;
  let lastChecked = null;
  let failed = false;
  const node = (tag, text, className) => {
    const result = document.createElement(tag);
    if (text !== undefined) result.textContent = text;
    if (className) result.className = className;
    return result;
  };
  const validText = (value, max = 2000) => typeof value === 'string' && value.length <= max;
  const validDate = value => validText(value, 40) && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function validate(data) {
    if (!record(data) || data.schemaVersion !== 1 || !validDate(data.updatedAt) || !record(data.company) ||
        !['name', 'mission', 'cadence', 'status'].every(key => validText(data.company[key])) ||
        !Array.isArray(data.team) || data.team.length > 100 || !Array.isArray(data.tasks) || data.tasks.length > 1000) throw new Error('Invalid board');
    const ids = new Set();
    for (const person of data.team) {
      if (!record(person) || !['id', 'name', 'role', 'responsibility'].every(key => validText(person[key])) || !person.id || ids.has(person.id)) throw new Error('Invalid team');
      ids.add(person.id);
    }
    const taskIds = new Set();
    for (const task of data.tasks) {
      if (!record(task) || !['id', 'title', 'assignee', 'description', 'acceptance', 'evidence'].every(key => validText(task[key])) ||
          !task.id || taskIds.has(task.id) || !statuses.has(task.status) || !priorities.has(task.priority) || !ids.has(task.assignee) || !validDate(task.updatedAt)) throw new Error('Invalid task');
      taskIds.add(task.id);
    }
    return data;
  }

  function connection() {
    const stale = board && Date.now() - Date.parse(board.updatedAt) > 24 * 60 * 60 * 1000;
    el('signal').dataset.state = failed ? 'error' : stale ? 'waiting' : board ? 'connected' : 'waiting';
    el('connection').textContent = failed
      ? 'לא ניתן לבדוק עדכונים. מוצג הדיווח האחרון שנטען, אם ישנו.'
      : board ? `${stale ? 'הדיווח לא עודכן יותר מ־24 שעות. ' : ''}בדיקת חיבור אחרונה: ${formatter.format(lastChecked)}`
        : 'טוענים את לוח המשימות…';
  }

  function render() {
    if (!board) return;
    const people = new Map(board.team.map(person => [person.id, person]));
    el('mission').textContent = board.company.mission;
    el('schedule').textContent = `${board.company.status} ${board.company.cadence} הלוח בודק גרסה חדשה בכל 30 שניות.`;
    el('updated').textContent = `עדכון תוכן אחרון: ${formatter.format(new Date(board.updatedAt))}`;
    const ownerSelect = el('assignee');
    const previousOwner = ownerSelect.value;
    ownerSelect.replaceChildren(node('option', 'כל הצוות'));
    ownerSelect.firstChild.value = '';
    for (const person of board.team) {
      const option = node('option', person.role);
      option.value = person.id;
      ownerSelect.append(option);
    }
    if (people.has(previousOwner)) ownerSelect.value = previousOwner;
    const done = board.tasks.filter(task => task.status === 'done').length;
    el('summary').replaceChildren(...[[board.tasks.length, 'משימות בלוח'], [board.tasks.filter(task => task.status === 'in_progress').length, 'משימות בעבודה'], [done, 'משימות שהושלמו'], [board.team.length, 'תפקידים בצוות']].map(([value, label]) => {
      const stat = node('div', undefined, 'stat');
      stat.append(node('strong', String(value)), node('span', label));
      return stat;
    }));
    const visibleTasks = board.tasks.filter(task => (!ownerSelect.value || task.assignee === ownerSelect.value) && (!el('status').value || task.status === el('status').value));
    const columns = [];
    for (const [status, label] of statuses) {
      if (el('status').value && el('status').value !== status) continue;
      const tasks = visibleTasks.filter(task => task.status === status);
      const column = node('section', undefined, 'column');
      column.setAttribute('aria-label', label);
      const heading = node('h3', label);
      heading.append(node('span', String(tasks.length), 'count'));
      column.append(heading);
      if (!tasks.length) column.append(node('p', 'אין משימות במצב זה', 'column-empty'));
      for (const task of tasks) {
        const card = node('article', undefined, 'card');
        const top = node('div', undefined, 'card-top');
        top.append(node('span', task.id, 'task-id'), node('span', `עדיפות ${priorities.get(task.priority)}`, 'priority'));
        card.append(top, node('h4', task.title), node('p', task.description), node('p', people.get(task.assignee).role, 'owner'));
        const details = node('details');
        details.append(node('summary', 'תנאי קבלה וראיות'), node('p', `תנאי קבלה: ${task.acceptance}`), node('p', `ראיות: ${task.evidence || 'טרם תועדו'}`));
        const time = node('time', `עודכן: ${formatter.format(new Date(task.updatedAt))}`);
        time.dateTime = task.updatedAt;
        card.append(details, time);
        column.append(card);
      }
      columns.push(column);
    }
    el('board').replaceChildren(...columns);
    el('empty').hidden = visibleTasks.length > 0;
    el('team').replaceChildren(...board.team.map(person => {
      const card = node('article', undefined, 'person');
      card.append(node('h3', person.role), node('strong', person.name), node('p', person.responsibility));
      return card;
    }));
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    el('refresh').disabled = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('team-board.json', {cache: 'no-store', credentials: 'same-origin', signal: controller.signal});
      if (!response.ok) throw new Error('Board unavailable');
      const next = validate(await response.json());
      const changed = JSON.stringify(next) !== JSON.stringify(board);
      board = next;
      lastChecked = new Date();
      failed = false;
      if (changed) render();
    } catch (_) {
      failed = true;
    } finally {
      clearTimeout(timeout);
      loading = false;
      el('refresh').disabled = false;
      connection();
    }
  }
  el('refresh').addEventListener('click', refresh);
  el('assignee').addEventListener('change', render);
  el('status').addEventListener('change', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  setInterval(() => { if (!document.hidden) refresh(); }, 30000);
  refresh();
})();
