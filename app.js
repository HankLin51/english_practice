// 多益與護理師英文練習平台 - 核心邏輯 (app.js)

// 初始使用者狀態
const INITIAL_STATE = {
  examGoal: "dict", // 'dict' | 'rn' | 'api'
  streak: 0,
  lastActiveDate: "", // YYYY-MM-DD
  exp: 0,
  level: 1,
  coins: 0,
  currentTOEICLevel: "green", // 'green' | 'blue' | 'gold'
  stats: {
    totalQuestions: 0,
    correctQuestions: 0,
    totalTimeSpent: 0, // 單位：秒
    categoryCounts: { vocabulary: 0, phrases: 0, grammar: 0, sentences: 0, dialogue: 0, pharmacology: 0, medSurg: 0, pediatric: 0, maternity: 0 },
    categoryCorrect: { vocabulary: 0, phrases: 0, grammar: 0, sentences: 0, dialogue: 0, pharmacology: 0, medSurg: 0, pediatric: 0, maternity: 0 }
  },
  weeklyMinutes: [0, 0, 0, 0, 0, 0, 0], // 週一到週日學習時間（分鐘）
  weeklyStartOfWeek: "", // 記錄本週的日期，以判斷是否跨週
  unlockedThemes: ["default"],
  equippedTheme: "default",
  unlockedBadges: [],
  reviewBox: [], // { id, level, type, questionData, boxNum: 1, nextReviewDate: YYYY-MM-DD }
  dailyQuests: [], // { id, text, type, target, current, rewardCoins, rewardExp, completed }
  questDate: "" // 任務生成日期 YYYY-MM-DD
};

let state = { ...INITIAL_STATE };
let sessionState = null; // 當前練習狀態
let usersList = ["預設使用者"];
let currentUser = "預設使用者";
let directoryHandle = null; // 本地備份資料夾 Handle

// --- IndexedDB 用於儲存 DirectoryHandle ---
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("toeic_backup_db", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getStoredHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("settings", "readonly");
      const store = tx.objectStore("settings");
      const req = store.get("backup_dir_handle");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("讀取 IndexedDB 失敗", err);
    return null;
  }
}

async function setStoredHandle(handle) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("settings", "readwrite");
      const store = tx.objectStore("settings");
      const req = store.put(handle, "backup_dir_handle");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("儲存 IndexedDB 失敗", err);
  }
}

async function verifyPermission(fileHandle, readWrite) {
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

// 語音識別設定
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

// 頁面加載初始化
document.addEventListener("DOMContentLoaded", () => {
  try {
    loadState();
    setupNavigation();
    initDashboard();
    applyEquippedTheme();
    trackActiveTime();
    checkDayChange();
    initDirectoryHandle();
    
    // 練習選單按鈕綁定
    document.querySelectorAll(".practice-menu-card").forEach(card => {
      card.addEventListener("click", () => {
        const category = card.dataset.category;
        startPractice(category);
      });
    });

    // 商店購買綁定
    document.querySelectorAll(".store-buy-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const theme = btn.dataset.theme;
        const cost = parseInt(btn.dataset.cost);
        purchaseTheme(theme, cost, btn);
      });
    });

    // 複習全部按鈕綁定
    const startAllReviewsBtn = document.getElementById("start-all-reviews");
    if (startAllReviewsBtn) {
      startAllReviewsBtn.addEventListener("click", () => {
        startReviewSession();
      });
    }

    // 還原檔案監聽器
    const restoreInput = document.getElementById("restore-file-input");
    if (restoreInput) {
      restoreInput.addEventListener("change", handleRestoreFileSelected);
    }
  } catch (err) {
    console.error("Initialization error:", err);
    alert("網頁載入出錯：\n" + err.name + ": " + err.message + "\n\n詳細追蹤堆疊：\n" + err.stack);
  }
});

// --- State 狀態管理與存取 ---
function loadState() {
  const usersStored = localStorage.getItem("toeic_users_list");
  if (usersStored) {
    try {
      usersList = JSON.parse(usersStored);
    } catch(e) {
      usersList = ["預設使用者"];
    }
  } else {
    usersList = ["預設使用者"];
    localStorage.setItem("toeic_users_list", JSON.stringify(usersList));
  }

  const currentStored = localStorage.getItem("toeic_current_user");
  if (currentStored && usersList.includes(currentStored)) {
    currentUser = currentStored;
  } else {
    currentUser = usersList[0];
    localStorage.setItem("toeic_current_user", currentUser);
  }

  const stored = localStorage.getItem("toeic_practice_state_" + currentUser);
  if (stored) {
    try {
      state = JSON.parse(stored);
      state = { ...INITIAL_STATE, ...state };
      state.stats = { ...INITIAL_STATE.stats, ...state.stats };
      state.stats.categoryCounts = { ...INITIAL_STATE.stats.categoryCounts, ...state.stats.categoryCounts };
      state.stats.categoryCorrect = { ...INITIAL_STATE.stats.categoryCorrect, ...state.stats.categoryCorrect };
    } catch (e) {
      console.error("狀態解析失敗，使用初始狀態", e);
      state = { ...INITIAL_STATE };
    }
  } else {
    state = { ...INITIAL_STATE };
  }

  // 防禦性遷移：如果檢測到舊有的多益目標，自動轉移至新版預設的智能單字庫
  if (!["dict", "rn", "api", "gemini"].includes(state.examGoal)) {
    state.examGoal = "dict";
  }

  updateExamGoalUI();
  const headerUserLabel = document.getElementById("header-username-label");
  if (headerUserLabel) headerUserLabel.innerText = currentUser;

  updateUIElements();
}

function saveState() {
  localStorage.setItem("toeic_practice_state_" + currentUser, JSON.stringify(state));
  localStorage.setItem("toeic_users_list", JSON.stringify(usersList));
  localStorage.setItem("toeic_current_user", currentUser);
  
  autoSaveToFileSystem();

  updateUIElements();
}

// 應用解鎖的主題
function applyEquippedTheme() {
  document.body.className = ""; // 清空
  if (state.equippedTheme && state.equippedTheme !== "default") {
    document.body.classList.add(`theme-${state.equippedTheme}`);
  }
}

// 更新頂端及側欄狀態
function updateUIElements() {
  // 經驗值與等級
  const levelText = document.getElementById("header-level-text");
  const expBarFill = document.getElementById("header-exp-fill");
  const expValueText = document.getElementById("header-exp-val");
  
  const levelTitle = getLevelTitle(state.level);
  levelText.innerText = `Lv. ${state.level} (${levelTitle})`;
  
  const expNeeded = state.level * 100;
  const expPercent = Math.min((state.exp / expNeeded) * 100, 100);
  expBarFill.style.width = `${expPercent}%`;
  expValueText.innerText = `${state.exp} / ${expNeeded} EXP`;

  // 金幣與連擊
  document.getElementById("header-streak-val").innerText = `${state.streak} 天`;
  document.getElementById("header-coins-val").innerText = state.coins;

  const streakPill = document.querySelector(".streak-pill");
  if (state.streak > 0) {
    streakPill.classList.remove("inactive");
  } else {
    streakPill.classList.add("inactive");
  }

  // 側欄快速資訊
  const sidebarUser = document.getElementById("sidebar-username");
  const sidebarLvl = document.getElementById("sidebar-level");
  if (sidebarUser) sidebarUser.innerText = currentUser;
  if (sidebarLvl) sidebarLvl.innerText = `LV.${state.level} • ${levelTitle}`;

  // 刷新特定面板的顯示
  updateReviewBoxCounts();
}

function getLevelTitle(lvl) {
  if (lvl < 3) return "英語新手";
  if (lvl < 6) return "英語進階";
  if (lvl < 10) return "流利溝通";
  if (lvl < 15) return "英語先鋒";
  return "英語大神";
}

// --- 側邊欄導航 (Navigation) ---
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".content-section");

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetSection = item.dataset.target;
      
      navItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      sections.forEach(s => {
        if (s.id === `${targetSection}-section`) {
          s.classList.add("active");
        } else {
          s.classList.remove("active");
        }
      });

      // 切換頁面時進行數據更新
      if (targetSection === "analysis") {
        updateAnalysisSection();
      } else if (targetSection === "store") {
        updateStoreSection();
      } else if (targetSection === "dashboard") {
        updateDashboardQuests();
      } else if (targetSection === "review") {
        renderReviewBoxList();
      } else if (targetSection === "practice") {
        if (!sessionState) {
          // 確保回到練習選單時，題目區隱藏，選單與標題顯示
          document.getElementById("practice-active-area").style.display = "none";
          const practiceHeader = document.querySelector(".practice-header");
          const practiceGrid = document.querySelector(".practice-menu-grid");
          if (practiceHeader) practiceHeader.style.display = "flex";
          if (practiceGrid) practiceGrid.style.display = "grid";
        }
      }
    });
  });
}

// --- 每日簽到與連擊 logic (Streak & Quests) ---
function checkDayChange() {
  const todayStr = getTodayString();
  const lastActive = state.lastActiveDate;

  if (lastActive !== todayStr) {
    if (lastActive) {
      const yesterdayStr = getYesterdayString();
      if (lastActive === yesterdayStr) {
        // 連續登入，不加連擊，連擊在今天首次完成練習時加算，或者登入即加算
        // 登入即加算
        state.streak += 1;
      } else {
        // 中斷，重置為 1 天
        state.streak = 1;
      }
    } else {
      // 首次登入
      state.streak = 1;
    }
    state.lastActiveDate = todayStr;
    
    // 重置每日學習時數（若是新的一週則可能需要重置週數據，此處簡單計算當天）
    checkWeeklyReset();
    
    // 生成每日任務
    generateDailyQuests(todayStr);
    saveState();
  }
}

function checkWeeklyReset() {
  const today = new Date();
  // 取得星期一的日期字串
  const monday = new Date(today);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // 調整星期日
  monday.setDate(diff);
  const mondayStr = dateToString(monday);

  if (state.weeklyStartOfWeek !== mondayStr) {
    state.weeklyStartOfWeek = mondayStr;
    state.weeklyMinutes = [0, 0, 0, 0, 0, 0, 0]; // 重置週學習時間
  }
}

function generateDailyQuests(dateStr) {
  state.questDate = dateStr;
  state.dailyQuests = [
    { id: "q_vocab", text: "練習 5 個英文單字", type: "vocab", target: 5, current: 0, rewardCoins: 15, rewardExp: 30, completed: false },
    { id: "q_time", text: "今日練習達 3 分鐘", type: "time", target: 3, current: 0, rewardCoins: 20, rewardExp: 40, completed: false },
    { id: "q_speaking", text: "完成 1 次口說對話", type: "speaking", target: 1, current: 0, rewardCoins: 25, rewardExp: 50, completed: false }
  ];
}

function updateQuestProgress(type, amount) {
  let questsUpdated = false;
  state.dailyQuests.forEach(quest => {
    if (quest.type === type && !quest.completed) {
      quest.current = Math.min(quest.current + amount, quest.target);
      if (quest.current >= quest.target) {
        quest.completed = true;
        // 獲得獎勵
        state.coins += quest.rewardCoins;
        state.exp += quest.rewardExp;
        questsUpdated = true;
        // 彈出小通知
        showFloatingNotification(`任務完成！獲得 🪙${quest.rewardCoins} 與 EXP ${quest.rewardExp}`);
        checkLevelUp();
      }
    }
  });

  if (questsUpdated) {
    saveState();
    updateDashboardQuests();
  }
}

function checkLevelUp() {
  let leveledUp = false;
  let expNeeded = state.level * 100;
  while (state.exp >= expNeeded) {
    state.exp -= expNeeded;
    state.level += 1;
    expNeeded = state.level * 100;
    leveledUp = true;
  }
  if (leveledUp) {
    saveState();
    triggerLevelUpModal();
  }
}

function triggerLevelUpModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "level-up-modal-backdrop";
  backdrop.innerHTML = `
    <div class="level-up-modal">
      <div class="lvl-badge-giant">🏆</div>
      <div class="lvl-title-text">等級提升！</div>
      <div class="lvl-congrats">
        恭喜！您已升級至 <strong>Lv. ${state.level} (${getLevelTitle(state.level)})</strong>！<br>
        您的多益能力正不斷上升，繼續保持！
      </div>
      <button class="lvl-close-btn">太棒了，繼續學習</button>
    </div>
  `;
  document.body.appendChild(backdrop);
  
  backdrop.querySelector(".lvl-close-btn").addEventListener("click", () => {
    backdrop.remove();
    // 檢查成就
    checkBadgeUnlocks();
  });
}

// 浮動通知
function showFloatingNotification(text) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.bottom = "30px";
  container.style.right = "30px";
  container.style.background = "rgba(16, 185, 129, 0.9)";
  container.style.color = "#fff";
  container.style.padding = "14px 24px";
  container.style.borderRadius = "12px";
  container.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)";
  container.style.zIndex = "9999";
  container.style.fontWeight = "600";
  container.style.display = "flex";
  container.style.alignItems = "center";
  container.style.gap = "8px";
  container.style.backdropFilter = "blur(4px)";
  container.style.animation = "fadeIn 0.3s ease-out";
  container.innerHTML = `<span>🎉</span> ${text}`;
  document.body.appendChild(container);

  setTimeout(() => {
    container.style.animation = "fadeIn 0.3s ease-out reverse";
    setTimeout(() => container.remove(), 300);
  }, 4000);
}

// --- 儀表板頁面初始化 (Dashboard Page) ---
function initDashboard() {
  // 更新統計數字
  const rate = state.stats.totalQuestions > 0 
    ? Math.round((state.stats.correctQuestions / state.stats.totalQuestions) * 100) 
    : 0;
  
  document.getElementById("stat-studied-count").innerText = state.stats.totalQuestions;
  document.getElementById("stat-correct-rate").innerText = `${rate}%`;
  
  // 計算待複習題目數量
  const todayStr = getTodayString();
  const waitingReview = state.reviewBox.filter(item => item.nextReviewDate <= todayStr).length;
  document.getElementById("stat-review-count").innerText = waitingReview;
  
  // 學習時間進度
  const todayIndex = getTodayIndex();
  const todayMinutes = state.weeklyMinutes[todayIndex] || 0;
  document.getElementById("stat-today-minutes").innerText = `${todayMinutes} 分`;

  updateDashboardQuests();
}

function updateDashboardQuests() {
  const container = document.getElementById("daily-quest-list");
  if (!container) return;

  // 如果今天尚未生成任務，手動觸發生成
  const todayStr = getTodayString();
  if (state.questDate !== todayStr || state.dailyQuests.length === 0) {
    generateDailyQuests(todayStr);
    saveState();
  }

  container.innerHTML = state.dailyQuests.map(quest => `
    <div class="quest-item ${quest.completed ? 'completed' : ''}">
      <div class="quest-checkbox">
        ${quest.completed ? '<i class="fas fa-check"></i>' : ''}
      </div>
      <div class="quest-details">
        <span class="quest-title">${quest.text}</span>
        <span class="quest-reward"><i class="fas fa-coins"></i> +${quest.rewardCoins}  •  EXP +${quest.rewardExp} (${quest.current}/${quest.target})</span>
      </div>
    </div>
  `).join("");
}

// 輔助函數：解析 HTML 實體編碼 (如 &quot; -> ")
function decodeHtml(html) {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

// --- 練習模組主控 (Practice Engine) ---
function startPractice(category) {
  // 切換到練習模式視窗
  document.getElementById("dashboard-section").classList.remove("active");
  document.getElementById("practice-section").classList.add("active");
  
  // 隱藏練習選單與標題
  const practiceHeader = document.querySelector(".practice-header");
  const practiceGrid = document.querySelector(".practice-menu-grid");
  if (practiceHeader) practiceHeader.style.display = "none";
  if (practiceGrid) practiceGrid.style.display = "none";
  
  const practiceActiveArea = document.getElementById("practice-active-area");
  practiceActiveArea.style.display = "block";
  
  if (state.examGoal === "gemini") {
    const apiKey = localStorage.getItem("gemini_api_key_" + currentUser);
    if (!apiKey) {
      alert("請先點選右上角『帳號管理』並貼上您的 Gemini API Key！");
      exitPractice();
      return;
    }

    // 顯示載入動畫
    practiceActiveArea.innerHTML = `
      <div style="text-align:center; padding:50px; color:var(--text-secondary);">
        <i class="fas fa-spinner fa-spin" style="font-size:40px; margin-bottom:20px; color:#a78bfa;"></i>
        <h3>正在透過 Google Gemini AI 生成專屬學習題庫...</h3>
        <p style="margin-top:10px; font-size:14px;">這需要呼叫大語言模型，預估耗時 3-5 秒，請稍候片刻。</p>
      </div>
    `;

    // 依據 category 設定 prompt
    let categoryName = "單字詞彙";
    if (category === "grammar") categoryName = "語法結構";
    else if (category === "reading") categoryName = "閱讀理解";
    else if (category === "dialogue") categoryName = "情境對話";
    else if (category === "speaking") categoryName = "職場口說";

    const prompt = `你是一個專業的英文老師。請幫我出 5 題英語 ${categoryName} 練習題。
難度設定為：中級 (Intermediate, 約相當於多益 500-750 分)。
${category === 'speaking' ? `
每一題代表一組對話互動。請嚴格輸出符合以下 JSON 格式的陣列（不要包含任何 markdown 標籤如 \`\`\`json 或額外說明文字，只回傳乾淨的 JSON）：
[
  {
    "id": "gemini_speaking_1",
    "title": "情境名稱",
    "roleA": "A 的英文句子",
    "translationA": "A 句子的中文翻譯",
    "roleB": "B 的英文句子，難度適中，字數約 10-20 字",
    "translationB": "B 句子的中文翻譯",
    "explanation": "對話用詞點評與中文解析"
  }
]
` : `
每一題皆為單選題，具備 4 個選項。請嚴格輸出符合以下 JSON 格式的陣列（不要包含任何 markdown 標籤如 \`\`\`json 或額外說明文字，只回傳乾淨的 JSON）：
[
  {
    "id": "gemini_${category}_1",
    "question": "英文題目內容 (若是單字/語法題，請有挖空如 ____ )",
    "options": ["選項1", "選項2", "選項3", "選項4"],
    "answer": 0,
    "explanation": "中文詳盡解析與翻譯"
  }
]
`}`;

    const cleanApiKey = apiKey.trim();

    // 定義多個備用端點與模型組合
    const endpoints = [
      { version: "v1", model: "gemini-1.5-flash" },
      { version: "v1beta", model: "gemini-1.5-flash" },
      { version: "v1beta", model: "gemini-2.0-flash" }
    ];

    const tryFetch = (index) => {
      if (index >= endpoints.length) {
        throw new Error("404: 嘗試了所有模型端點皆返回 404。請確認您的 API 金鑰是否有權限存取 Gemini API。");
      }
      const ep = endpoints[index];
      const url = `https://generativelanguage.googleapis.com/${ep.version}/models/${ep.model}:generateContent?key=${cleanApiKey}`;
      
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }).then(res => {
        if (res.status === 404) {
          console.warn(`端點 ${ep.version}/${ep.model} 返回 404，嘗試下一個備用端點...`);
          return tryFetch(index + 1);
        }
        return res;
      });
    };

    tryFetch(0)
    .then(res => {
      if (!res.ok) {
        return res.text().then(body => {
          let errMsg = `HTTP ${res.status}`;
          try {
            const errData = JSON.parse(body);
            errMsg = errData?.error?.message || errMsg;
          } catch(e) {}
          if (res.status === 429) throw new Error("RATE_LIMIT_429");
          throw new Error(`${res.status}: ${errMsg}`);
        });
      }
      return res.json();
    })
    .then(data => {
      try {
        let text = data.candidates[0].content.parts[0].text;
        // 清理 Gemini 可能包裹的 markdown 程式碼區塊
        text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const questions = JSON.parse(text);
        
        // 給予題目唯一的 id
        const formattedQuestions = questions.map((q, idx) => {
          q.id = `api_gemini_${category}_${idx}_${Date.now()}`;
          return q;
        });

        // 如果是 speaking，我們需要將其分類改為 dialogue 才能正常觸發口說 UI 渲染
        sessionState = {
          category: category === "speaking" ? "dialogue" : category,
          questions: formattedQuestions,
          currentIndex: 0,
          score: 0,
          wrongAnswers: [],
          startTime: Date.now(),
          isReviewSession: false
        };

        renderQuestion();
      } catch (e) {
        console.error("解析 JSON 錯誤:", e, data);
        alert("AI 生成的題目格式解析錯誤，請重試一遍。\n詳細：" + e.message);
        exitPractice();
      }
    })
    .catch(err => {
      console.error("Gemini 請求錯誤:", err);
      if (err.message === "RATE_LIMIT_429") {
        alert("❗ Gemini 免費配額已用盡！\n\n您的帳號為免費方案，每日最多對 Gemini 1.5 Flash 發送 1500 次請求。\n\n解決方式：\n① 等待隔天（藿天配額自動重置）\n② 唤難模式改用「智能分級單字 (API)」簡単練習\n③ 前往 Google AI Studio 開通付費方案取得更高配額限額");
      } else {
        alert("無法串接 Gemini AI！\n錯誤原因：" + err.message + "\n\n請確認：\n① API Key 是否正確且已點「儲存 API 金鑰」\n② 您的 Google AI Studio 帳號是否有啟用 Gemini API");
      }
      exitPractice();
    });

    return;
  }

  if (state.examGoal === "dict") {
    // 檢查是不是片語、句型、文法等新模式
    if (category === "phrase") {
      const shuffled = [...PHRASES_DATA].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
      
      const phraseQuestions = selected.map((item, index) => {
        const correctDef = item.t;
        const distractors = PHRASES_DATA
          .filter(w => w.w !== item.w)
          .map(w => w.t);
        const selectedDistractors = [...distractors].sort(() => 0.5 - Math.random()).slice(0, 3);
        const options = [...selectedDistractors];
        const insertIdx = Math.floor(Math.random() * 4);
        options.splice(insertIdx, 0, correctDef);

        return {
          id: `phrase_${index}_${Date.now()}`,
          question: `請問片語 "<strong>${item.w}</strong>" 的中文意思是？`,
          options: options,
          answer: insertIdx,
          explanation: `<strong>${item.w}</strong><br>中文釋義：${correctDef}`
        };
      });

      sessionState = {
        category: "phrases", // 使用 phrases 觸發單選題 UI
        questions: phraseQuestions,
        currentIndex: 0,
        score: 0,
        wrongAnswers: [],
        startTime: Date.now(),
        isReviewSession: false
      };
      
      renderQuestion();
      return;
    }

    if (category === "sentence") {
      const shuffled = [...SENTENCES_DATA].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
      
      const sentenceQuestions = selected.map((item, index) => {
        const cleanSentence = item.w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
        const originalWords = cleanSentence.split(/\s+/).filter(w => w.length > 0);
        const shuffledWords = [...originalWords].sort(() => 0.5 - Math.random());
        
        const usedIndices = {};
        const correctOrder = originalWords.map(word => {
          const foundIdx = shuffledWords.findIndex((w, idx) => w === word && !usedIndices[idx]);
          usedIndices[foundIdx] = true;
          return foundIdx;
        });

        return {
          id: `sentence_${index}_${Date.now()}`,
          chinese: item.t,
          words: shuffledWords,
          correctOrder: correctOrder,
          explanation: `<strong>${item.w}</strong><br>翻譯：${item.t}`
        };
      });

      sessionState = {
        category: "sentences", // 使用 sentences 觸發句子重組 UI
        questions: sentenceQuestions,
        currentIndex: 0,
        score: 0,
        wrongAnswers: [],
        startTime: Date.now(),
        isReviewSession: false
      };
      
      renderQuestion();
      return;
    }

    if (category === "grammar") {
      const shuffled = [...GRAMMAR_DATA].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
      
      const grammarQuestions = selected.map((item, index) => {
        const correctOpt = item.correct;
        // 取得其他錯誤句子（完整物件，保留解析資訊）
        const otherWrongItems = GRAMMAR_DATA
          .filter(g => g.wrong !== item.wrong);
        const selectedWrongItems = [...otherWrongItems].sort(() => 0.5 - Math.random()).slice(0, 3);
        
        // 組合選項與對應解析
        const optionEntries = selectedWrongItems.map(g => ({
          text: g.wrong,
          isCorrect: false,
          errorExplanation: `❌ 錯誤句：${g.wrong}<br>→ 正確應為：${g.correct}<br>→ ${g.t}`
        }));
        const insertIdx = Math.floor(Math.random() * 4);
        optionEntries.splice(insertIdx, 0, {
          text: correctOpt,
          isCorrect: true,
          errorExplanation: `✅ 此為正確句子。`
        });

        const options = optionEntries.map(e => e.text);
        const optionDetails = optionEntries; // 保留完整解析供答題後顯示

        return {
          id: `grammar_${index}_${Date.now()}`,
          question: `下列句子中，請選出唯一<strong>語法完全正確</strong>的句子：`,
          options: options,
          answer: insertIdx,
          optionDetails: optionDetails,
          explanation: `<strong>正確句子：</strong>${correctOpt}<br><strong>解析說明：</strong>${item.t}`
        };
      });

      sessionState = {
        category: "grammar", // 使用 grammar 觸發單選題 UI
        questions: grammarQuestions,
        currentIndex: 0,
        score: 0,
        wrongAnswers: [],
        startTime: Date.now(),
        isReviewSession: false
      };
      
      renderQuestion();
      return;
    }

    // 取得當前難度的隨機 10 個單字
    const wordsPool = (typeof ECDICT_DATA !== 'undefined' ? ECDICT_DATA[category] : null) || DICT_WORDLIST[category] || [];
    if (wordsPool.length === 0) {
      alert("此分類目前沒有可用的題目資料。");
      exitPractice();
      return;
    }
    const shuffledWords = [...wordsPool].sort(() => 0.5 - Math.random());
    const selectedWords = shuffledWords.slice(0, 10);

    const dictQuestions = selectedWords.map((item, index) => {
      const correctDef = item.t;

      // 從其餘的單字中隨機抽取 3 個定義作為干擾選項
      const distractors = wordsPool
        .filter(w => w.w !== item.w)
        .map(w => w.t);
      
      // 隨機打亂干擾項並取 3 個
      const selectedDistractors = [...distractors].sort(() => 0.5 - Math.random()).slice(0, 3);
      
      // 組合並打亂選項
      const options = [...selectedDistractors];
      const insertIdx = Math.floor(Math.random() * 4);
      options.splice(insertIdx, 0, correctDef);

      return {
        id: `api_dict_${category}_${index}_${Date.now()}`,
        word: item.w,
        phonetic: "",
        partOfSpeech: "",
        question: `請問 "<strong>${item.w}</strong>" 的中文意思是？`,
        options: options,
        answer: insertIdx,
        explanation: `<strong>${item.w}</strong><br>定義：${correctDef}`
      };
    });

    sessionState = {
      category: category,
      questions: dictQuestions,
      currentIndex: 0,
      score: 0,
      wrongAnswers: [],
      startTime: Date.now(),
      isReviewSession: false
    };

    renderQuestion();
    return;
  }

  // 取得題目庫
  const rawQuestions = RN_DATA[category];
    
  if (!rawQuestions || rawQuestions.length === 0) {
    alert("此領域目前無此類題目。");
    exitPractice();
    return;
  }

  // 隨機抽選 5 題（或全部，若庫存少於 5）
  const shuffled = [...rawQuestions].sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffled.slice(0, 5);

  sessionState = {
    category: category,
    questions: selectedQuestions,
    currentIndex: 0,
    score: 0,
    wrongAnswers: [],
    startTime: Date.now(),
    isReviewSession: false
  };

  renderQuestion();
}

function renderQuestion() {
  const container = document.getElementById("practice-active-area");
  const q = sessionState.questions[sessionState.currentIndex];
  const progressPercent = ((sessionState.currentIndex) / sessionState.questions.length) * 100;
  
  let contentHtml = "";

  if (q.id.startsWith("api_")) {
    // 線上 API 題庫渲染
    const catNames = { 
      gk: "綜合英語常識", 
      science: "科學與自然", 
      history: "歷史與文化", 
      geography: "地理與世界", 
      animals: "動物與生態",
      level1: "智能單字 Level 1",
      level2: "智能單字 Level 2",
      level3: "智能單字 Level 3",
      level4: "智能單字 Level 4",
      level5: "智能單字 Level 5",
      vocab: "AI 智能單字",
      grammar: "AI 智能文法",
      reading: "AI 閱讀理解",
      dialogue: "AI 情境對話"
    };
    contentHtml = `
      <div class="quiz-container">
        <div class="quiz-progress-bar-container">
          <div class="quiz-progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="quiz-header-info">
          <span>🌐 線上雲端題庫 • ${catNames[sessionState.category]}</span>
          <span>第 ${sessionState.currentIndex + 1} / ${sessionState.questions.length} 題</span>
        </div>
        <div class="quiz-prompt" style="font-size: 17px; margin: 20px 0; background: rgba(255,255,255,0.01); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); line-height: 1.6;">
          ${q.question}
        </div>
        <div class="quiz-options-list">
          ${q.options.map((opt, i) => `
            <button class="quiz-option-btn" onclick="checkMultipleChoiceAnswer(${i}, ${q.answer})">${opt}</button>
          `).join("")}
        </div>
        <div id="explanation-box"></div>
        <div class="quiz-footer">
          <button class="exit-btn" onclick="exitPractice()">退出練習</button>
          <button class="next-btn" id="next-btn" style="display:none" onclick="goToNextQuestion()">下一題</button>
        </div>
      </div>
    `;
  } else if (q.id.startsWith("rn_") && sessionState.category !== "dialogue") {
    // 護理師專業英文命題 (Multiple Choice)
    const catNames = { pharmacology: "藥理學 (Pharmacology)", medSurg: "內外科護理 (Med-Surg)", pediatric: "兒科護理 (Pediatric)", maternity: "產科婦幼 (Maternity)" };
    contentHtml = `
      <div class="quiz-container">
        <div class="quiz-progress-bar-container">
          <div class="quiz-progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="quiz-header-info">
          <span>${catNames[sessionState.category]} • ${RN_DATA.title}</span>
          <span>第 ${sessionState.currentIndex + 1} / ${sessionState.questions.length} 題</span>
        </div>
        <div class="quiz-prompt" style="font-size: 17px; margin: 20px 0; background: rgba(255,255,255,0.01); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); line-height: 1.6;">
          ${q.question}
        </div>
        <div class="quiz-options-list">
          ${q.options.map((opt, i) => `
            <button class="quiz-option-btn" onclick="checkMultipleChoiceAnswer(${i}, ${q.answer})">${opt}</button>
          `).join("")}
        </div>
        <div id="explanation-box"></div>
        <div class="quiz-footer">
          <button class="exit-btn" onclick="exitPractice()">退出練習</button>
          <button class="next-btn" id="next-btn" style="display:none" onclick="goToNextQuestion()">下一題</button>
        </div>
      </div>
    `;
  } else if (sessionState.category === "vocabulary") {
    contentHtml = `
      <div class="quiz-container">
        <div class="quiz-progress-bar-container">
          <div class="quiz-progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="quiz-header-info">
          <span>單字練習 • ${typeof TOEIC_DATA !== 'undefined' && TOEIC_DATA[state.currentTOEICLevel] ? TOEIC_DATA[state.currentTOEICLevel].title : '英語學習'}</span>
          <span>第 ${sessionState.currentIndex + 1} / ${sessionState.questions.length} 題</span>
        </div>
        <div class="word-to-learn">${q.word}</div>
        <div class="word-phonetic">[${q.partOfSpeech}]</div>
        <div class="quiz-prompt">請選擇正確的單字中文釋義：</div>
        <div class="quiz-options-list">
          ${q.options.map((opt, i) => `
            <button class="quiz-option-btn" onclick="checkMultipleChoiceAnswer(${i}, ${q.answer})">${opt}</button>
          `).join("")}
        </div>
        <div id="explanation-box"></div>
        <div class="quiz-footer">
          <button class="exit-btn" onclick="exitPractice()">退出練習</button>
          <button class="next-btn" id="next-btn" style="display:none" onclick="goToNextQuestion()">下一題</button>
        </div>
      </div>
    `;
  } else if (sessionState.category === "phrases" || sessionState.category === "grammar") {
    const modeTitle = sessionState.category === "phrases" ? "片語練習" : "文法結構";
    contentHtml = `
      <div class="quiz-container">
        <div class="quiz-progress-bar-container">
          <div class="quiz-progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="quiz-header-info">
          <span>${modeTitle} • ${typeof TOEIC_DATA !== 'undefined' && TOEIC_DATA[state.currentTOEICLevel] ? TOEIC_DATA[state.currentTOEICLevel].title : '英語學習'}</span>
          <span>第 ${sessionState.currentIndex + 1} / ${sessionState.questions.length} 題</span>
        </div>
        <div class="quiz-prompt" style="font-size: 22px; margin: 20px 0; background: rgba(255,255,255,0.01); padding: 20px; border-radius: 12px; border: 1px solid var(--border-color)">
          ${q.prompt || q.question}
        </div>
        <div class="quiz-options-list">
          ${q.options.map((opt, i) => `
            <button class="quiz-option-btn" onclick="checkMultipleChoiceAnswer(${i}, ${q.answer})">${opt}</button>
          `).join("")}
        </div>
        <div id="explanation-box"></div>
        <div class="quiz-footer">
          <button class="exit-btn" onclick="exitPractice()">退出練習</button>
          <button class="next-btn" id="next-btn" style="display:none" onclick="goToNextQuestion()">下一題</button>
        </div>
      </div>
    `;
  } else if (sessionState.category === "sentences") {
    // 句子重組
    sessionState.assembledWords = [];
    contentHtml = `
      <div class="quiz-container">
        <div class="quiz-progress-bar-container">
          <div class="quiz-progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="quiz-header-info">
          <span>句型重組 • ${typeof TOEIC_DATA !== 'undefined' && TOEIC_DATA[state.currentTOEICLevel] ? TOEIC_DATA[state.currentTOEICLevel].title : '英語學習'}</span>
          <span>第 ${sessionState.currentIndex + 1} / ${sessionState.questions.length} 題</span>
        </div>
        <div class="quiz-prompt">請依照中文意思重組英文句子：</div>
        <div style="font-size: 18px; font-weight:700; color:var(--text-secondary); margin-bottom:10px;">
          中文：${q.chinese}
        </div>
        <div class="sentence-arrange-box">
          <div class="sentence-target-area" id="sentence-target">
            <span style="color: var(--text-muted); font-size:14px;" id="target-placeholder">點擊下方詞彙進行拼裝...</span>
          </div>
          <div class="word-bank" id="words-bank">
            ${q.words.map((word, i) => `
              <span class="draggable-word-pill" id="pill-${i}" onclick="selectSentenceWord('${word}', ${i})">${word}</span>
            `).join("")}
          </div>
        </div>
        <div id="explanation-box"></div>
        <div class="quiz-footer">
          <button class="exit-btn" onclick="exitPractice()">退出練習</button>
          <div style="display:flex; gap:10px;">
            <button class="exit-btn" id="clear-sentence-btn" onclick="clearSentenceAssembly()">清除</button>
            <button class="next-btn" id="submit-sentence-btn" onclick="submitSentenceAssembly()">確認答案</button>
            <button class="next-btn" id="next-btn" style="display:none" onclick="goToNextQuestion()">下一題</button>
          </div>
        </div>
      </div>
    `;
  } else if (sessionState.category === "dialogue") {
    // 語音口說
    contentHtml = `
      <div class="quiz-container">
        <div class="quiz-progress-bar-container">
          <div class="quiz-progress-bar-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="quiz-header-info">
          <span>口說對話 • ${typeof TOEIC_DATA !== 'undefined' && TOEIC_DATA[state.currentTOEICLevel] ? TOEIC_DATA[state.currentTOEICLevel].title : '英語學習'}</span>
          <span>第 ${sessionState.currentIndex + 1} / ${sessionState.questions.length} 題</span>
        </div>
        <div class="quiz-prompt" style="text-align:center;">聽聽 A 的語音，並朗讀 B 的對答：</div>
        
        <div class="speech-practice-box">
          <div class="dialogue-bubble" id="bubble-role-a">
            <span class="dialogue-speaker">Role A (電腦) <button onclick="playRoleAVoice()" style="background:transparent; border:none; color:var(--primary); cursor:pointer; margin-left:10px;"><i class="fas fa-volume-up"></i> 播音</button></span>
            <div class="dialogue-text">${q.roleA}</div>
            <div class="dialogue-trans">${q.translationA}</div>
          </div>
          
          <div class="dialogue-bubble active" id="bubble-role-b">
            <span class="dialogue-speaker" style="color: var(--secondary)">Role B (你)</span>
            <div class="dialogue-text" id="target-speaking-text">${q.roleB}</div>
            <div class="dialogue-trans">${q.translationB}</div>
          </div>

          <div class="mic-btn-container">
            <button class="mic-btn" id="mic-trigger-btn" onclick="toggleSpeechRecording()">
              <i class="fas fa-microphone"></i>
            </button>
            <span id="mic-status-label" style="font-size:13px; color:var(--text-muted);">點擊麥克風開始朗讀</span>
            <div class="speech-feedback-text" id="speech-recognized-result"></div>
          </div>
        </div>
        
        <div id="explanation-box"></div>
        <div class="quiz-footer">
          <button class="exit-btn" onclick="exitPractice()">退出練習</button>
          <div style="display:flex; gap:10px;">
            <button class="exit-btn" id="skip-mic-btn" onclick="simulateSpeakingRecognition()">直接判定答對 (測試用)</button>
            <button class="next-btn" id="next-btn" style="display:none" onclick="goToNextQuestion()">下一題</button>
          </div>
        </div>
      </div>
    `;
    
    // 自動播放 Role A
    setTimeout(() => {
      playRoleAVoice();
    }, 800);
  }

  container.innerHTML = contentHtml;
}

// 1. 單選題核對答 (單字/片語/文法)
function checkMultipleChoiceAnswer(selectedIndex, correctIndex) {
  const btns = document.querySelectorAll(".quiz-option-btn");
  // 禁用所有按鈕
  btns.forEach(btn => btn.disabled = true);

  const q = sessionState.questions[sessionState.currentIndex];
  const isCorrect = selectedIndex === correctIndex;

  if (isCorrect) {
    btns[selectedIndex].classList.add("correct");
    sessionState.score += 1;
  } else {
    btns[selectedIndex].classList.add("incorrect");
    btns[correctIndex].classList.add("correct");
    sessionState.wrongAnswers.push(q);
  }

  // 呈現解析
  const expBox = document.getElementById("explanation-box");
  let transHtml = "";
  if (state.examGoal !== "rn" && (q.sentenceTranslation || q.translation)) {
    transHtml = `<p><strong>範例翻譯：</strong>${q.sentenceTranslation || q.translation || ''}</p>`;
  }

  // 文法挑錯模式：顯示每個選項的詳細解析
  let grammarDetailsHtml = "";
  if (q.optionDetails && q.optionDetails.length > 0) {
    grammarDetailsHtml = `
      <div style="margin-top:14px; border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;">
        <h4 style="font-size:15px; margin-bottom:10px; color:var(--text-secondary);">📝 各選項逐一解析：</h4>
        ${q.optionDetails.map((detail, i) => `
          <div style="padding:10px 12px; margin-bottom:8px; border-radius:8px; background:${detail.isCorrect ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.08)'}; border-left:3px solid ${detail.isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'}; font-size:14px; line-height:1.6;">
            <span style="color:${detail.isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'}; font-weight:600;">選項 ${String.fromCharCode(65 + i)}：</span>
            ${detail.errorExplanation}
          </div>
        `).join("")}
      </div>
    `;
  }
  
  expBox.innerHTML = `
    <div class="explanation-card">
      <h4>${isCorrect ? '✨ 回答正確！' : '❌ 答錯了，看解析學習：'}</h4>
      <p><strong>題目內文：</strong>${q.sentence || q.prompt || q.question}</p>
      ${transHtml}
      <p style="margin-top:10px;"><strong>回饋解析：</strong>${q.explanation}</p>
      ${grammarDetailsHtml}
    </div>
  `;

  document.getElementById("next-btn").style.display = "block";
}

// 2. 句型重組按鈕動作
function selectSentenceWord(word, index) {
  const pill = document.getElementById(`pill-${index}`);
  if (pill.classList.contains("used")) return;

  pill.classList.add("used");
  sessionState.assembledWords.push({ word, index });
  renderSentenceAssembly();
}

function renderSentenceAssembly() {
  const targetArea = document.getElementById("sentence-target");
  const placeholder = document.getElementById("target-placeholder");
  
  if (sessionState.assembledWords.length === 0) {
    targetArea.innerHTML = `<span style="color: var(--text-muted); font-size:14px;" id="target-placeholder">點擊下方詞彙進行拼裝...</span>`;
    return;
  }

  targetArea.innerHTML = sessionState.assembledWords.map((item, i) => `
    <span class="draggable-word-pill" onclick="removeSentenceWord(${i})">${item.word}</span>
  `).join("");
}

function removeSentenceWord(assemblyIndex) {
  const removed = sessionState.assembledWords.splice(assemblyIndex, 1)[0];
  const pill = document.getElementById(`pill-${removed.index}`);
  if (pill) pill.classList.remove("used");
  renderSentenceAssembly();
}

function clearSentenceAssembly() {
  sessionState.assembledWords = [];
  document.querySelectorAll(".draggable-word-pill").forEach(p => p.classList.remove("used"));
  renderSentenceAssembly();
}

function submitSentenceAssembly() {
  const q = sessionState.questions[sessionState.currentIndex];
  const userOrder = sessionState.assembledWords.map(w => w.index);
  const correctOrder = q.correctOrder;
  
  // 檢查是否正確拼出
  let isCorrect = userOrder.length === correctOrder.length;
  if (isCorrect) {
    for (let i = 0; i < correctOrder.length; i++) {
      if (userOrder[i] !== correctOrder[i]) {
        isCorrect = false;
        break;
      }
    }
  }

  const targetArea = document.getElementById("sentence-target");
  const clearBtn = document.getElementById("clear-sentence-btn");
  const submitBtn = document.getElementById("submit-sentence-btn");

  clearBtn.style.display = "none";
  submitBtn.style.display = "none";

  if (isCorrect) {
    targetArea.style.borderColor = "var(--accent-green)";
    targetArea.style.background = "rgba(16, 185, 129, 0.1)";
    sessionState.score += 1;
  } else {
    targetArea.style.borderColor = "var(--accent-red)";
    targetArea.style.background = "rgba(239, 68, 68, 0.1)";
    sessionState.wrongAnswers.push(q);
  }

  // 呈現解答與解析
  const expBox = document.getElementById("explanation-box");
  expBox.innerHTML = `
    <div class="explanation-card">
      <h4>${isCorrect ? '✨ 回答正確！' : '❌ 答錯了，標準句子結構：'}</h4>
      <p style="font-size:18px; color: var(--primary); font-weight:700; margin-bottom:8px;">
        ${q.correctOrder.map(idx => q.words[idx]).join(" ")}
      </p>
      <p><strong>回饋解析：</strong>${q.explanation}</p>
    </div>
  `;

  document.getElementById("next-btn").style.display = "block";
}

// 3. 口說練習語音播放與辨識
function playRoleAVoice() {
  const q = sessionState.questions[sessionState.currentIndex];
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(q.roleA);
    utterance.lang = 'en-US';
    // 尋找英文發音
    const voices = speechSynthesis.getVoices();
    const enVoice = voices.find(voice => voice.lang.startsWith('en-'));
    if (enVoice) utterance.voice = enVoice;
    speechSynthesis.speak(utterance);
  } else {
    console.log("此瀏覽器不支援 Speech Synthesis");
  }
}

let isRecording = false;
function toggleSpeechRecording() {
  if (!recognition) {
    alert("您的瀏覽器不支援 Speech Recognition。推薦使用 Chrome 瀏覽器測試口說功能！");
    return;
  }

  const micBtn = document.getElementById("mic-trigger-btn");
  const micStatus = document.getElementById("mic-status-label");
  const resultDiv = document.getElementById("speech-recognized-result");

  if (isRecording) {
    recognition.stop();
    return;
  }

  isRecording = true;
  micBtn.classList.add("recording");
  micStatus.innerText = "正在聆聽... 請朗讀 Role B 的英文句子";
  resultDiv.innerText = "";

  recognition.start();

  recognition.onresult = (event) => {
    const resultText = event.results[0][0].transcript;
    resultDiv.innerText = `辨識結果："${resultText}"`;
    checkSpeakingAccuracy(resultText);
  };

  recognition.onerror = (event) => {
    console.error("語音辨識錯誤", event.error);
    micStatus.innerText = "語音辨識出錯，請再點擊一次重試";
    stopRecordingUI();
  };

  recognition.onend = () => {
    stopRecordingUI();
  };
}

function stopRecordingUI() {
  isRecording = false;
  const micBtn = document.getElementById("mic-trigger-btn");
  const micStatus = document.getElementById("mic-status-label");
  micBtn.classList.remove("recording");
  if (micStatus.innerText === "正在聆聽... 請朗讀 Role B 的英文句子") {
    micStatus.innerText = "錄音結束，點擊麥克風重新朗讀";
  }
}

function checkSpeakingAccuracy(spokenText) {
  const q = sessionState.questions[sessionState.currentIndex];
  const targetText = q.roleB.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
  const cleanSpoken = spokenText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");

  // 計算重疊詞彙比例
  const targetWords = targetText.split(/\s+/);
  const spokenWords = cleanSpoken.split(/\s+/);
  
  let matchCount = 0;
  targetWords.forEach(w => {
    if (spokenWords.includes(w)) {
      matchCount++;
    }
  });

  const accuracy = matchCount / targetWords.length;
  const isPass = accuracy >= 0.6; // 達到 60% 詞彙重合就判定答對

  const resultDiv = document.getElementById("speech-recognized-result");
  const micTrigger = document.getElementById("mic-trigger-btn");

  if (isPass) {
    resultDiv.innerHTML = `<span style="color:var(--accent-green); font-weight:700;">✓ 辨識成功！吻合率：${Math.round(accuracy*100)}%</span><br>"${spokenText}"`;
    micTrigger.style.display = "none";
    document.getElementById("mic-status-label").style.display = "none";
    sessionState.score += 1;
    
    // 口說任務進度加算
    updateQuestProgress("speaking", 1);
    
    showSpeakingExplanation(true);
  } else {
    resultDiv.innerHTML = `<span style="color:var(--accent-red); font-weight:700;">✗ 吻合率過低（${Math.round(accuracy*100)}%），請重新朗讀</span><br>"${spokenText}"`;
  }
}

// 模擬口說 (fallback，用於無麥克風環境)
function simulateSpeakingRecognition() {
  const q = sessionState.questions[sessionState.currentIndex];
  const resultDiv = document.getElementById("speech-recognized-result");
  resultDiv.innerHTML = `<span style="color:var(--accent-green); font-weight:700;">✓ 模擬語音輸入通過！</span>`;
  document.getElementById("mic-trigger-btn").style.display = "none";
  document.getElementById("mic-status-label").style.display = "none";
  sessionState.score += 1;
  updateQuestProgress("speaking", 1);
  showSpeakingExplanation(true);
}

function showSpeakingExplanation(isCorrect) {
  const q = sessionState.questions[sessionState.currentIndex];
  const expBox = document.getElementById("explanation-box");
  expBox.innerHTML = `
    <div class="explanation-card">
      <h4>✨ 對話口說解析：</h4>
      <p><strong>口說表達點評：</strong>對話著重於商務情境的適當回覆。</p>
      <p><strong>回饋解析：</strong>${q.explanation}</p>
    </div>
  `;
  document.getElementById("next-btn").style.display = "block";
}

// 4. 下一題或結算
function goToNextQuestion() {
  sessionState.currentIndex += 1;
  if (sessionState.currentIndex < sessionState.questions.length) {
    if (sessionState.isReviewSession) {
      startNextReviewQuestion();
    } else {
      renderQuestion();
    }
  } else {
    showSessionSummary();
  }
}

// 退出練習
function exitPractice() {
  if (confirm("您確定要退出練習嗎？目前的練習進度將不會被保存。")) {
    sessionState = null;
    document.getElementById("practice-active-area").style.display = "none";
    
    // 恢復選單與標題顯示
    const practiceHeader = document.querySelector(".practice-header");
    const practiceGrid = document.querySelector(".practice-menu-grid");
    if (practiceHeader) practiceHeader.style.display = "flex";
    if (practiceGrid) practiceGrid.style.display = "grid";
    
    const activeNavItem = document.querySelector(".nav-item.active");
    const target = activeNavItem ? activeNavItem.dataset.target : "dashboard";
    document.querySelectorAll(".content-section").forEach(s => {
      if (s.id === `${target}-section`) {
        s.classList.add("active");
      } else {
        s.classList.remove("active");
      }
    });
    initDashboard();
  }
}

// 5. 顯示結算畫面
function showSessionSummary() {
  const container = document.getElementById("practice-active-area");
  
  // 計算總耗時與週學習時間
  const timeSpentSec = Math.round((Date.now() - sessionState.startTime) / 1000);
  const minutesSpent = Math.max(1, Math.round(timeSpentSec / 60));
  
  // 更新今天週學習分鐘數
  const todayIndex = getTodayIndex();
  state.weeklyMinutes[todayIndex] = (state.weeklyMinutes[todayIndex] || 0) + minutesSpent;

  // 計算獲得的金幣與經驗值
  const baseCoins = sessionState.score * 5;
  const baseExp = sessionState.score * 10;
  
  // 連擊加成 (加成百分比 = 連擊天數 * 5%，最大 50%)
  const streakMultiplier = 1 + Math.min(state.streak * 0.05, 0.5);
  const finalCoins = Math.round(baseCoins * streakMultiplier);
  const finalExp = Math.round(baseExp * streakMultiplier);

  // 寫回 State 數據
  state.coins += finalCoins;
  state.exp += finalExp;
  
  state.stats.totalQuestions += sessionState.questions.length;
  state.stats.correctQuestions += sessionState.score;
  state.stats.totalTimeSpent += timeSpentSec;
  
  state.stats.categoryCounts[sessionState.category] = (state.stats.categoryCounts[sessionState.category] || 0) + sessionState.questions.length;
  state.stats.categoryCorrect[sessionState.category] = (state.stats.categoryCorrect[sessionState.category] || 0) + sessionState.score;

  // 處理答錯的題目加入複習箱
  const tomorrowStr = getTomorrowString();
  sessionState.wrongAnswers.forEach(q => {
    // 檢查複習箱中是否已存在此題，若不存在則加入
    if (!state.reviewBox.some(item => item.id === q.id)) {
      state.reviewBox.push({
        id: q.id,
        level: state.currentTOEICLevel,
        type: sessionState.category,
        questionData: q,
        boxNum: 1,
        nextReviewDate: tomorrowStr
      });
    } else {
      // 若存在，重置其等級到 Box 1，並且設為明天複習
      const index = state.reviewBox.findIndex(item => item.id === q.id);
      state.reviewBox[index].boxNum = 1;
      state.reviewBox[index].nextReviewDate = tomorrowStr;
    }
  });

  // 如果是在複習模式
  if (sessionState.isReviewSession) {
    // 處理複習成功的項目
    sessionState.questions.forEach((q, idx) => {
      const isCorrect = !sessionState.wrongAnswers.some(w => w.id === q.id);
      const reviewIndex = state.reviewBox.findIndex(item => item.id === q.id);
      
      if (reviewIndex !== -1) {
        if (isCorrect) {
          const currentBox = state.reviewBox[reviewIndex].boxNum;
          if (currentBox >= 3) {
            // Box 3 答對直接畢業 (Graduate)
            state.reviewBox.splice(reviewIndex, 1);
            updateQuestProgress("review", 1);
          } else {
            // 升級 Box
            const nextBox = currentBox + 1;
            const nextReview = getIntervalDate(nextBox === 2 ? 3 : 7); // Box 2 過 3天，Box 3 過 7天
            state.reviewBox[reviewIndex].boxNum = nextBox;
            state.reviewBox[reviewIndex].nextReviewDate = nextReview;
          }
        } else {
          // 答錯，降回 Box 1
          state.reviewBox[reviewIndex].boxNum = 1;
          state.reviewBox[reviewIndex].nextReviewDate = tomorrowStr;
        }
      }
    });
  }

  // 任務進度更新
  if (sessionState.category === "vocabulary" || sessionState.category.startsWith("level")) {
    updateQuestProgress("vocab", sessionState.questions.length);
  }
  updateQuestProgress("time", minutesSpent);

  saveState();
  checkLevelUp();
  checkBadgeUnlocks();

  const successRate = Math.round((sessionState.score / sessionState.questions.length) * 100);

  container.innerHTML = `
    <div class="quiz-container summary-container">
      <div class="summary-illustration">${successRate >= 80 ? '🎉' : '💪'}</div>
      <h2>練習完成！</h2>
      <p style="color:var(--text-secondary);">${successRate >= 80 ? '表現優異！這堂練習難不倒你！' : '再接再厲！錯誤的題目已幫您自動整理到「複習箱」中。'}</p>
      
      <div class="summary-stats">
        <div class="summary-stat-box">
          <div class="summary-stat-val">${sessionState.score} / ${sessionState.questions.length}</div>
          <div class="summary-stat-label">答對題數</div>
        </div>
        <div class="summary-stat-box">
          <div class="summary-stat-val">🪙 +${finalCoins}</div>
          <div class="summary-stat-label">獲得金幣 (連擊加成)</div>
        </div>
        <div class="summary-stat-box">
          <div class="summary-stat-val">EXP +${finalExp}</div>
          <div class="summary-stat-label">獲得經驗值</div>
        </div>
      </div>

      <div class="quiz-footer" style="justify-content:center; width:100%;">
        <button class="next-btn" onclick="finishPracticeCleanup()">回到儀表板</button>
      </div>
    </div>
  `;
}

function finishPracticeCleanup() {
  sessionState = null;
  document.getElementById("practice-active-area").style.display = "none";
  
  // 恢復選單與標題顯示
  const practiceHeader = document.querySelector(".practice-header");
  const practiceGrid = document.querySelector(".practice-menu-grid");
  if (practiceHeader) practiceHeader.style.display = "flex";
  if (practiceGrid) practiceGrid.style.display = "grid";
  
  const activeNavItem = document.querySelector(".nav-item.active");
  const target = activeNavItem ? activeNavItem.dataset.target : "dashboard";
  document.querySelectorAll(".content-section").forEach(s => {
    if (s.id === `${target}-section`) {
      s.classList.add("active");
    } else {
      s.classList.remove("active");
    }
  });
  initDashboard();
}

// --- 複習箱機制 (Leitner Review System) ---
function updateReviewBoxCounts() {
  const box1El = document.getElementById("review-box-1-count");
  const box2El = document.getElementById("review-box-2-count");
  const box3El = document.getElementById("review-box-3-count");

  if (!box1El) return;

  const b1 = state.reviewBox.filter(item => item.boxNum === 1).length;
  const b2 = state.reviewBox.filter(item => item.boxNum === 2).length;
  const b3 = state.reviewBox.filter(item => item.boxNum === 3).length;

  box1El.innerText = b1;
  box2El.innerText = b2;
  box3El.innerText = b3;
}

function renderReviewBoxList() {
  const container = document.getElementById("review-items-container");
  if (!container) return;

  const todayStr = getTodayString();
  const waitingReviews = state.reviewBox.filter(item => item.nextReviewDate <= todayStr);

  if (waitingReviews.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--text-secondary); background:rgba(255,255,255,0.01); border-radius:12px; border:1px solid var(--border-color);">
        <i class="fas fa-check-circle" style="font-size:32px; color:var(--accent-green); margin-bottom:12px;"></i>
        <p style="font-size:16px; font-weight:600;">目前複習箱中沒有待複習的題目！</p>
        <p style="font-size:13px; margin-top:4px;">答錯的題目在 1 天、3 天、7 天後會自動回到複習清單。</p>
      </div>
    `;
    document.getElementById("start-all-reviews").style.display = "none";
    return;
  }

  document.getElementById("start-all-reviews").style.display = "block";
  document.getElementById("start-all-reviews").innerText = `開始複習全部 (${waitingReviews.length} 題)`;

  container.innerHTML = waitingReviews.map(item => {
    let wordName = "";
    let wordTranslation = "";

    if (item.type === "vocabulary") {
      wordName = item.questionData.word;
      wordTranslation = `[單字] ${item.questionData.translation}`;
    } else if (item.type === "phrases") {
      wordName = item.questionData.phrase;
      wordTranslation = `[片語] ${item.questionData.translation}`;
    } else if (item.type === "grammar") {
      wordName = "文法填充題";
      wordTranslation = item.questionData.question.substring(0, 40) + "...";
    } else if (item.type === "sentences") {
      wordName = "句型重組";
      wordTranslation = item.questionData.chinese;
    } else if (item.type === "dialogue") {
      wordName = `對話口說: ${item.questionData.title}`;
      wordTranslation = item.questionData.roleB.substring(0, 40) + "...";
    }

    return `
      <div class="review-item-card">
        <div class="review-item-left">
          <div class="review-item-word">${wordName} <span>${item.level.toUpperCase()} 證書</span></div>
          <div class="review-item-desc">${wordTranslation}</div>
          <div class="review-item-meta">
            <span><i class="fas fa-archive"></i> 複習箱 ${item.boxNum}</span>
            <span><i class="fas fa-calendar-alt"></i> 待複習時間：${item.nextReviewDate}</span>
          </div>
        </div>
        <button class="review-action-btn" onclick="startSingleReview('${item.id}')">單題複習</button>
      </div>
    `;
  }).join("");
}

function startReviewSession() {
  const todayStr = getTodayString();
  const waitingReviews = state.reviewBox.filter(item => item.nextReviewDate <= todayStr);
  
  if (waitingReviews.length === 0) return;

  // 隨機抽 5 題複習
  const selected = waitingReviews.slice(0, 5).map(item => item.questionData);
  
  // 建立複習練習 Session
  sessionState = {
    category: "review_mix", // 混和模式，從 questionData 推斷
    questions: selected,
    currentIndex: 0,
    score: 0,
    wrongAnswers: [],
    startTime: Date.now(),
    isReviewSession: true
  };

  // 動態判斷 category 進行渲染
  startNextReviewQuestion();
}

function startSingleReview(itemId) {
  const item = state.reviewBox.find(i => i.id === itemId);
  if (!item) return;

  sessionState = {
    category: "review_mix",
    questions: [item.questionData],
    currentIndex: 0,
    score: 0,
    wrongAnswers: [],
    startTime: Date.now(),
    isReviewSession: true
  };

  startNextReviewQuestion();
}

function startNextReviewQuestion() {
  // 切換到練習模式視窗
  document.getElementById("dashboard-section").classList.remove("active");
  document.getElementById("review-section").classList.remove("active");
  document.getElementById("practice-section").classList.add("active");
  
  // 隱藏練習區選單與標題
  const practiceHeader = document.querySelector(".practice-header");
  const practiceGrid = document.querySelector(".practice-menu-grid");
  if (practiceHeader) practiceHeader.style.display = "none";
  if (practiceGrid) practiceGrid.style.display = "none";
  
  const practiceActiveArea = document.getElementById("practice-active-area");
  practiceActiveArea.style.display = "block";

  const q = sessionState.questions[sessionState.currentIndex];
  // 從 ID 前綴與資料比對找出此題的 category
  let matchedCategory = "vocabulary";
  if (q.id.startsWith("api_")) {
    const parts = q.id.split("_");
    matchedCategory = parts[1]; // gk, science, history, geography, animals
  } else if (q.id.startsWith("rn_")) {
    if (q.id.includes("_ph")) matchedCategory = "pharmacology";
    else if (q.id.includes("_ms")) matchedCategory = "medSurg";
    else if (q.id.includes("_pe")) matchedCategory = "pediatric";
    else if (q.id.includes("_ma")) matchedCategory = "maternity";
    else if (q.id.includes("_di")) matchedCategory = "dialogue";
  } else {
    if (q.id.includes("_p")) matchedCategory = "phrases";
    else if (q.id.includes("_g")) matchedCategory = "grammar";
    else if (q.id.includes("_s")) matchedCategory = "sentences";
    else if (q.id.includes("_d")) matchedCategory = "dialogue";
  }

  sessionState.category = matchedCategory;
  renderQuestion();
}

// (goToNextQuestion 已在上方整合)

// --- 週進度分析 (Weekly Analysis) ---
function updateAnalysisSection() {
  // 1. 週學習時數長條圖
  const maxMins = Math.max(...state.weeklyMinutes, 10); // 防止除以 0
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const todayIndex = getTodayIndex();

  const chartContainer = document.getElementById("weekly-bar-chart-container");
  if (chartContainer) {
    chartContainer.innerHTML = state.weeklyMinutes.map((mins, idx) => {
      const heightPercent = (mins / maxMins) * 100;
      const isToday = idx === todayIndex;
      return `
        <div class="chart-bar-col">
          <span class="chart-bar-val">${mins}分</span>
          <div class="chart-bar-fill" style="height: ${heightPercent}%; ${isToday ? 'background: linear-gradient(180deg, var(--secondary), var(--primary)); border:1px solid #fff;' : ''}"></div>
          <span class="chart-bar-label">${days[idx]}</span>
        </div>
      `;
    }).join("");
  }

  // 2. 五大模組答對率進度條
  let categories = ["level1", "level2", "level3", "level4", "level5"];
  let catNames = { level1: "Level 1", level2: "Level 2", level3: "Level 3", level4: "Level 4", level5: "Level 5" };

  if (state.examGoal === "rn") {
    categories = ["pharmacology", "medSurg", "pediatric", "maternity", "dialogue"];
    catNames = { pharmacology: "藥理學", medSurg: "內外科護理", pediatric: "兒科護理", maternity: "產科婦幼", dialogue: "臨床口說" };
  } else if (state.examGoal === "api") {
    categories = ["gk", "science", "history", "geography", "animals"];
    catNames = { gk: "綜合常識", science: "科學自然", history: "歷史文化", geography: "地理世界", animals: "動物生態" };
  } else if (state.examGoal === "gemini") {
    categories = ["vocab", "grammar", "reading", "dialogue", "speaking"];
    catNames = { vocab: "AI 單字", grammar: "AI 文法", reading: "AI 閱讀", dialogue: "AI 對話", speaking: "AI 口說" };
  }

  const skillContainer = document.getElementById("skill-analysis-container");
  if (skillContainer) {
    skillContainer.innerHTML = categories.map(cat => {
      const total = state.stats.categoryCounts[cat] || 0;
      const correct = state.stats.categoryCorrect[cat] || 0;
      const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
      return `
        <div class="skill-analysis-item">
          <div class="skill-analysis-info">
            <span class="skill-analysis-name">${catNames[cat]}</span>
            <span class="skill-analysis-pct">${rate}% (${correct}/${total} 題)</span>
          </div>
          <div class="skill-bar-bg">
            <div class="skill-bar-fill" style="width: ${rate}%"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  // 3. 基本數據彙整
  const studyRate = state.stats.totalQuestions > 0 ? Math.round((state.stats.correctQuestions / state.stats.totalQuestions)*100) : 0;
  document.getElementById("analysis-total-questions").innerText = state.stats.totalQuestions;
  document.getElementById("analysis-correct-rate").innerText = `${studyRate}%`;
  document.getElementById("analysis-total-hours").innerText = `${Math.round(state.stats.totalTimeSpent / 60)} 分鐘`;
}

// --- 商店與成就系統 (Store & Achievements) ---
function updateStoreSection() {
  // 遍歷所有商店按鈕更新狀態
  document.querySelectorAll(".store-buy-btn").forEach(btn => {
    const theme = btn.dataset.theme;
    if (state.equippedTheme === theme) {
      btn.innerText = "已套用";
      btn.className = "store-buy-btn equipped";
    } else if (state.unlockedThemes.includes(theme)) {
      btn.innerText = "套用此主題";
      btn.className = "store-buy-btn";
      btn.disabled = false;
    } else {
      btn.innerHTML = `<i class="fas fa-coins"></i> 購買 (50 🪙)`;
      btn.className = "store-buy-btn";
      btn.disabled = false;
    }
  });

  // 更新成就卡片
  renderBadgesPanel();
}

function purchaseTheme(theme, cost, btn) {
  if (state.unlockedThemes.includes(theme)) {
    // 已經解鎖，點擊進行套用
    state.equippedTheme = theme;
    saveState();
    applyEquippedTheme();
    updateStoreSection();
    showFloatingNotification("已套用新主題！");
    return;
  }

  if (state.coins < cost) {
    alert("金幣不足，請多練習題目賺取金幣！");
    return;
  }

  if (confirm(`確定要花費 🪙${cost} 購買此主題顏色嗎？`)) {
    state.coins -= cost;
    state.unlockedThemes.push(theme);
    state.equippedTheme = theme;
    saveState();
    applyEquippedTheme();
    updateStoreSection();
    showFloatingNotification("購買成功並已套用主題！");
  }
}

// 成就規則列表
const BADGES_LIST = [
  { id: "badge_rookie", name: "初試啼聲", desc: "完成 10 題多益練習", icon: "🌱", condition: () => state.stats.totalQuestions >= 10 },
  { id: "badge_expert", name: "多益學者", desc: "累積答對 50 題", icon: "📖", condition: () => state.stats.correctQuestions >= 50 },
  { id: "badge_streak", name: "持之以恆", desc: "連續學習天數達 3 天", icon: "🔥", condition: () => state.streak >= 3 },
  { id: "badge_speaking", name: "英語演說家", desc: "完成 5 題口說對話", icon: "🗣️", condition: () => (state.stats.categoryCorrect["dialogue"] || 0) >= 5 },
  { id: "badge_rich", name: "多益富豪", desc: "累積擁有 150 枚金幣", icon: "💎", condition: () => state.coins >= 150 }
];

function checkBadgeUnlocks() {
  let badgeUnlocked = false;
  BADGES_LIST.forEach(badge => {
    if (!state.unlockedBadges.includes(badge.id)) {
      if (badge.condition()) {
        state.unlockedBadges.push(badge.id);
        badgeUnlocked = true;
        showFloatingNotification(`解鎖成就：【${badge.name}】！`);
      }
    }
  });

  if (badgeUnlocked) {
    saveState();
  }
}

function renderBadgesPanel() {
  const container = document.getElementById("badges-grid-container");
  if (!container) return;

  container.innerHTML = BADGES_LIST.map(badge => {
    const isLocked = !state.unlockedBadges.includes(badge.id);
    return `
      <div class="badge-card ${isLocked ? 'locked' : ''}">
        <div class="badge-icon-box">${badge.icon}</div>
        <div class="badge-card-info">
          <span class="badge-card-name">${badge.name}</span>
          <span class="badge-card-desc">${badge.desc}</span>
        </div>
        <span class="badge-status-tag">${isLocked ? '未解鎖' : '已解鎖'}</span>
      </div>
    `;
  }).join("");
}

// --- 實用輔助函數 (Helpers) ---
function getTodayString() {
  const d = new Date();
  return dateToString(d);
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateToString(d);
}

function getTomorrowString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dateToString(d);
}

function getIntervalDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateToString(d);
}

function dateToString(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 取得今天星期幾索引 (0=星期一, 6=星期日)
function getTodayIndex() {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

// 背景計時器，計算在頁面停留的時間並微調今日學習時間
let activeSeconds = 0;
function trackActiveTime() {
  setInterval(() => {
    activeSeconds += 1;
    // 每 60 秒將其寫入當天學習時數中
    if (activeSeconds >= 60) {
      activeSeconds = 0;
      const todayIndex = getTodayIndex();
      state.weeklyMinutes[todayIndex] = (state.weeklyMinutes[todayIndex] || 0) + 1;
      
      // 更新任務
      updateQuestProgress("time", 1);
      
      // 不頻繁存檔，此處僅累加，完成練習或切換頁面會一併 saveState
    }
  }, 1000);
}

// --- 9. 自動備份資料夾與 IndexedDB 存取實作 ---
async function initDirectoryHandle() {
  if ('showDirectoryPicker' in window) {
    try {
      directoryHandle = await getStoredHandle();
      if (directoryHandle) {
        // 驗證是否已有授權，如果沒有則不要在背景直接 requestPermission (會拋出異常)，僅更新 UI
        const options = { mode: 'readwrite' };
        if ((await directoryHandle.queryPermission(options)) === 'granted') {
          updateBackupUIStatus("success");
          autoSaveToFileSystem();
        } else {
          updateBackupUIStatus("need_auth");
        }
      } else {
        updateBackupUIStatus("unconfigured");
      }
    } catch (e) {
      console.error("備份資料夾初始化失敗", e);
      updateBackupUIStatus("error");
    }
  } else {
    updateBackupUIStatus("not_supported");
  }
}

async function handleSetBackupDirectory() {
  if (!('showDirectoryPicker' in window)) {
    alert("此瀏覽器不支援本機自動備份資料夾功能。請使用 Chrome 或 Edge 瀏覽器開啟！");
    return;
  }
  try {
    directoryHandle = await window.showDirectoryPicker();
    await setStoredHandle(directoryHandle);
    
    // 請求寫入授權
    const authorized = await verifyPermission(directoryHandle, true);
    if (authorized) {
      showFloatingNotification("自動備份資料夾設定完成！");
      await autoSaveToFileSystem();
    }
    renderUserModal();
  } catch (err) {
    console.warn("使用者取消了資料夾選取", err);
  }
}

async function autoSaveToFileSystem() {
  if (!directoryHandle) return;
  try {
    const options = { mode: 'readwrite' };
    if ((await directoryHandle.queryPermission(options)) !== 'granted') {
      updateBackupUIStatus("need_auth");
      return;
    }

    // 在該資料夾下建立/取得檔案 progress_<使用者名稱>.json
    const fileHandle = await directoryHandle.getFileHandle(`progress_${currentUser}.json`, { create: true });
    const writable = await fileHandle.createWritable();
    
    const dataToSave = {
      username: currentUser,
      savedAt: new Date().toISOString(),
      state: state
    };
    
    await writable.write(JSON.stringify(dataToSave, null, 2));
    await writable.close();
    
    updateBackupUIStatus("success");
  } catch (err) {
    console.error("寫入自動備份檔案失敗", err);
    updateBackupUIStatus("error");
  }
}

function updateBackupUIStatus(status) {
  const badge = document.getElementById("backup-status-badge");
  const label = document.getElementById("backup-path-label");
  if (!badge || !label) return;

  badge.className = "backup-dir-indicator";
  if (status === "success") {
    badge.classList.add("configured");
    badge.innerHTML = `<i class="fas fa-check-circle"></i> 已啟用`;
    label.innerHTML = `<span style="color:#34d399;">✓ 自動背景同步備份中。</span>每次練習完成後皆會自動寫入最新進度。`;
  } else if (status === "need_auth") {
    badge.classList.add("unconfigured");
    badge.innerHTML = `<i class="fas fa-exclamation-circle"></i> 需授權`;
    label.innerHTML = `<span style="color:#fbbf24; cursor:pointer;" onclick="handleRequestActivePermission()"><i class="fas fa-key"></i> 瀏覽器需要授權本機寫入。請點此取得授權</span>`;
  } else if (status === "unconfigured") {
    badge.classList.add("unconfigured");
    badge.innerHTML = `<i class="fas fa-folder"></i> 未設定`;
    label.innerText = "尚未設定自動備份資料夾，進度目前僅儲存在瀏覽器的緩存中。";
  } else if (status === "not_supported") {
    badge.classList.add("unconfigured");
    badge.innerHTML = `<i class="fas fa-ban"></i> 不支援`;
    label.innerText = "您的瀏覽器不支援本機自動背景同步。建議更換為 Chrome 或 Edge 瀏覽器。";
    const setBtn = document.getElementById("set-backup-dir-btn");
    if (setBtn) setBtn.style.display = "none";
  } else {
    badge.classList.add("unconfigured");
    badge.innerHTML = `<i class="fas fa-times-circle"></i> 備份失敗`;
    label.innerText = "無法存取備份資料夾，可能已被移動或移除，請重新設定。";
  }
}

async function handleRequestActivePermission() {
  if (!directoryHandle) return;
  try {
    const authorized = await verifyPermission(directoryHandle, true);
    if (authorized) {
      showFloatingNotification("自動備份授權取得成功！");
      await autoSaveToFileSystem();
      renderUserModal();
    }
  } catch (err) {
    console.error("請求授權失敗", err);
  }
}

function updateBackupStatusUI() {
  if (!directoryHandle) {
    updateBackupUIStatus("unconfigured");
    return;
  }
  // 檢查權限
  const options = { mode: 'readwrite' };
  directoryHandle.queryPermission(options).then(perm => {
    if (perm === 'granted') {
      updateBackupUIStatus("success");
    } else {
      updateBackupUIStatus("need_auth");
    }
  });
}

// --- 10. 護理師/多益 雙考試切換器實作 ---
function switchExamGoal(goal) {
  if (state.examGoal === goal) return;
  state.examGoal = goal;
  saveState();
  
  updateExamGoalUI();
  initDashboard();

  if (sessionState) {
    sessionState = null;
    document.getElementById("practice-active-area").style.display = "none";
  }
}

function updateExamGoalUI() {
  const dictBtn = document.getElementById("exam-switch-dict");
  const rnBtn = document.getElementById("exam-switch-rn");
  const apiBtn = document.getElementById("exam-switch-api");
  const geminiBtn = document.getElementById("exam-switch-gemini");
  if (dictBtn && rnBtn && apiBtn && geminiBtn) {
    dictBtn.classList.remove("active");
    rnBtn.classList.remove("active");
    apiBtn.classList.remove("active");
    geminiBtn.classList.remove("active");

    if (state.examGoal === "rn") {
      rnBtn.classList.add("active");
      document.getElementById("welcome-title").innerText = `Hi, 護理挑戰者!`;
      document.getElementById("welcome-sub-desc").innerText = "點選下方護理師學科，隨時進行英文命題的實戰練習！";
    } else if (state.examGoal === "api") {
      apiBtn.classList.add("active");
      document.getElementById("welcome-title").innerText = `Hi, 國際挑戰者!`;
      document.getElementById("welcome-sub-desc").innerText = "這項題庫透過雲端公開 API 聯網生成，提供無限的跨學科常識與英語閱讀測驗！";
    } else if (state.examGoal === "gemini") {
      geminiBtn.classList.add("active");
      document.getElementById("welcome-title").innerText = `Hi, AI 探索者!`;
      document.getElementById("welcome-sub-desc").innerText = "整合 Google Gemini AI 智能出題，依據您的能力等級與練習弱點，即時量身打造高水準英文題目！";
    } else {
      dictBtn.classList.add("active");
      document.getElementById("welcome-title").innerText = `Hi, 單字挑戰者!`;
      document.getElementById("welcome-sub-desc").innerText = "串接免費 Free Dictionary API，帶您由淺入深，透過上下文精準掌握分級英語單字！";
    }
  }

  // 切換 Dashboard Level 選擇卡
  const headerCard = document.querySelector(".section-card h3");
  if (headerCard) {
    const levelSelectCard = headerCard.parentNode;
    if (levelSelectCard) {
      let rnIntro = document.getElementById("rn-intro-block");
      let apiIntro = document.getElementById("api-intro-block");
      let dictIntro = document.getElementById("dict-intro-block");
      let geminiIntro = document.getElementById("gemini-intro-block");
      if (rnIntro) rnIntro.style.display = "none";
      if (apiIntro) apiIntro.style.display = "none";
      if (dictIntro) dictIntro.style.display = "none";
      if (geminiIntro) geminiIntro.style.display = "none";

      if (state.examGoal === "rn") {
        if (!rnIntro) {
          rnIntro = document.createElement("div");
          rnIntro.id = "rn-intro-block";
          rnIntro.innerHTML = `
            <div style="background: rgba(59,130,246,0.05); border: 1px dashed var(--accent-blue); padding:20px; border-radius:12px; margin-top:10px;">
              <h4 style="color:var(--accent-blue); font-size:16px; margin-bottom:8px;"><i class="fas fa-stethoscope"></i> 美國註冊護理師 (NCLEX-RN) 考試大綱</h4>
              <p style="font-size:13px; line-height:1.6; color:var(--text-secondary);">
                NCLEX-RN 考試著重於臨床安全與有效護理環境。本題庫涵蓋：<br>
                • <strong>Pharmacology (藥理學)</strong>：給藥安全、副作用與血值監測。<br>
                • <strong>Med-Surg (內外科護理)</strong>：各系統疾病臨床徵象與手術前後護理。<br>
                • <strong>Pediatric (兒科) & Maternity (產科)</strong>：生長發育、先天疾病、產前與產後護理。<br>
                * 題目均採用英文專業出題，並提供中文病理合理解析！
              </p>
            </div>
          `;
          levelSelectCard.appendChild(rnIntro);
        }
        rnIntro.style.display = "block";
      } else if (state.examGoal === "api") {
        if (!apiIntro) {
          apiIntro = document.createElement("div");
          apiIntro.id = "api-intro-block";
          apiIntro.innerHTML = `
            <div style="background: rgba(139,92,246,0.05); border: 1px dashed #8b5cf6; padding:20px; border-radius:12px; margin-top:10px;">
              <h4 style="color:#8b5cf6; font-size:16px; margin-bottom:8px;"><i class="fas fa-globe"></i> 線上雲端國際題庫 (OpenTDB API)</h4>
              <p style="font-size:13px; line-height:1.6; color:var(--text-secondary);">
                串接國際公開 Trivia 題庫 API，每次點選練習都會隨機向雲端請求最前沿的 5 道全英文單選題！<br>
                • 涵蓋：科學自然、歷史文化、世界地理、動物生態以及生活綜合常識。<br>
                * 這需要保持網路暢通。點擊下方練習領域即可體驗無限題目的聯網挑戰！
              </p>
            </div>
          `;
          levelSelectCard.appendChild(apiIntro);
        }
        apiIntro.style.display = "block";
      } else if (state.examGoal === "gemini") {
        if (!geminiIntro) {
          geminiIntro = document.createElement("div");
          geminiIntro.id = "gemini-intro-block";
          geminiIntro.innerHTML = `
            <div style="background: rgba(167,139,250,0.05); border: 1px dashed #a78bfa; padding:20px; border-radius:12px; margin-top:10px;">
              <h4 style="color:#a78bfa; font-size:16px; margin-bottom:8px;"><i class="fas fa-magic"></i> Google Gemini AI 聯網出題系統</h4>
              <p style="font-size:13px; line-height:1.6; color:var(--text-secondary);">
                利用最新的生成式 AI 技術，每次點擊練習都會即時調用 Gemini 模型，動態產出中級難度的定制題目與詳盡的中文引申解析！<br>
                • <strong>支援範疇</strong>：AI 單字、AI 文法、AI 閱讀理解、AI 情境對話與 AI 職場口說。<br>
                * 請先點擊右上角「帳號管理」設定您的 Gemini API Key，即可體驗無限客製化的極致學習！
              </p>
            </div>
          `;
          levelSelectCard.appendChild(geminiIntro);
        }
        geminiIntro.style.display = "block";
      } else {
        if (!dictIntro) {
          dictIntro = document.createElement("div");
          dictIntro.id = "dict-intro-block";
          dictIntro.innerHTML = `
            <div style="background: rgba(16,185,129,0.05); border: 1px dashed var(--accent-green); padding:20px; border-radius:12px; margin-top:10px;">
              <h4 style="color:var(--accent-green); font-size:16px; margin-bottom:8px;"><i class="fas fa-book"></i> Free Dictionary API 智能分級單字測驗</h4>
              <p style="font-size:13px; line-height:1.6; color:var(--text-secondary);">
                整合開源英語字典 API，每次點選練習都會即時查詢生字的發音、詞性與英英解釋，並自動生成英英釋義選擇題！<br>
                • <strong>Level 1 - 2</strong>：基礎生活及日常詞彙 (A1 - A2)<br>
                • <strong>Level 3 - 4</strong>：職場、學術及實用中階詞彙 (B1 - B2)<br>
                • <strong>Level 5</strong>：高難度文學及思辨高級詞彙 (C1 - C2)<br>
                * 請保持網路暢通，點擊下方練習等級，即刻開啟直覺式英英學習！
              </p>
            </div>
          `;
          levelSelectCard.appendChild(dictIntro);
        }
        dictIntro.style.display = "block";
      }
    }
  }

  // 渲染練習選單
  renderPracticeMenu();
}

function renderPracticeMenu() {
  const cards = document.querySelectorAll(".practice-menu-card");
  if (cards.length < 5) return;

  if (state.examGoal === "rn") {
    const rnCount = (cat) => (RN_DATA[cat] ? RN_DATA[cat].length : 0);
    updateMenuCard(cards[0], "pharmacology", "fas fa-pills", "藥理學 (Pharmacology)", "給藥評估、抗凝血劑、利尿劑等臨床用藥英文考題與監測指標。", rnCount("pharmacology"));
    updateMenuCard(cards[1], "medSurg", "fas fa-stethoscope", "內外科護理 (Med-Surg)", "涵蓋甲狀腺切除、心臟衰竭、糖尿病酮酸中毒等系統性臨床護理考點。", rnCount("medSurg"));
    updateMenuCard(cards[2], "pediatric", "fas fa-baby", "兒科護理 (Pediatric)", "急性會厭炎、乳糜瀉飲食管理等兒童成長與急症護理測驗。", rnCount("pediatric"));
    updateMenuCard(cards[3], "maternity", "fas fa-heartbeat", "產科婦幼 (Maternity)", "前置胎盤、胎盤早剝、催產素點點滴監測等婦產科高頻考題。", rnCount("maternity"));
    updateMenuCard(cards[4], "dialogue", "fas fa-user-nurse", "臨床護理口說 (Speaking)", "練習護理人員與患者及家容溝通的日常職場英語口說。", rnCount("dialogue"));
  } else if (state.examGoal === "api") {
    updateMenuCard(cards[0], "gk", "fas fa-globe", "綜合英語常識", "挑戰包含生活科普、常識等多元主題的雲端隨機英語閱讀測驗。");
    updateMenuCard(cards[1], "science", "fas fa-atom", "科學與自然", "向雲端伺服器載入最新的科學、物理、化學與自然生態英文題目。");
    updateMenuCard(cards[2], "history", "fas fa-landmark", "歷史與文化", "測驗有關世界歷史、文化事件與重要里程碑的英語題目。");
    updateMenuCard(cards[3], "geography", "fas fa-map-marked-alt", "地理與世界", "探索全球地理、各國首都與地標常識的即時英文考題。");
    updateMenuCard(cards[4], "animals", "fas fa-paw", "動物與生態", "測驗大自然奇妙動物、昆蟲與生態系等趣味英語科學常識。");
  } else if (state.examGoal === "gemini") {
    updateMenuCard(cards[0], "vocab", "fas fa-spell-check", "AI 單字測驗", "由 Gemini 即時生成專屬的英英釋義與單字搭配選擇題。");
    updateMenuCard(cards[1], "grammar", "fas fa-tasks", "AI 語法結構", "由 AI 生成克漏字或文法填空，附帶超詳細的中英文解析。");
    updateMenuCard(cards[2], "reading", "fas fa-book-open", "AI 閱讀理解", "生成一篇短小的英文商務或日常對話故事，並附帶理解問題測驗。");
    updateMenuCard(cards[3], "dialogue", "fas fa-comments", "AI 情境對話", "AI 精選實用商業或生活場景對話，提供互動式克漏字閱讀。");
    updateMenuCard(cards[4], "speaking", "fas fa-microphone", "AI 職場口說", "利用語音辨識大聲唸出 AI 為您生成的職場溝通例句，賺取金幣！");
  } else {
    const l1Count = (typeof ECDICT_DATA !== 'undefined' && ECDICT_DATA.level1) ? ECDICT_DATA.level1.length : (DICT_WORDLIST.level1 ? DICT_WORDLIST.level1.length : 0);
    const l2Count = (typeof ECDICT_DATA !== 'undefined' && ECDICT_DATA.level2) ? ECDICT_DATA.level2.length : (DICT_WORDLIST.level2 ? DICT_WORDLIST.level2.length : 0);
    const l3Count = (typeof ECDICT_DATA !== 'undefined' && ECDICT_DATA.level3) ? ECDICT_DATA.level3.length : (DICT_WORDLIST.level3 ? DICT_WORDLIST.level3.length : 0);
    const l4Count = (typeof ECDICT_DATA !== 'undefined' && ECDICT_DATA.level4) ? ECDICT_DATA.level4.length : (DICT_WORDLIST.level4 ? DICT_WORDLIST.level4.length : 0);
    const l5Count = (typeof ECDICT_DATA !== 'undefined' && ECDICT_DATA.level5) ? ECDICT_DATA.level5.length : (DICT_WORDLIST.level5 ? DICT_WORDLIST.level5.length : 0);
    const phraseCount = (typeof PHRASES_DATA !== 'undefined') ? PHRASES_DATA.length : 0;
    const sentenceCount = (typeof SENTENCES_DATA !== 'undefined') ? SENTENCES_DATA.length : 0;
    const grammarCount = (typeof GRAMMAR_DATA !== 'undefined') ? GRAMMAR_DATA.length : 0;

    updateMenuCard(cards[0], "level1", "fas fa-leaf", "Level 1 (基礎單字 - A1)", "精選生活與社交基礎詞彙，透過英英釋義建立直覺語感。", l1Count);
    updateMenuCard(cards[1], "level2", "fas fa-seedling", "Level 2 (初級單字 - A2)", "進階日常與基礎描述詞彙，學習如何精確傳達想法。", l2Count);
    updateMenuCard(cards[2], "level3", "fas fa-tree", "Level 3 (中級單字 - B1)", "涵蓋學術與工作常用基礎詞彙，提升英文聽讀理解力。", l3Count);
    updateMenuCard(cards[3], "level4", "fas fa-graduation-cap", "Level 4 (中高單字 - B2)", "商務、時事與思辨核心詞彙，挑戰更流暢的英文表達。", l4Count);
    updateMenuCard(cards[4], "level5", "fas fa-crown", "Level 5 (高級單字 - C1)", "高難度、文學及專業論述詞彙，適合追求英文完美的挑戰者。", l5Count);
    // 片語、句型、文法卡片（如果存在）
    if (cards.length > 5) updateMenuCard(cards[5], "phrase", "fas fa-quote-left", "常用片語測驗 (Idioms)", "精選實用英文片語與成語，挑戰雙語意思配對。", phraseCount);
    if (cards.length > 6) updateMenuCard(cards[6], "sentence", "fas fa-align-left", "實用句型重組 (Sentences)", "根據中文意思，將打亂的英文單字重新排列組合成正確句子。", sentenceCount);
    if (cards.length > 7) updateMenuCard(cards[7], "grammar", "fas fa-exclamation-triangle", "文法挑錯挑戰 (Grammar)", "辨識並挑出句子中的文法錯誤，增強寫作與語法邏輯。", grammarCount);
  }
}

function updateMenuCard(card, category, iconClass, name, desc, count) {
  card.dataset.category = category;
  card.querySelector(".practice-menu-icon").innerHTML = `<i class="${iconClass}"></i>`;
  card.querySelector(".practice-menu-name").innerText = name;
  card.querySelector(".practice-menu-desc").innerText = desc;
  // 顯示題庫數量徽章
  let countBadge = card.querySelector(".practice-menu-count");
  if (count !== undefined && count > 0) {
    if (!countBadge) {
      countBadge = document.createElement("span");
      countBadge.className = "practice-menu-count";
      card.appendChild(countBadge);
    }
    countBadge.innerHTML = `<i class="fas fa-database" style="margin-right:4px; font-size:10px;"></i>${count} 題`;
  } else if (countBadge) {
    countBadge.remove();
  }
}

// --- 11. 多帳號管理視窗與備份匯入還原邏輯 ---
function openUserModal() {
  document.getElementById("user-modal").classList.add("active");
  renderUserModal();
}

function closeUserModal() {
  document.getElementById("user-modal").classList.remove("active");
}

function renderUserModal() {
  const container = document.getElementById("modal-user-list");
  if (!container) return;

  container.innerHTML = usersList.map(name => {
    const isActive = name === currentUser;
    return `
      <div class="user-list-item ${isActive ? 'active' : ''}">
        <div class="user-item-name" onclick="handleSwitchUser('${name}')">
          <i class="fas ${isActive ? 'fa-user-check' : 'fa-user'}" style="${isActive ? 'color:var(--accent-green)' : ''}"></i>
          <span>${name}</span>
          ${isActive ? '<span style="font-size:11px; color:var(--accent-green); margin-left:4px;">(當前)</span>' : ''}
        </div>
        <div class="user-item-actions">
          <button class="user-action-icon-btn" onclick="handleExportUser('${name}')" title="備份進度為 JSON 檔">
            <i class="fas fa-download"></i>
          </button>
          <button class="user-action-icon-btn" onclick="handleTriggerRestore('${name}')" title="上傳還原進度">
            <i class="fas fa-upload"></i>
          </button>
          ${usersList.length > 1 ? `
            <button class="user-action-icon-btn delete" onclick="handleDeleteUser('${name}')" title="刪除此使用者">
              <i class="fas fa-trash-alt"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");

  updateBackupStatusUI();

  const keyInput = document.getElementById("gemini-api-key-input");
  if (keyInput) {
    keyInput.value = localStorage.getItem("gemini_api_key_" + currentUser) || "";
  }
}

function saveGeminiApiKey(key) {
  localStorage.setItem("gemini_api_key_" + currentUser, key.trim());
  showFloatingNotification("Gemini API 金鑰已安全地儲存在本機！");
}

function handleSwitchUser(name) {
  if (name === currentUser) return;
  // 先保存當前帳號進度
  localStorage.setItem("toeic_practice_state_" + currentUser, JSON.stringify(state));
  
  currentUser = name;
  localStorage.setItem("toeic_current_user", currentUser);

  // 讀取切換後的帳號狀態
  const stored = localStorage.getItem("toeic_practice_state_" + currentUser);
  if (stored) {
    try {
      state = JSON.parse(stored);
    } catch(e) {
      state = { ...INITIAL_STATE };
    }
  } else {
    state = { ...INITIAL_STATE };
  }

  // 刷新全站 UI
  const headerUserLabel = document.getElementById("header-username-label");
  if (headerUserLabel) headerUserLabel.innerText = currentUser;
  
  updateExamGoalUI();
  applyEquippedTheme();
  initDashboard();
  renderUserModal();
  closeUserModal();
  showFloatingNotification(`已切換使用者至：${currentUser}`);
}

function handleCreateNewUser() {
  const input = document.getElementById("new-username-input");
  const name = input.value.trim();
  if (!name) return;

  if (usersList.includes(name)) {
    alert("此名稱已存在，請使用其他名稱！");
    return;
  }

  // 新增到清單
  usersList.push(name);
  input.value = "";

  // 切換到新建立的使用者
  handleSwitchUser(name);
}

function handleDeleteUser(name) {
  if (name === currentUser) {
    alert("無法刪除當前使用中的使用者！");
    return;
  }

  if (confirm(`您確定要刪除使用者「${name}」嗎？這會清除該帳號在本機所有的學習數據！`)) {
    // 移出清單
    usersList = usersList.filter(u => u !== name);
    // 移除儲存紀錄
    localStorage.removeItem("toeic_practice_state_" + name);
    saveState();
    renderUserModal();
    showFloatingNotification(`已刪除使用者：${name}`);
  }
}

// 備份下載為 json
function handleExportUser(name) {
  let targetState = state;
  if (name !== currentUser) {
    const stored = localStorage.getItem("toeic_practice_state_" + name);
    if (stored) {
      try {
        targetState = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
  }

  const exportData = {
    username: name,
    savedAt: new Date().toISOString(),
    state: targetState
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `toeic_progress_${name}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

let restoreTargetName = "";
function handleTriggerRestore(name) {
  restoreTargetName = name;
  document.getElementById("restore-file-input").click();
}

function handleRestoreFileSelected(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = JSON.parse(evt.target.result);
      if (!data.username || !data.state) {
        alert("無效的備份檔案格式！");
        return;
      }

      if (confirm(`確認要還原使用者「${restoreTargetName}」的進度嗎？這會覆蓋其現有的全部練習紀錄！`)) {
        // 寫入儲存區
        localStorage.setItem("toeic_practice_state_" + restoreTargetName, JSON.stringify(data.state));
        
        // 如果是當前使用者，則立即讀取
        if (restoreTargetName === currentUser) {
          loadState();
          initDashboard();
        }
        
        renderUserModal();
        closeUserModal();
        showFloatingNotification(`還原成功！已回復 ${restoreTargetName} 的備份進度。`);
      }
    } catch(err) {
      alert("讀取檔案出錯，請確認該檔案是否為正確的 JSON 格式。");
    }
  e.target.value = "";
  };
  reader.readAsText(file);
}

const PHRASES_DATA = [
  // --- Original 40 entries ---
  { w: "break a leg", t: "祝好運；祝演出成功" },
  { w: "call it a day", t: "今天就到此為止；收工" },
  { w: "bite the bullet", t: "咬緊牙關；硬著頭皮面對" },
  { w: "cut corners", t: "投機取巧；偷工減料" },
  { w: "under the weather", t: "身體不舒服；生病" },
  { w: "spill the beans", t: "洩露秘密" },
  { w: "piece of cake", t: "輕而易舉的事" },
  { w: "once in a blue moon", t: "千載難逢；極為罕見" },
  { w: "hit the sack", t: "上床睡覺" },
  { w: "let the cat out of the bag", t: "無意中洩露秘密" },
  { w: "burn the midnight oil", t: "熬夜；挑燈夜戰" },
  { w: "cost an arm and a leg", t: "極其昂貴" },
  { w: "face the music", t: "面對現實；接受懲罰" },
  { w: "on the fence", t: "猶豫不決；觀望態度" },
  { w: "see eye to eye", t: "看法一致；達成共識" },
  { w: "take it with a grain of salt", t: "對此持保留態度；半信半疑" },
  { w: "the last straw", t: "導火線；忍無可忍的最後極限" },
  { w: "through thick and thin", t: "共患難；歷經風雨" },
  { w: "rule of thumb", t: "經驗法則；實用原則" },
  { w: "keep your fingers crossed", t: "祈求好運" },
  { w: "blow off steam", t: "宣洩情緒；釋放壓力" },
  { w: "bark up the wrong tree", t: "尋錯對象；想錯方向" },
  { w: "get out of hand", t: "失去控制；不可收拾" },
  { w: "hang in there", t: "堅持下去；忍耐一下" },
  { w: "hit the nail on the head", t: "一針見血；說得中肯" },
  { w: "look before you leap", t: "三思而後行" },
  { w: "miss the boat", t: "錯失良機" },
  { w: "pull yourself together", t: "振作起來；恢復理智" },
  { w: "so far so good", t: "目前為止一切都好" },
  { w: "speak of the devil", t: "說到曹操，曹操就到" },
  { w: "take it easy", t: "放輕鬆；別緊張" },
  { w: "up in the air", t: "懸而未決；尚無定論" },
  { w: "actions speak louder than words", t: "事實勝於雄辯；行動重於空談" },
  { w: "add fuel to the fire", t: "火上澆油" },
  { w: "beat around the bush", t: "拐彎抹角；說話繞圈子" },
  { w: "cry over spilled milk", t: "為無可挽回的後悔；做無益懊悔" },
  { w: "every cloud has a silver lining", t: "黑暗中總有一線生機；否極泰來" },
  { w: "it takes two to tango", t: "一個巴掌拍不響；雙方都有責任" },
  { w: "kill two birds with one stone", t: "一箭雙雕；一石二鳥" },
  { w: "look on the bright side", t: "看事情的好一面；樂觀一點" },
  // --- New entries (41–120) ---
  { w: "break the ice", t: "打破僵局" },
  { w: "a blessing in disguise", t: "塞翁失馬，焉知非福" },
  { w: "get cold feet", t: "臨陣退縮；怯場" },
  { w: "jump on the bandwagon", t: "趕潮流；隨大流" },
  { w: "on cloud nine", t: "欣喜若狂；九霄雲外般的快樂" },
  { w: "in the same boat", t: "同病相憐；處境相同" },
  { w: "when pigs fly", t: "不可能的事；太陽打西邊出來" },
  { w: "cut to the chase", t: "直奔主題；開門見山" },
  { w: "the ball is in your court", t: "該你做決定了；現在輪到你了" },
  { w: "go the extra mile", t: "加倍努力；多做一些" },
  { w: "a penny for your thoughts", t: "在想什麼？告訴我你的想法" },
  { w: "back to square one", t: "回到原點；從頭再來" },
  { w: "the tip of the iceberg", t: "冰山一角" },
  { w: "sit on the fence", t: "保持中立；觀望不決" },
  { w: "hit the road", t: "出發；上路" },
  { w: "go with the flow", t: "順其自然；隨波逐流" },
  { w: "keep an eye on", t: "留意；注意" },
  { w: "play it by ear", t: "隨機應變；見機行事" },
  { w: "wrap your head around", t: "理解；弄明白" },
  { w: "by the skin of your teeth", t: "勉強地；差一點就不行" },
  { w: "ring a bell", t: "聽起來耳熟" },
  { w: "at the drop of a hat", t: "毫不猶豫地；立刻" },
  { w: "give someone the cold shoulder", t: "冷落某人；故意忽視" },
  { w: "a taste of your own medicine", t: "自食其果；以其人之道還治其人之身" },
  { w: "let sleeping dogs lie", t: "別自找麻煩；別揭舊瘡疤" },
  { w: "the whole nine yards", t: "全部；所有的一切" },
  { w: "turn a blind eye", t: "視而不見；故意忽略" },
  { w: "put all your eggs in one basket", t: "孤注一擲" },
  { w: "steal someone's thunder", t: "搶了某人的風頭" },
  { w: "read between the lines", t: "讀出言外之意；體會弦外之音" },
  { w: "pull someone's leg", t: "開某人的玩笑；逗弄" },
  { w: "water under the bridge", t: "已經過去的事；既往不咎" },
  { w: "on the same page", t: "意見一致；達成共識" },
  { w: "think outside the box", t: "跳脫框架思考；突破常規" },
  { w: "get the ball rolling", t: "開始行動；啟動" },
  { w: "in hot water", t: "惹上麻煩；陷入困境" },
  { w: "keep it under wraps", t: "保密；隱藏" },
  { w: "leave no stone unturned", t: "不遺餘力；想盡辦法" },
  { w: "make ends meet", t: "勉強維持生計；收支平衡" },
  { w: "no pain, no gain", t: "不勞無獲；一分耕耘一分收穫" },
  { w: "out of the blue", t: "出乎意料地；突然" },
  { w: "shape up or ship out", t: "要嘛改進，不然就走人" },
  { w: "time flies", t: "時光飛逝" },
  { w: "easier said than done", t: "說起來容易做起來難" },
  { w: "a stone's throw", t: "一箭之遙；非常近的距離" },
  { w: "run out of steam", t: "精疲力竭；失去動力" },
  { w: "turn over a new leaf", t: "改過自新；重新開始" },
  { w: "cross that bridge when you come to it", t: "到時候再說；船到橋頭自然直" },
  { w: "the elephant in the room", t: "大家心知肚明卻避而不談的問題" },
  { w: "bite off more than you can chew", t: "貪多嚼不爛；不自量力" },
  { w: "have a change of heart", t: "改變心意" },
  { w: "put your foot down", t: "堅決反對；堅持立場" },
  { w: "go back to the drawing board", t: "重新規劃；從頭再來" },
  { w: "sleep on it", t: "考慮一晚再決定" },
  { w: "take the bull by the horns", t: "勇敢面對困難" },
  { w: "call the shots", t: "做決定；發號施令" },
  { w: "come rain or shine", t: "不論晴雨；無論如何" },
  { w: "down to earth", t: "腳踏實地；務實的" },
  { w: "from scratch", t: "從零開始；從頭做起" },
  { w: "get your act together", t: "振作起來；好好表現" },
  { w: "in a nutshell", t: "簡而言之；總而言之" },
  { w: "jump the gun", t: "操之過急；過早行動" },
  { w: "know the ropes", t: "熟悉內情；了解竅門" },
  { w: "on thin ice", t: "處境危險；如履薄冰" },
  { w: "rain or shine", t: "風雨無阻" },
  { w: "save for a rainy day", t: "未雨綢繆；存錢以備不時之需" },
  { w: "take a rain check", t: "改天再約；延期" },
  { w: "two heads are better than one", t: "三個臭皮匠勝過一個諸葛亮" },
  { w: "walk on eggshells", t: "小心翼翼；如履薄冰" },
  { w: "you can't judge a book by its cover", t: "人不可貌相；不能以貌取人" },
  { w: "hold your horses", t: "耐心等一下；別急" },
  { w: "back to the drawing board", t: "推倒重來；回到原點重新規劃" },
  { w: "catch someone red-handed", t: "當場抓住某人；人贓俱獲" },
  { w: "give the benefit of the doubt", t: "姑且相信；先假設對方無辜" },
  { w: "make a long story short", t: "長話短說" },
  { w: "the best of both worlds", t: "兩全其美" },
  { w: "under the table", t: "私下地；檯面下交易" },
  { w: "wrap up", t: "結束；完成" },
  { w: "zip your lip", t: "閉嘴；保持沉默" },
  { w: "nip it in the bud", t: "防患於未然；把問題扼殺在萌芽中" },
  { w: "on the dot", t: "準時地；一秒不差" }
];

const SENTENCES_DATA = [
  // --- Original 20 entries ---
  { w: "I look forward to hearing from you soon.", t: "我期待很快收到您的回信。" },
  { w: "Could you please let me know when you are free?", t: "可以請您讓我知道您什麼時候有空嗎？" },
  { w: "It is important to keep a balance between work and life.", t: "在工作和生活之間保持平衡是重要的事。" },
  { w: "She has been studying English for more than three years.", t: "她已經學習英語三年多了。" },
  { w: "The sooner you start, the better the result will be.", t: "你越早開始，結果就會越好。" },
  { w: "We should take full advantage of the online resources.", t: "我們應該充分利用網路資源。" },
  { w: "He made up his mind to start his own business.", t: "他下定決心要自己創業。" },
  { w: "Under no circumstances should you share your password.", t: "在任何情況下，您都不應該分享您的密碼。" },
  { w: "Although it was raining, they decided to go for a walk.", t: "雖然在下雨，他們還是決定去散步。" },
  { w: "I would appreciate it if you could reply by Friday.", t: "如果您能在星期五之前回覆，我將不勝感激。" },
  { w: "It takes a lot of practice to speak a foreign language fluently.", t: "要流暢地說一門外語需要大量的練習。" },
  { w: "The movie was so interesting that I watched it twice.", t: "這部電影太有趣了，以至於我看了兩次。" },
  { w: "No matter what happens, I will always stand by your side.", t: "不管發生什麼事，我都會一直站在你身邊。" },
  { w: "We had to put off the meeting because of the bad weather.", t: "因為惡劣的天氣，我們不得不延期會議。" },
  { w: "I am not used to getting up early in the morning.", t: "我不習慣在早上早起。" },
  { w: "It is never too late to learn what is useful.", t: "學習有用的東西，活到老學到老。" },
  { w: "He was about to leave when the phone suddenly rang.", t: "他正要離開，電話突然響了。" },
  { w: "They succeeded in completing the project on schedule.", t: "他們成功地按時完成了這個專案。" },
  { w: "The doctor advised him to give up smoking immediately.", t: "醫生建議他立即戒菸。" },
  { w: "I wonder if you could help me solve this problem.", t: "不知您是否能幫我解決這個問題。" },
  // --- New entries (21–80) ---
  { w: "If I had known earlier, I would have made a different decision.", t: "如果我早知道的話，我會做出不同的決定。" },
  { w: "The book that she recommended to me was very inspiring.", t: "她推薦給我的那本書非常鼓舞人心。" },
  { w: "Not only is he smart, but he is also hardworking.", t: "他不僅聰明，而且還很勤奮。" },
  { w: "Please make sure to turn off the lights before leaving.", t: "離開前請確保關燈。" },
  { w: "The harder you practice, the more confident you will become.", t: "你練習得越努力，就會變得越有自信。" },
  { w: "I have been waiting here for almost two hours.", t: "我已經在這裡等了將近兩個小時。" },
  { w: "The project was completed ahead of the original schedule.", t: "這個專案比原定計畫提前完成了。" },
  { w: "She asked me whether I had finished the assignment yet.", t: "她問我是否已經完成作業了。" },
  { w: "By the time we arrived, the concert had already started.", t: "當我們到達時，演唱會已經開始了。" },
  { w: "He is the kind of person who never gives up easily.", t: "他是那種從不輕易放棄的人。" },
  { w: "Would you mind closing the window for me, please?", t: "請問您介意幫我關一下窗戶嗎？" },
  { w: "The company plans to expand its operations to Europe next year.", t: "該公司計畫明年將業務擴展到歐洲。" },
  { w: "Had she studied harder, she would have passed the exam.", t: "她如果讀書更努力的話，就會通過考試了。" },
  { w: "There is no point in arguing about something we cannot change.", t: "爭論我們無法改變的事情是沒有意義的。" },
  { w: "I wish I could travel around the world someday.", t: "我希望有一天能環遊世界。" },
  { w: "The new policy will take effect at the beginning of next month.", t: "新政策將於下個月初生效。" },
  { w: "Neither the students nor the teacher was satisfied with the result.", t: "學生和老師都對結果不滿意。" },
  { w: "You had better leave now, or you will miss the last train.", t: "你最好現在就走，否則會錯過最後一班火車。" },
  { w: "The reason why he was late is that his car broke down.", t: "他遲到的原因是他的車壞了。" },
  { w: "It is widely believed that education plays a vital role in society.", t: "人們普遍認為教育在社會中扮演重要角色。" },
  { w: "She regretted not having accepted the job offer last month.", t: "她後悔上個月沒有接受那份工作邀請。" },
  { w: "Only after the meeting did I realize the importance of the issue.", t: "直到會議之後，我才意識到這個問題的重要性。" },
  { w: "The teacher asked us to hand in our homework by tomorrow.", t: "老師要求我們明天之前交作業。" },
  { w: "You should always be honest with the people around you.", t: "你應該始終對身邊的人誠實。" },
  { w: "I cannot help wondering what life would be like in another country.", t: "我不禁想知道在另一個國家生活會是什麼樣子。" },
  { w: "The restaurant where we had dinner last night was fantastic.", t: "我們昨晚吃飯的那家餐廳非常棒。" },
  { w: "We are supposed to arrive at the airport two hours in advance.", t: "我們應該提前兩個小時到達機場。" },
  { w: "It suddenly occurred to me that I had left my keys at home.", t: "我突然想到我把鑰匙忘在家裡了。" },
  { w: "He spoke so fast that nobody could understand him clearly.", t: "他說得太快了，沒有人能清楚地聽懂他。" },
  { w: "The city where I grew up has changed a lot over the years.", t: "我長大的那座城市這些年來變化很大。" },
  { w: "She insisted on paying for the dinner even though I offered.", t: "即使我提出要付，她仍堅持買單。" },
  { w: "What matters most is not the result but the effort you put in.", t: "最重要的不是結果，而是你付出的努力。" },
  { w: "If the weather permits, we will go hiking this weekend.", t: "如果天氣允許的話，我們這個週末去爬山。" },
  { w: "The students were told to remain seated until the bell rang.", t: "學生們被告知要坐在座位上直到鈴響。" },
  { w: "I have never seen such a beautiful sunset in my entire life.", t: "我這輩子從沒見過這麼美的日落。" },
  { w: "He apologized for being late to the meeting this morning.", t: "他為今天早上開會遲到而道歉。" },
  { w: "They are looking forward to visiting their grandparents next week.", t: "他們期待下週去探望祖父母。" },
  { w: "The museum is located in the center of the old town.", t: "博物館位於老城區的中心。" },
  { w: "I used to play the piano when I was a child.", t: "我小時候常常彈鋼琴。" },
  { w: "Unless you hurry up, we will not be able to catch the bus.", t: "除非你快一點，否則我們趕不上公車。" },
  { w: "She is one of the most talented musicians I have ever met.", t: "她是我見過最有天賦的音樂家之一。" },
  { w: "The experiment was carried out under very strict conditions.", t: "這個實驗是在非常嚴格的條件下進行的。" },
  { w: "It is no use complaining about things that have already happened.", t: "抱怨已經發生的事情是沒有用的。" },
  { w: "Despite the heavy traffic, she managed to arrive on time.", t: "儘管交通擁擠，她還是設法準時到達了。" },
  { w: "He denied having anything to do with the incident.", t: "他否認與那起事件有任何關係。" },
  { w: "The children were so excited that they could not fall asleep.", t: "孩子們太興奮了，以至於無法入睡。" },
  { w: "You might as well take an umbrella in case it rains.", t: "你不如帶把傘以防下雨。" },
  { w: "Rarely does she complain about her workload at the office.", t: "她很少抱怨辦公室的工作量。" },
  { w: "Learning a new language requires both patience and dedication.", t: "學習一門新語言需要耐心和毅力。" },
  { w: "The problem is too complicated for me to solve on my own.", t: "這個問題太複雜了，我無法獨自解決。" },
  { w: "He promised that he would finish the report by next Monday.", t: "他承諾下週一之前會完成報告。" },
  { w: "Were it not for your help, I would have failed the exam.", t: "要不是有你的幫助，我考試就不及格了。" },
  { w: "They have known each other since they were in elementary school.", t: "他們從小學起就認識彼此了。" },
  { w: "The speech given by the professor was thought-provoking and inspiring.", t: "教授的演講發人深省且鼓舞人心。" },
  { w: "I would rather stay home than go out in this terrible weather.", t: "我寧願待在家裡，也不想在這種糟糕的天氣出門。" },
  { w: "Not until I read the email did I understand the whole situation.", t: "直到我讀了那封電郵，才了解了整個情況。" },
  { w: "She reminded me to bring my passport to the airport.", t: "她提醒我把護照帶到機場。" },
  { w: "We must take immediate action to protect the environment.", t: "我們必須立即採取行動來保護環境。" },
  { w: "It was not until midnight that he finally finished his homework.", t: "直到午夜他才終於完成了作業。" },
  { w: "The manager asked everyone to submit a weekly progress report.", t: "經理要求每個人提交每週進度報告。" }
];

const GRAMMAR_DATA = [
  // --- Original 15 entries ---
  { wrong: "He don't like apples.", correct: "He doesn't like apples.", t: "第三人稱單數 (He) 否定助動詞應使用 doesn't 而非 don't。" },
  { wrong: "She has been went to Japan twice.", correct: "She has been to Japan twice.", t: "表示「去過某地」的完成式結構使用 has been to，went 是過去式動詞，在此為多餘。" },
  { wrong: "I look forward to meet you.", correct: "I look forward to meeting you.", t: "look forward to 中的 to 是介系詞，後面須接動名詞 (V-ing) 或名詞。" },
  { wrong: "Although he is tired, but he still works.", correct: "Although he is tired, he still works.", t: "連接詞 although (雖然) 與 but (但是) 在英文語法中不可同時出現在同一個句子中。" },
  { wrong: "The information are very useful.", correct: "The information is very useful.", t: "information (資訊) 是不可數名詞，單數主詞的 Be 動詞應使用 is。" },
  { wrong: "Every students needs a textbook.", correct: "Every student needs a textbook.", t: "every (每個) 後面接單數可數名詞，因此應為 every student。" },
  { wrong: "I have visited Paris last year.", correct: "I visited Paris last year.", t: "句子有明確的過去時間點 last year (去年)，應使用過去簡單式，而非現在完成式。" },
  { wrong: "She is more taller than her sister.", correct: "She is taller than her sister.", t: "taller 已經是比較級，不需在前面加 more，重複比較級是錯誤的。" },
  { wrong: "I didn't saw anything.", correct: "I didn't see anything.", t: "助動詞 didn't 後面必須接原形動詞 see，而非過去式 saw。" },
  { wrong: "He is interesting in history.", correct: "He is interested in history.", t: "表示人「感到有興趣」應使用 interested；interesting 用於形容事物本身「令人有趣」。" },
  { wrong: "She married with a doctor.", correct: "She married a doctor.", t: "marry 是及物動詞，後面直接接受格，不需要加上介系詞 with。" },
  { wrong: "I have a good news for you.", correct: "I have good news for you.", t: "news (新聞、消息) 是不可數名詞，前面不可以加冠詞 a。" },
  { wrong: "The teacher suggested to study harder.", correct: "The teacher suggested studying harder.", t: "suggest (建議) 後面接動詞時，應接動名詞 (V-ing) 或以 should 開頭的子句。" },
  { wrong: "He works very hardly every day.", correct: "He works very hard every day.", t: "hard 可以作為副詞修飾工作 (努力工作)；hardly 是副詞「幾乎不」的意思。" },
  { wrong: "I prefer tea than coffee.", correct: "I prefer tea to coffee.", t: "prefer A to B 表示「比起 B 更喜歡 A」，固定搭配介系詞 to，而非 than。" },
  // --- New entries (16–60) ---
  { wrong: "She can sings very well.", correct: "She can sing very well.", t: "情態動詞 can 後面必須接原形動詞，不可加第三人稱單數的 s。" },
  { wrong: "I am agree with you.", correct: "I agree with you.", t: "agree 是一般動詞，不需要加 be 動詞。「我同意」直接說 I agree。" },
  { wrong: "He has less friends than his brother.", correct: "He has fewer friends than his brother.", t: "friends 是可數名詞複數，應使用 fewer 而非 less。less 用於不可數名詞。" },
  { wrong: "The weather is more hotter today.", correct: "The weather is hotter today.", t: "hotter 本身已是比較級形式，不需再加 more。" },
  { wrong: "I went to home after school.", correct: "I went home after school.", t: "home 用作副詞表示方向時，前面不需要介系詞 to。" },
  { wrong: "She is afraid from dogs.", correct: "She is afraid of dogs.", t: "afraid 的固定搭配介系詞是 of，而非 from。be afraid of 表示「害怕……」。" },
  { wrong: "They was playing soccer when it started to rain.", correct: "They were playing soccer when it started to rain.", t: "主詞 They 是複數，過去進行式的 Be 動詞應使用 were，而非 was。" },
  { wrong: "He gave me an useful advice.", correct: "He gave me useful advice.", t: "advice (建議) 是不可數名詞，前面不加冠詞 a/an，也不加 s。" },
  { wrong: "I must to finish this report today.", correct: "I must finish this report today.", t: "情態動詞 must 後面直接接原形動詞，不需要加 to。" },
  { wrong: "She asked me where did I live.", correct: "She asked me where I lived.", t: "間接問句不使用疑問句語序，應改為主詞 + 動詞的陳述語序。" },
  { wrong: "He is one of the best student in the class.", correct: "He is one of the best students in the class.", t: "one of 後面必須接複數名詞，因此應為 students。" },
  { wrong: "I have been to Japan in last summer.", correct: "I went to Japan last summer.", t: "有明確過去時間 last summer，應使用過去簡單式。且 last summer 前面不加介系詞 in。" },
  { wrong: "The news are shocking.", correct: "The news is shocking.", t: "news 雖然字尾有 s，但它是不可數名詞，動詞應使用單數 is。" },
  { wrong: "Each of the students have their own computer.", correct: "Each of the students has their own computer.", t: "each of 後面雖接複數名詞，但主詞仍為 each（單數），動詞應使用 has。" },
  { wrong: "I am looking forward to see you again.", correct: "I am looking forward to seeing you again.", t: "look forward to 中的 to 是介系詞，後面應接動名詞 seeing。" },
  { wrong: "She doesn't know nothing about it.", correct: "She doesn't know anything about it.", t: "英文中不允許雙重否定。doesn't 已經是否定，後面應使用 anything 而非 nothing。" },
  { wrong: "The children needs more time to play.", correct: "The children need more time to play.", t: "children 是複數名詞，動詞不需要加第三人稱單數的 s，應為 need。" },
  { wrong: "I want that you come to the party.", correct: "I want you to come to the party.", t: "want 後面接人再接不定詞：want + 人 + to V，而非 want + that 子句。" },
  { wrong: "He stopped to smoke three years ago.", correct: "He stopped smoking three years ago.", t: "stop + V-ing 表示「停止做某事」；stop + to V 表示「停下來去做另一件事」。此處指「戒菸」，應用 smoking。" },
  { wrong: "This is the more expensive car in the showroom.", correct: "This is the most expensive car in the showroom.", t: "三者以上的比較應使用最高級 most expensive，而非比較級 more expensive。" },
  { wrong: "I have lived here since five years.", correct: "I have lived here for five years.", t: "since 後面接時間點；for 後面接時間段。five years 是時間段，應使用 for。" },
  { wrong: "He enjoys to play basketball after school.", correct: "He enjoys playing basketball after school.", t: "enjoy 後面必須接動名詞 (V-ing)，不可接不定詞 (to V)。" },
  { wrong: "If I will have time, I will help you.", correct: "If I have time, I will help you.", t: "在條件句 (if 子句) 中，即使表示未來，也應使用現在簡單式，不用 will。" },
  { wrong: "She is the woman which lives next door.", correct: "She is the woman who lives next door.", t: "先行詞是「人」(the woman) 時，關係代名詞應使用 who，而非 which。" },
  { wrong: "I am used to live in a small town.", correct: "I am used to living in a small town.", t: "be used to 表示「習慣於……」，其中 to 是介系詞，後接動名詞 (V-ing)。" },
  { wrong: "He suggested me to apply for the job.", correct: "He suggested that I apply for the job.", t: "suggest 不接「人 + to V」的結構，應使用 suggest + that 子句（that 可省略），子句中用原形動詞。" },
  { wrong: "The furnitures in this room are very old.", correct: "The furniture in this room is very old.", t: "furniture (家具) 是不可數名詞，沒有複數形式，動詞使用單數 is。" },
  { wrong: "Despite of the rain, we went outside.", correct: "Despite the rain, we went outside.", t: "despite 是介系詞，直接接名詞，不需要加 of。如果要用 of，應改為 in spite of。" },
  { wrong: "She doesn't can swim.", correct: "She can't swim.", t: "情態動詞 can 的否定形式為 can't 或 cannot，不使用 doesn't + can。" },
  { wrong: "I have seen that movie yesterday.", correct: "I saw that movie yesterday.", t: "yesterday 是明確的過去時間，應使用過去簡單式 saw，而非現在完成式 have seen。" },
  { wrong: "He is enough old to drive a car.", correct: "He is old enough to drive a car.", t: "enough 修飾形容詞時要放在形容詞後面：adjective + enough，而非 enough + adjective。" },
  { wrong: "I need an informations about the course.", correct: "I need information about the course.", t: "information 是不可數名詞，不可加 s 也不可加冠詞 a/an。" },
  { wrong: "She told to me that she was busy.", correct: "She told me that she was busy.", t: "tell 是雙賓動詞，直接接人作受詞，不需要介系詞 to。tell + 人 + that...。" },
  { wrong: "We discussed about the problem for hours.", correct: "We discussed the problem for hours.", t: "discuss 是及物動詞，後面直接接受詞，不需要介系詞 about。" },
  { wrong: "Neither of the answer is correct.", correct: "Neither of the answers is correct.", t: "neither of 後面應接複數名詞 answers，但動詞用單數 is（因為 neither 表示「兩者都不」，指單個）。" },
  { wrong: "The police has arrested the suspect.", correct: "The police have arrested the suspect.", t: "police (警察) 在英文中永遠視為複數名詞，動詞應使用 have。" },
  { wrong: "I am boring with this lecture.", correct: "I am bored with this lecture.", t: "表示人「感到無聊」用 bored；boring 是形容事物「令人無聊的」。" },
  { wrong: "She said me that she would come.", correct: "She told me that she would come.", t: "say 後面不直接接人作受詞。要表達「她告訴我」應使用 told me。say 後面接 to me 或直接接內容。" },
  { wrong: "He is used to get up early.", correct: "He is used to getting up early.", t: "be used to 表示「習慣於……」，to 是介系詞，後面接動名詞 (V-ing)。" },
  { wrong: "I have much homework to do tonight.", correct: "I have a lot of homework to do tonight.", t: "在肯定句中，通常使用 a lot of 而非 much。much 較常用於否定句和疑問句中。" },
  { wrong: "It depends of the weather.", correct: "It depends on the weather.", t: "depend 的固定搭配介系詞是 on，而非 of。depend on 表示「取決於」。" },
  { wrong: "We arrived to the hotel at midnight.", correct: "We arrived at the hotel at midnight.", t: "arrive 後面接介系詞 at（小地點）或 in（大地點），不用 to。" },
  { wrong: "She is enough smart to solve the problem.", correct: "She is smart enough to solve the problem.", t: "enough 修飾形容詞時放在形容詞後面：smart enough，而非 enough smart。" },
  { wrong: "I usually go to school by the bus.", correct: "I usually go to school by bus.", t: "表示交通方式 by + 交通工具時，中間不加冠詞 the。" },
  { wrong: "He made me to clean the room.", correct: "He made me clean the room.", t: "使役動詞 make 後面接受詞 + 原形動詞，不需要 to。" }
];
