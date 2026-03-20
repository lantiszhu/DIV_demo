/* ========================================
   血管卫士：生死时速 - Game Engine
   ======================================== */

// ==================== Game State ====================
const GameState = {
  playerName: '',
  score: 100,
  deductionLog: [],
  currentLevel: null,
  gameStartTime: null,
  // Level 1 state
  l1: { found: new Set(), timerInterval: null, timeLeft: 30, paused: false },
  // Level 2 state
  l2: { disabledChoices: new Set() },
  // Level 3 state
  l3: { filledSlots: {}, timerInterval: null, timeLeft: 30, completed: 0 },
};

function resetState() {
  GameState.score = 100;
  GameState.deductionLog = [];
  GameState.currentLevel = null;
  GameState.gameStartTime = Date.now();
  GameState.l1 = { found: new Set(), timerInterval: null, timeLeft: 30, paused: false };
  GameState.l2 = { disabledChoices: new Set() };
  GameState.l3 = { filledSlots: {}, timerInterval: null, timeLeft: 30, completed: 0 };
}

// ==================== Utility ====================
function getTimestamp() {
  if (!GameState.gameStartTime) return '00:00';
  const elapsed = Math.floor((Date.now() - GameState.gameStartTime) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function generateId() {
  return 'VG-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
}

function addDeduction(level, action, deduction) {
  const scoreBefore = GameState.score;
  GameState.score = Math.max(0, GameState.score + deduction);
  GameState.deductionLog.push({
    level, action, deduction,
    scoreBefore, scoreAfter: GameState.score,
    timestamp: getTimestamp()
  });
  updateScoreDisplays();
  if (GameState.score <= 0) {
    GameState.deductionLog.push({
      level, action: '得分归零，游戏失败', deduction: 0,
      scoreBefore: 0, scoreAfter: 0, timestamp: getTimestamp()
    });
    triggerGameOver(level);
  }
}

function updateScoreDisplays() {
  const ids = ['intro-score', 'l1-score', 'l2-score', 'l3-score'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = GameState.score;
  });
}

function getGrade(score) {
  if (score >= 90) return { grade: 'S', title: '血栓终结者', cert: '金', cssClass: 'grade-s' };
  if (score >= 70) return { grade: 'A', title: '血管守护者', cert: '银', cssClass: 'grade-a' };
  if (score >= 60) return { grade: 'B', title: '实习新秀', cert: '铜', cssClass: 'grade-b' };
  return { grade: 'C', title: '继续修炼', cert: null, cssClass: 'grade-c' };
}

function buildDeductionCard(containerId, levelFilter) {
  const container = document.getElementById(containerId);
  const items = GameState.deductionLog.filter(d =>
    d.level === levelFilter && d.deduction !== 0
  );
  let html = '<h4>本关扣分明细</h4>';
  if (items.length === 0) {
    html += '<div class="perfect-pass">★ 完美通关！本关无扣分</div>';
    const currentScore = GameState.score;
    html += `<div class="deduction-total"><span>当前剩余得分</span><span style="color:#4CAF50">${currentScore}分</span></div>`;
  } else {
    items.forEach(item => {
      html += `<div class="deduction-item"><span class="reason">✕ ${item.action}</span><span class="points">${item.deduction}分</span></div>`;
    });
    const totalDeduct = items.reduce((sum, i) => sum + i.deduction, 0);
    html += `<div class="deduction-total"><span>本关合计扣分</span><span style="color:#F44336">${totalDeduct}分</span></div>`;
    html += `<div class="deduction-total"><span>当前剩余得分</span><span style="color:#4A90D9">${GameState.score}分</span></div>`;
  }
  container.innerHTML = html;
}

// ==================== Game Core ====================
const Game = {
  goTo(pageId) {
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active', 'slide-in');
    });
    const target = document.getElementById(pageId);
    target.classList.add('active', 'slide-in');
    target.scrollTop = 0;

    // Page-specific init
    if (pageId === 'page-records') this.loadRecords();
    if (pageId === 'page-level1') Level1.init();
    if (pageId === 'page-level2') Level2.init();
    if (pageId === 'page-level3') Level3.init();
    if (pageId === 'page-settle1') buildDeductionCard('settle1-deductions', 'Level 1');
    if (pageId === 'page-settle2') buildDeductionCard('settle2-deductions', 'Level 2');
    if (pageId === 'page-settle3') buildDeductionCard('settle3-deductions', 'Level 3');
  },

  startGame() {
    const name = document.getElementById('player-name').value.trim();
    if (!name) return;
    resetState();
    GameState.playerName = name;
    updateScoreDisplays();
    this.goTo('page-level1');
  },

  restart() {
    document.getElementById('player-name').value = '';
    document.getElementById('btn-ready').disabled = true;
    this.goTo('page-intro');
  },

  showFinalResult() {
    const score = GameState.score;
    const info = getGrade(score);

    document.getElementById('final-name').textContent = GameState.playerName;
    document.getElementById('final-score').textContent = score;
    const gradeEl = document.getElementById('final-grade');
    gradeEl.textContent = info.grade + '级';
    gradeEl.className = 'final-grade ' + info.cssClass;
    document.getElementById('final-title-text').textContent = info.title;

    // Build summary
    const summaryEl = document.getElementById('final-summary');
    const levels = ['Level 1', 'Level 2', 'Level 3'];
    const names = ['隐患侦探', '决策时刻', '绝地反击'];
    let html = '';
    levels.forEach((lv, i) => {
      const items = GameState.deductionLog.filter(d => d.level === lv && d.deduction !== 0);
      const total = items.reduce((s, d) => s + d.deduction, 0);
      const cls = total === 0 ? 'no-deduct' : '';
      html += `<div class="summary-row"><span class="summary-label">L${i + 1} ${names[i]}</span><span class="summary-value ${cls}">${total === 0 ? '无扣分' : total + '分'}</span></div>`;
    });
    summaryEl.innerHTML = html;

    // Certificate preview
    const certPreview = document.getElementById('cert-preview');
    const btnCert = document.getElementById('btn-view-cert');
    if (info.cert) {
      certPreview.style.display = 'flex';
      btnCert.style.display = 'flex';
      const miniIcon = document.getElementById('cert-mini-icon');
      const colors = { '金': '#FFD700', '银': '#C0C0C0', '铜': '#CD7F32' };
      miniIcon.style.borderColor = colors[info.cert];
      miniIcon.textContent = info.cert;
      document.getElementById('cert-preview-text').textContent = `获得${info.cert}牌证书`;
    } else {
      certPreview.style.display = 'none';
      btnCert.style.display = 'none';
    }

    // Save record
    this.saveRecord(score, info, '通关');

    this.goTo('page-final');
  },

  saveRecord(score, info, result, failLevel) {
    const record = {
      id: generateId(),
      playerName: GameState.playerName,
      score,
      grade: result === '通关' ? info.grade : '失败',
      certificate: info.cert || null,
      result,
      failLevel: failLevel || null,
      datetime: new Date().toLocaleString('zh-CN'),
      deductionLog: [...GameState.deductionLog]
    };
    const records = JSON.parse(localStorage.getItem('vg_records') || '[]');
    records.unshift(record);
    if (records.length > 50) records.length = 50;
    localStorage.setItem('vg_records', JSON.stringify(records));
  },

  loadRecords() {
    const records = JSON.parse(localStorage.getItem('vg_records') || '[]');
    const list = document.getElementById('records-list');
    if (records.length === 0) {
      list.innerHTML = '<div class="empty-records">暂无挑战记录</div>';
      return;
    }
    let html = '';
    records.forEach(r => {
      const scoreClass = r.grade === '失败' ? 'fail' : '';
      const gradeClass = r.grade === '失败' ? 'grade-fail' : 'grade-' + r.grade.toLowerCase();
      const certIcon = r.certificate ? ({ '金': '🥇', '银': '🥈', '铜': '🥉' }[r.certificate] || '') : '';
      html += `
        <div class="record-row">
          <div class="record-info">
            <div class="record-name">${this.escapeHtml(r.playerName)}</div>
            <div class="record-date">${r.datetime}</div>
          </div>
          <span class="record-score ${scoreClass}">${r.score}</span>
          <span class="record-grade ${gradeClass}">${r.grade}${r.grade !== '失败' ? '级' : ''}</span>
          <span class="record-cert">${certIcon}</span>
        </div>`;
    });
    list.innerHTML = html;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  failConfirm() {
    this.goTo('page-home');
  },

  saveCertificate() {
    const certEl = document.getElementById('certificate');
    if (typeof html2canvas !== 'undefined') {
      html2canvas(certEl, { scale: 2, backgroundColor: '#fff' }).then(canvas => {
        const link = document.createElement('a');
        link.download = `血管卫士证书_${GameState.playerName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    } else {
      showToast('证书保存功能需要联网加载，请检查网络连接', 'error');
    }
  },

  showCertPage() {
    const score = GameState.score;
    const info = getGrade(score);
    const border = document.getElementById('cert-border');
    border.className = 'cert-border';
    if (info.cert === '金') border.classList.add('gold');
    else if (info.cert === '银') border.classList.add('silver');
    else border.classList.add('bronze');

    const titles = { '金': '血栓终结者·金牌', '银': '血管守护者·银牌', '铜': '实习新秀·铜牌' };
    document.getElementById('cert-title').textContent = titles[info.cert] || '';
    document.getElementById('cert-player').textContent = GameState.playerName;
    document.getElementById('cert-score-text').textContent = score;
    document.getElementById('cert-grade-text').textContent = info.grade;
    document.getElementById('cert-date').textContent = new Date().toLocaleDateString('zh-CN');
    document.getElementById('cert-id').textContent = 'No.' + generateId();
  }
};

// Override goTo to handle cert page
const originalGoTo = Game.goTo.bind(Game);
Game.goTo = function (pageId) {
  if (pageId === 'page-cert') Game.showCertPage();
  originalGoTo(pageId);
};

// ==================== Trigger Game Over ====================
function triggerGameOver(level) {
  // Stop all timers
  if (GameState.l1.timerInterval) { clearInterval(GameState.l1.timerInterval); GameState.l1.timerInterval = null; }
  if (GameState.l3.timerInterval) { clearInterval(GameState.l3.timerInterval); GameState.l3.timerInterval = null; }

  // Close any open modals
  document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  document.querySelectorAll('.feedback-overlay').forEach(m => m.style.display = 'none');

  const levelNames = { 'Level 1': '隐患侦探', 'Level 2': '决策时刻', 'Level 3': '绝地反击' };
  document.getElementById('fail-level').textContent = `失败于：${level} ${levelNames[level] || ''}`;

  // Last deduction reason
  const lastDeduct = [...GameState.deductionLog].reverse().find(d => d.deduction !== 0);
  document.getElementById('fail-reason').textContent = lastDeduct ? `失败原因：${lastDeduct.action}` : '';

  // Build fail deductions
  const items = GameState.deductionLog.filter(d => d.level === level && d.deduction !== 0);
  const container = document.getElementById('fail-deductions');
  let html = '<h4>扣分明细</h4>';
  items.forEach(item => {
    html += `<div class="deduction-item"><span class="reason">✕ ${item.action}</span><span class="points">${item.deduction}分</span></div>`;
  });
  container.innerHTML = html;

  // Save record
  Game.saveRecord(0, { grade: '失败', cert: null }, '失败', level);

  setTimeout(() => Game.goTo('page-fail'), 300);
}

// ==================== Toast ====================
function showToast(msg, type, duration) {
  const existingToasts = document.querySelectorAll('.toast[style*="display: flex"], .toast[style*="display: block"]');
  existingToasts.forEach(t => t.style.display = 'none');

  const toast = document.createElement('div');
  toast.className = `toast ${type || ''}`;
  toast.textContent = msg;
  toast.style.display = 'block';
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, duration || 1500);
}

// ==================== Level 1: 隐患侦探 ====================
const Level1 = {
  quizAnswers: {
    A: { correct: ['A', 'C', 'E'], wrong: ['B', 'D'] },
    B: { correct: ['B', 'C', 'E'], wrong: ['A', 'D'] },
    C: { correct: ['A', 'C', 'D'], wrong: ['B', 'E'] }
  },

  init() {
    GameState.currentLevel = 'Level 1';
    GameState.l1 = { found: new Set(), timerInterval: null, timeLeft: 30, paused: false };
    document.getElementById('l1-found').textContent = '0';
    document.getElementById('l1-timer').textContent = '30';
    updateScoreDisplays();

    // Reset hotspots
    document.querySelectorAll('.hotspot').forEach(h => h.classList.remove('found'));
    ['marker-a', 'marker-b', 'marker-c'].forEach(id => document.getElementById(id).style.display = 'none');

    // Reset quiz modals
    ['A', 'B', 'C'].forEach(h => {
      document.getElementById(`modal-hazard-${h.toLowerCase()}`).style.display = 'none';
      document.getElementById(`quiz-${h.toLowerCase()}-result`).style.display = 'none';
      const optionsContainer = document.getElementById(`quiz-${h.toLowerCase()}-options`);
      optionsContainer.style.display = 'block';
      optionsContainer.querySelectorAll('input').forEach(inp => { inp.checked = false; inp.disabled = false; });
      optionsContainer.querySelectorAll('.checkbox-item').forEach(item => {
        item.className = 'checkbox-item';
      });
      // Show submit button, make sure it's visible
      const modal = document.getElementById(`modal-hazard-${h.toLowerCase()}`);
      const submitBtn = modal.querySelector('.modal-btn');
      if (submitBtn) submitBtn.style.display = 'flex';
    });

    // Set up hotspot click handlers
    this.setupHotspots();

    // Start timer
    this.startTimer();
  },

  setupHotspots() {
    // Hazard hotspots
    document.querySelectorAll('.hotspot[data-hazard]').forEach(el => {
      el.onclick = () => {
        const hazard = el.dataset.hazard;
        if (GameState.l1.found.has(hazard)) return;
        GameState.l1.found.add(hazard);
        el.classList.add('found');
        document.getElementById(`marker-${hazard.toLowerCase()}`).style.display = 'flex';
        document.getElementById('l1-found').textContent = GameState.l1.found.size;

        // Pause timer and show quiz
        GameState.l1.paused = true;
        document.getElementById(`modal-hazard-${hazard.toLowerCase()}`).style.display = 'flex';
      };
    });

    // Distraction hotspots
    document.querySelectorAll('.hotspot-distract').forEach(el => {
      el.onclick = () => {
        const name = el.dataset.distract;
        addDeduction('Level 1', `点击干扰项：${name}`, -5);
        showToast('这里没有问题哦~', 'warning');
      };
    });
  },

  startTimer() {
    if (GameState.l1.timerInterval) clearInterval(GameState.l1.timerInterval);
    GameState.l1.timeLeft = 30;
    GameState.l1.timerInterval = setInterval(() => {
      if (GameState.l1.paused) return;
      GameState.l1.timeLeft--;
      document.getElementById('l1-timer').textContent = GameState.l1.timeLeft;
      if (GameState.l1.timeLeft <= 0) {
        clearInterval(GameState.l1.timerInterval);
        GameState.l1.timerInterval = null;
        if (GameState.l1.found.size < 3) {
          addDeduction('Level 1', '超时未完成，得分归0', -GameState.score);
        }
      }
    }, 1000);
  },

  submitQuiz(hazard) {
    const key = hazard.toLowerCase();
    const answers = this.quizAnswers[hazard];
    const optionsContainer = document.getElementById(`quiz-${key}-options`);
    const selected = [...optionsContainer.querySelectorAll('input:checked')].map(inp => inp.value);

    // Hide submit button
    const modal = document.getElementById(`modal-hazard-${key}`);
    const submitBtn = modal.querySelector('.modal-btn');
    submitBtn.style.display = 'none';

    // Calculate deductions
    // Wrong selections (selected but shouldn't be)
    selected.forEach(s => {
      if (answers.wrong.includes(s)) {
        const optText = optionsContainer.querySelector(`input[value="${s}"]`).parentElement.textContent.trim();
        addDeduction('Level 1', `隐患${hazard}-选错：${optText}`, -5);
      }
    });
    // Missed selections (should be selected but weren't)
    answers.correct.forEach(c => {
      if (!selected.includes(c)) {
        const optText = optionsContainer.querySelector(`input[value="${c}"]`).parentElement.textContent.trim();
        addDeduction('Level 1', `隐患${hazard}-漏选：${optText}`, -5);
      }
    });

    // Mark correct/wrong visually
    optionsContainer.querySelectorAll('.checkbox-item').forEach(item => {
      const inp = item.querySelector('input');
      const val = inp.value;
      inp.disabled = true;
      if (answers.correct.includes(val)) {
        item.classList.add(selected.includes(val) ? 'correct' : 'missed');
      } else if (selected.includes(val)) {
        item.classList.add('wrong');
      }
    });

    // Show result
    document.getElementById(`quiz-${key}-result`).style.display = 'block';
  },

  closeQuiz(hazard) {
    const key = hazard.toLowerCase();
    document.getElementById(`modal-hazard-${key}`).style.display = 'none';

    // Check if score is 0 (game over already triggered by addDeduction)
    if (GameState.score <= 0) return;

    // Resume timer
    GameState.l1.paused = false;

    // Check if all 3 found
    if (GameState.l1.found.size >= 3) {
      clearInterval(GameState.l1.timerInterval);
      GameState.l1.timerInterval = null;
      setTimeout(() => Game.goTo('page-settle1'), 500);
    }
  }
};

// ==================== Level 2: 决策时刻 ====================
const Level2 = {
  feedbackTexts: {
    A: '静脉造影虽然是诊断金标准，但属于有创检查，不作为首选。应先进行无创的超声检查。',
    C: '在未明确诊断前直接抗凝，既增加出血风险，也缺乏循证依据。应先通过检查确认血栓再制定方案。',
    D: '糟糕！张大爷下地活动后血栓脱落，引发肺栓塞（PE），突发胸痛倒地！疑似DVT患者严禁剧烈活动！'
  },

  init() {
    GameState.currentLevel = 'Level 2';
    GameState.l2.disabledChoices = new Set();
    updateScoreDisplays();
    // Reset all choice buttons
    document.querySelectorAll('#l2-choices .btn-choice').forEach(btn => {
      btn.className = 'btn btn-choice';
      btn.style.pointerEvents = 'auto';
    });
    document.getElementById('l2-feedback').style.display = 'none';
  },

  choose(choice) {
    if (GameState.l2.disabledChoices.has(choice)) return;

    if (choice === 'B') {
      // Correct answer
      const btn = document.querySelector(`[data-choice="B"]`);
      btn.classList.add('correct');
      setTimeout(() => Game.goTo('page-l2correct'), 600);
      return;
    }

    if (choice === 'D') {
      // Fatal error
      const btn = document.querySelector(`[data-choice="D"]`);
      btn.classList.add('wrong');
      addDeduction('Level 2', '选择D：让病人下地活动，得分归0', -GameState.score);
      return;
    }

    // A or C: non-optimal
    const btn = document.querySelector(`[data-choice="${choice}"]`);
    btn.classList.add('wrong');
    btn.classList.add('disabled');
    btn.style.pointerEvents = 'none';
    GameState.l2.disabledChoices.add(choice);

    const actionText = choice === 'A' ? '选择A：立即行静脉造影' : '选择C：直接开始抗凝治疗';
    addDeduction('Level 2', actionText, -5);

    if (GameState.score <= 0) return;

    // Show feedback
    const feedbackOverlay = document.getElementById('l2-feedback');
    const feedbackCard = document.getElementById('l2-feedback-card');
    const feedbackText = document.getElementById('l2-feedback-text');
    feedbackCard.className = 'feedback-card';
    feedbackText.textContent = '不是最佳选择！' + this.feedbackTexts[choice];
    feedbackOverlay.style.display = 'flex';
  },

  closeFeedback() {
    document.getElementById('l2-feedback').style.display = 'none';
  }
};

// ==================== Level 3: 绝地反击 ====================
const Level3 = {
  correctOrder: [
    { id: 'op1', name: '呼叫上级医师', feedback: '紧急情况，立即请求支援！' },
    { id: 'op2', name: '吸氧', feedback: '鼻导管吸氧，改善低氧血症！ SpO2: 85%→88%' },
    { id: 'op3', name: '半卧位', feedback: '减轻呼吸困难，改善通气！' },
    { id: 'op4', name: '生命体征监测', feedback: '持续监测，掌握病情变化！' },
    { id: 'op5', name: 'CTPA检查', feedback: 'CT肺动脉造影，确诊PE！' }
  ],
  distractors: [
    { id: 'op6', name: '让患者下地行走', feedback: '危险！PE患者必须绝对卧床！' },
    { id: 'op7', name: '热敷患肢', feedback: '禁止！热敷可能加重血栓脱落风险！' },
    { id: 'op8', name: '按摩胸部', feedback: '无效操作！PE不需要胸外按压！' }
  ],

  init() {
    GameState.currentLevel = 'Level 3';
    GameState.l3 = { filledSlots: {}, timerInterval: null, timeLeft: 30, completed: 0 };
    updateScoreDisplays();
    document.getElementById('l3-timer').textContent = '30';
    document.getElementById('monitor-feedback').style.display = 'none';

    // Reset drop slots
    document.querySelectorAll('.drop-slot').forEach(slot => {
      slot.classList.remove('filled');
      slot.querySelector('.slot-content').textContent = '';
    });

    // Create shuffled items
    const allItems = [...this.correctOrder, ...this.distractors];
    this.shuffle(allItems);

    const dragArea = document.getElementById('drag-area');
    dragArea.innerHTML = '';
    allItems.forEach(item => {
      const el = document.createElement('div');
      el.className = `drag-item ${this.distractors.find(d => d.id === item.id) ? 'distract-item' : 'correct-item'}`;
      el.textContent = item.name;
      el.dataset.itemId = item.id;
      el.draggable = true;
      el.addEventListener('dragstart', e => this.onDragStart(e, item));
      el.addEventListener('touchstart', e => this.onTouchStart(e, item), { passive: false });
      dragArea.appendChild(el);
    });

    // Set up drop zones (clone to remove old listeners)
    document.querySelectorAll('.drop-slot').forEach(slot => {
      const newSlot = slot.cloneNode(true);
      slot.parentNode.replaceChild(newSlot, slot);
      newSlot.addEventListener('dragover', e => { e.preventDefault(); newSlot.classList.add('drag-over'); });
      newSlot.addEventListener('dragleave', () => newSlot.classList.remove('drag-over'));
      newSlot.addEventListener('drop', e => { e.preventDefault(); newSlot.classList.remove('drag-over'); this.onDrop(newSlot); });
    });

    this.startTimer();
  },

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  currentDragItem: null,

  onDragStart(e, item) {
    this.currentDragItem = item;
    e.dataTransfer.effectAllowed = 'move';
    const el = e.target;
    el.classList.add('dragging');
    setTimeout(() => el.classList.remove('dragging'), 0);
  },

  // Touch drag support
  touchDragEl: null,
  touchClone: null,

  onTouchStart(e, item) {
    e.preventDefault();
    this.currentDragItem = item;
    const touch = e.touches[0];
    const el = e.currentTarget;
    this.touchDragEl = el;

    // Create clone for visual feedback
    const clone = el.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.zIndex = '1000';
    clone.style.width = el.offsetWidth + 'px';
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.8';
    clone.style.transform = 'scale(1.1)';
    document.body.appendChild(clone);
    this.touchClone = clone;

    this.moveTouchClone(touch);

    const onMove = (ev) => {
      ev.preventDefault();
      this.moveTouchClone(ev.touches[0]);
      // Highlight drop zone under touch
      document.querySelectorAll('.drop-slot').forEach(s => s.classList.remove('drag-over'));
      const target = this.getDropSlotAt(ev.touches[0]);
      if (target) target.classList.add('drag-over');
    };

    const onEnd = (ev) => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      if (this.touchClone) { this.touchClone.remove(); this.touchClone = null; }
      document.querySelectorAll('.drop-slot').forEach(s => s.classList.remove('drag-over'));

      const lastTouch = ev.changedTouches[0];
      const dropSlot = this.getDropSlotAt(lastTouch);
      if (dropSlot) {
        this.onDrop(dropSlot);
      }
      this.touchDragEl = null;
    };

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  },

  moveTouchClone(touch) {
    if (!this.touchClone) return;
    this.touchClone.style.left = (touch.clientX - 36) + 'px';
    this.touchClone.style.top = (touch.clientY - 32) + 'px';
  },

  getDropSlotAt(touch) {
    const slots = document.querySelectorAll('.drop-slot');
    for (const slot of slots) {
      const rect = slot.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
          touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        return slot;
      }
    }
    return null;
  },

  onDrop(slot) {
    if (!this.currentDragItem) return;
    const item = this.currentDragItem;
    const slotNum = parseInt(slot.dataset.slot);

    // Already filled?
    if (slot.classList.contains('filled')) {
      this.currentDragItem = null;
      return;
    }

    // Check if distractor
    const isDistractor = this.distractors.find(d => d.id === item.id);
    if (isDistractor) {
      addDeduction('Level 3', `拖入干扰项：${item.name}`, -5);
      showToast(isDistractor.feedback, 'error', 2000);
      this.currentDragItem = null;
      return;
    }

    // Check correct position
    const correctIndex = this.correctOrder.findIndex(c => c.id === item.id);
    const nextSlot = GameState.l3.completed + 1;

    if (slotNum !== nextSlot) {
      // Wrong slot - must fill in order
      showToast('请按顺序填入！先填第' + this.getCircledNum(nextSlot) + '位', 'warning');
      this.currentDragItem = null;
      return;
    }

    if (correctIndex !== slotNum - 1) {
      // Wrong order
      const correctPos = correctIndex + 1;
      addDeduction('Level 3', `顺序错误：将"${item.name}"放在第${this.getCircledNum(slotNum)}位（正确应为第${this.getCircledNum(correctPos)}位）`, -5);
      showToast('顺序不对！', 'warning');
      this.currentDragItem = null;
      if (GameState.score <= 0) return;
      return;
    }

    // Correct placement!
    slot.classList.add('filled');
    slot.querySelector('.slot-content').textContent = item.name;
    GameState.l3.completed++;

    // Mark drag item as used
    const dragEl = document.querySelector(`.drag-item[data-item-id="${item.id}"]`);
    if (dragEl) dragEl.classList.add('used');

    // Show monitor feedback
    const correctItem = this.correctOrder[correctIndex];
    const monitorEl = document.getElementById('monitor-feedback');
    monitorEl.style.display = 'block';
    document.getElementById('monitor-text').textContent = correctItem.feedback;

    // Check completion
    if (GameState.l3.completed >= 5) {
      clearInterval(GameState.l3.timerInterval);
      GameState.l3.timerInterval = null;
      setTimeout(() => Game.goTo('page-settle3'), 1000);
    }

    this.currentDragItem = null;
  },

  getCircledNum(n) {
    return ['', '①', '②', '③', '④', '⑤'][n] || n;
  },

  startTimer() {
    if (GameState.l3.timerInterval) clearInterval(GameState.l3.timerInterval);
    GameState.l3.timeLeft = 30;
    GameState.l3.timerInterval = setInterval(() => {
      GameState.l3.timeLeft--;
      document.getElementById('l3-timer').textContent = GameState.l3.timeLeft;
      if (GameState.l3.timeLeft <= 0) {
        clearInterval(GameState.l3.timerInterval);
        GameState.l3.timerInterval = null;
        if (GameState.l3.completed < 5) {
          addDeduction('Level 3', '超时未完成排列，得分归0', -GameState.score);
        }
      }
    }, 1000);
  }
};

// ==================== Init ====================
document.addEventListener('DOMContentLoaded', () => {
  // Name input enable/disable button
  const nameInput = document.getElementById('player-name');
  const btnReady = document.getElementById('btn-ready');
  nameInput.addEventListener('input', () => {
    btnReady.disabled = nameInput.value.trim().length === 0;
  });
  // Allow enter key to start
  nameInput.addEventListener('keyup', e => {
    if (e.key === 'Enter' && nameInput.value.trim()) Game.startGame();
  });
});
