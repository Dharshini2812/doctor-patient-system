// Config: adjust to your server
const SERVER_WS_URL = (localStorage.getItem('WS_URL')) || 'ws://localhost:8080/chat';

// Basic setup
const doctor = { id: 'doctor-1', name: 'Dr. Kristina Patel', online: true };
let patientsSeed = [];

const state = {
  activePatientId: null,
  messages: {}, // { patientId: [ { from:'doctor'|'patient', text, ts } ] }
};

const $ = (sel) => document.querySelector(sel);
const patientsEl = $('#patients');
const messagesEl = $('#messages');
const inputEl = $('#message-input');
const sendBtn = $('#send-btn');
const typingEl = $('#typing-indicator');
const activePatientNameEl = $('#active-patient-name');

// Render patients list
function renderPatients(patients){
  patientsEl.innerHTML = '';
  for(const p of patients){
    const li = document.createElement('li');
    li.className = 'patient' + (p.id === state.activePatientId ? ' active' : '');
    li.dataset.id = p.id;
    li.innerHTML = `
      <div class="avatar" data-initials="${p.initials}"></div>
      <div class="name">${p.name}</div>
      <span class="presence"><span class="dot ${p.online ? 'online' : 'offline'}"></span>${p.online ? 'Online' : 'Offline'}</span>
    `;
    li.addEventListener('click', () => switchActivePatient(p.id));
    patientsEl.appendChild(li);
  }
}

function switchActivePatient(patientId){
  state.activePatientId = patientId;
  activePatientNameEl.textContent = getPatient(patientId).name;
  renderPatients(patientsSeed);
  renderMessages();
}

function getPatient(id){
  return patientsSeed.find(p => p.id === id);
}

// Render chat messages
function renderMessages(){
  if(!state.activePatientId) return;
  const msgs = state.messages[state.activePatientId] || [];
  messagesEl.innerHTML = '';
  for(const m of msgs){
    const wrap = document.createElement('div');
    wrap.className = `msg ${m.from}`;
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.dataset.initials = m.from === 'doctor' ? 'KP' : getPatient(state.activePatientId).initials;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = m.text;

    const time = document.createElement('div');
    time.className = 'meta';
    time.textContent = new Date(m.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    wrap.appendChild(avatar);
    wrap.appendChild(bubble);
    wrap.appendChild(time);
    messagesEl.appendChild(wrap);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// Messaging actions
function pushMessage(patientId, from, text){
  if(!state.messages[patientId]) state.messages[patientId] = [];
  state.messages[patientId].push({ from, text, ts: Date.now() });
  if(patientId === state.activePatientId) renderMessages();
}

// WebSocket client
let ws;
let typingTimer;
function connect(){
  try{
    ws = new WebSocket(`${SERVER_WS_URL}?doctorId=${encodeURIComponent(doctor.id)}`);
  }catch(err){
    console.error('Failed to create WebSocket:', err);
    return;
  }

  ws.addEventListener('open', () => {
    console.log('Connected');
  });

  ws.addEventListener('message', (evt) => {
    let data;
    try{ data = JSON.parse(evt.data); } catch{ return; }
    switch(data.type){
      case 'seed': {
        // Transform backend data into UI-ready format
        patientsSeed = (data.patients || []).map(p => ({
          id: p.id,
          name: p.name,
          online: (p.status || 'offline') !== 'offline',
          initials: p.name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()
        }));
        state.messages = {};
        for(const p of data.patients || []){
          const history = [];
          for(const m of (p.messages||[])){
            history.push({ from: 'patient', text: m.message, ts: Date.parse(m.timestamp) || Date.now() });
          }
          state.messages[p.id] = history;
        }
        // set initial active patient
        if(patientsSeed.length){
          state.activePatientId = patientsSeed[0].id;
          activePatientNameEl.textContent = patientsSeed[0].name;
        }
        renderPatients(patientsSeed);
        renderMessages();
        break;
      }
      case 'message': {
        const { from, to, text } = data;
        const patientId = from.startsWith('p') ? from : to;
        pushMessage(patientId, from === doctor.id ? 'doctor' : 'patient', text);
        break;
      }
      case 'typing': {
        if(data.userId === state.activePatientId){
          typingEl.hidden = !data.isTyping;
          if(data.isTyping){
            clearTimeout(typingTimer);
            typingTimer = setTimeout(()=> typingEl.hidden = true, 2000);
          }
        }
        break;
      }
      case 'presence': {
        const p = getPatient(data.userId);
        if(p){ p.online = !!data.online; renderPatients(patientsSeed); }
        break;
      }
      default: break;
    }
  });

  ws.addEventListener('close', () => {
    console.warn('Disconnected. Reconnecting in 2s…');
    setTimeout(connect, 2000);
  });
}

function sendChat(text){
  if(!text.trim()) return;
  const payload = {
    type: 'message',
    from: doctor.id,
    to: state.activePatientId,
    text
  };
  try{ ws && ws.readyState === 1 && ws.send(JSON.stringify(payload)); }catch{}
  pushMessage(state.activePatientId, 'doctor', text);
}

function sendTyping(isTyping){
  const payload = { type:'typing', userId: doctor.id, to: state.activePatientId, isTyping: !!isTyping };
  try{ ws && ws.readyState === 1 && ws.send(JSON.stringify(payload)); }catch{}
}

// UI events
sendBtn.addEventListener('click', () => {
  const text = inputEl.value;
  inputEl.value = '';
  sendTyping(false);
  sendChat(text);
});

inputEl.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){
    e.preventDefault();
    sendBtn.click();
  }else{
    sendTyping(true);
  }
});

inputEl.addEventListener('input', () => {
  if(inputEl.value.trim().length === 0) sendTyping(false);
});

// Init
renderPatients(patientsSeed);
renderMessages();
connect();


