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
  document.getElementById("sidebar-username").innerText = "學習挑戰者";
  document.getElementById("sidebar-level").innerText = `LV.${state.level} • ${levelTitle}`;

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
    // 顯示載入動畫
    practiceActiveArea.innerHTML = `
      <div style="text-align:center; padding:50px; color:var(--text-secondary);">
        <i class="fas fa-spinner fa-spin" style="font-size:40px; margin-bottom:20px; color:var(--accent-green);"></i>
        <h3>正在透過 Dictionary API 查詢生字庫與釋義...</h3>
        <p style="margin-top:10px; font-size:14px;">正在建立英英解釋與發音，請稍候片刻。</p>
      </div>
    `;

    // 取得當前難度的隨機 5 個單字
    const wordsPool = DICT_WORDLIST[category] || DICT_WORDLIST.level1;
    const shuffledWords = [...wordsPool].sort(() => 0.5 - Math.random());
    const selectedWords = shuffledWords.slice(0, 5);

    // 非同步獲取 5 個字的意思
    const fetchPromises = selectedWords.map(word => {
      return fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
        .then(res => {
          if (!res.ok) throw new Error("Word not found");
          return res.json();
        })
        .then(data => {
          const entry = data[0];
          const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics[0] ? entry.phonetics[0].text : "") || "";
          
          // 找出定義
          let definition = "No definition found.";
          let partOfSpeech = "n.";
          if (entry.meanings && entry.meanings[0]) {
            partOfSpeech = entry.meanings[0].partOfSpeech || "n.";
            if (entry.meanings[0].definitions && entry.meanings[0].definitions[0]) {
              definition = entry.meanings[0].definitions[0].definition;
            }
          }
          
          return {
            word: word,
            phonetic: phonetic,
            partOfSpeech: partOfSpeech,
            definition: definition
          };
        })
        .catch(err => {
          // 備用數據以防 API 失敗或某字沒查到
          return {
            word: word,
            phonetic: "",
            partOfSpeech: "n.",
            definition: `The concept or action related to the word '${word}'.`
          };
        });
    });

    Promise.all(fetchPromises)
      .then(wordDetails => {
        // 現在我們有了 5 個單字的詳細內容，我們來構建 5 道選擇題！
        const dictQuestions = wordDetails.map((item, index) => {
          const correctDef = item.definition;

          // 從其餘的單字中隨機抽取 3 個定義作為干擾選項
          const distractors = wordDetails
            .filter((_, idx) => idx !== index)
            .map(w => w.definition);
          
          // 隨機打亂干擾項並取 3 個
          const selectedDistractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
          
          // 組合並打亂選項
          const options = [...selectedDistractors];
          const insertIdx = Math.floor(Math.random() * 4);
          options.splice(insertIdx, 0, correctDef);

          return {
            id: `api_dict_${category}_${index}_${Date.now()}`,
            word: item.word,
            phonetic: item.phonetic,
            partOfSpeech: item.partOfSpeech,
            question: `Which of the following is the correct definition of the word "<strong>${item.word}</strong>"?`,
            options: options,
            answer: insertIdx,
            explanation: `<strong>${item.word}</strong> [${item.partOfSpeech}] ${item.phonetic}<br>定義：${correctDef}`
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
      })
      .catch(err => {
        console.error("單字載入失敗:", err);
        alert("加載單字資料庫失敗，請檢查網路連線。");
        exitPractice();
      });
    return;
  }

  if (state.examGoal === "api") {
    // 顯示載入動畫
    practiceActiveArea.innerHTML = `
      <div style="text-align:center; padding:50px; color:var(--text-secondary);">
        <i class="fas fa-spinner fa-spin" style="font-size:40px; margin-bottom:20px; color:var(--primary);"></i>
        <h3>正在從雲端 API 載入國際題庫...</h3>
        <p style="margin-top:10px; font-size:14px;">這需要連接網路，請稍候片刻。</p>
      </div>
    `;

    // 對照 OpenTDB Category IDs
    const apiCategories = {
      gk: 9,
      science: 17,
      history: 23,
      geography: 22,
      animals: 27
    };
    const catId = apiCategories[category] || 9;
    
    fetch(`https://opentdb.com/api.php?amount=5&category=${catId}&type=multiple`)
      .then(res => res.json())
      .then(data => {
        if (data.response_code !== 0 || !data.results || data.results.length === 0) {
          alert("載入線上題庫失敗，請稍後再試。");
          exitPractice();
          return;
        }

        // 解析並重組為我們系統的格式
        const apiQuestions = data.results.map((item, index) => {
          const decodedQuestion = decodeHtml(item.question);
          const decodedCorrect = decodeHtml(item.correct_answer);
          const decodedIncorrects = item.incorrect_answers.map(ans => decodeHtml(ans));
          
          // 隨機插入正確答案到選項中
          const options = [...decodedIncorrects];
          const insertIdx = Math.floor(Math.random() * 4);
          options.splice(insertIdx, 0, decodedCorrect);

          return {
            id: `api_${category}_${index}_${Date.now()}`,
            question: decodedQuestion,
            options: options,
            answer: insertIdx,
            explanation: `來源：Open Trivia Database (${item.category} / 難度：${item.difficulty})。`
          };
        });

        sessionState = {
          category: category,
          questions: apiQuestions,
          currentIndex: 0,
          score: 0,
          wrongAnswers: [],
          startTime: Date.now(),
          isReviewSession: false
        };

        renderQuestion();
      })
      .catch(err => {
        console.error("API 載入失敗:", err);
        alert("無法連線至線上題庫，請檢查您的網路連線。");
        exitPractice();
      });
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
  
  expBox.innerHTML = `
    <div class="explanation-card">
      <h4>${isCorrect ? '✨ 回答正確！' : '❌ 答錯了，看解析學習：'}</h4>
      <p><strong>題目內文：</strong>${q.sentence || q.prompt || q.question}</p>
      ${transHtml}
      <p style="margin-top:10px;"><strong>回饋解析：</strong>${q.explanation}</p>
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
        ${q.words.map((w, idx) => q.words[q.correctOrder.indexOf(idx)]).join(" ")}
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

  // 強制導回儀表板
  const dashboardItem = document.querySelector('.nav-item[data-target="dashboard"]');
  if (dashboardItem) {
    dashboardItem.click();
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
    updateMenuCard(cards[0], "pharmacology", "fas fa-pills", "藥理學 (Pharmacology)", "給藥評估、抗凝血劑、利尿劑等臨床用藥英文考題與監測指標。");
    updateMenuCard(cards[1], "medSurg", "fas fa-stethoscope", "內外科護理 (Med-Surg)", "涵蓋甲狀腺切除、心臟衰竭、糖尿病酮酸中毒等系統性臨床護理考點。");
    updateMenuCard(cards[2], "pediatric", "fas fa-baby", "兒科護理 (Pediatric)", "急性會厭炎、乳糜瀉飲食管理等兒童成長與急症護理測驗。");
    updateMenuCard(cards[3], "maternity", "fas fa-heartbeat", "產科婦幼 (Maternity)", "前置胎盤、胎盤早剝、催產素點點滴監測等婦產科高頻考題。");
    updateMenuCard(cards[4], "dialogue", "fas fa-user-nurse", "臨床護理口說 (Speaking)", "練習護理人員與患者及家容溝通的日常職場英語口說。");
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
    updateMenuCard(cards[0], "level1", "fas fa-leaf", "Level 1 (基礎單字 - A1)", "精選生活與社交基礎詞彙，透過英英釋義建立直覺語感。");
    updateMenuCard(cards[1], "level2", "fas fa-seedling", "Level 2 (初級單字 - A2)", "進階日常與基礎描述詞彙，學習如何精確傳達想法。");
    updateMenuCard(cards[2], "level3", "fas fa-tree", "Level 3 (中級單字 - B1)", "涵蓋學術與工作常用基礎詞彙，提升英文聽讀理解力。");
    updateMenuCard(cards[3], "level4", "fas fa-graduation-cap", "Level 4 (中高單字 - B2)", "商務、時事與思辨核心詞彙，挑戰更流暢的英文表達。");
    updateMenuCard(cards[4], "level5", "fas fa-crown", "Level 5 (高級單字 - C1)", "高難度、文學及專業論述詞彙，適合追求英文完美的挑戰者。");
  }
}

function updateMenuCard(card, category, iconClass, name, desc) {
  card.dataset.category = category;
  card.querySelector(".practice-menu-icon").innerHTML = `<i class="${iconClass}"></i>`;
  card.querySelector(".practice-menu-name").innerText = name;
  card.querySelector(".practice-menu-desc").innerText = desc;
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
    // 清除選擇
    e.target.value = "";
  };
  reader.readAsText(file);
}

