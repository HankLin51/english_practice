// 多益英文練習平台 - 題庫數據
const TOEIC_DATA = {
  // 1. 綠色證書級 (多益 350-465): 基礎商務與日常溝通
  green: {
    title: "綠色證書級 (TOEIC 350-465)",
    badge: "🟢 基礎入門",
    description: "適合建立多益基礎單字與基本文法觀念，著重日常辦公室對話。",
    vocabulary: [
      {
        id: "g_v1",
        word: "confirm",
        partOfSpeech: "v.",
        translation: "確認；證實",
        sentence: "Please call the hotel to confirm your reservation.",
        sentenceTranslation: "請致電飯店以確認您的預約。",
        options: ["取消", "確認", "延期", "抱怨"],
        answer: 1,
        explanation: "confirm 表示「確認」，常用於預約 (reservation)、會議 (meeting) 或訂單 (order) 的確認。"
      },
      {
        id: "g_v2",
        word: "delay",
        partOfSpeech: "n./v.",
        translation: "延遲；耽擱",
        sentence: "The flight was delayed due to bad weather.",
        sentenceTranslation: "班機因惡劣天氣而延誤。",
        options: ["取消", "延誤", "降落", "起飛"],
        answer: 1,
        explanation: "delay 表示「延遲」，在多益交通或出差情境中，常與天氣、機械故障等延誤原因一起出現。"
      },
      {
        id: "g_v3",
        word: "discount",
        partOfSpeech: "n.",
        translation: "折扣",
        sentence: "We offer a 10% discount for cash payments.",
        sentenceTranslation: "我們對現金付款提供九折優惠。",
        options: ["利息", "退款", "折扣", "手續費"],
        answer: 2,
        explanation: "discount 意為「折扣」，提供折扣可用 offer a discount，打折商品稱為 discounted items。"
      },
      {
        id: "g_v4",
        word: "receipt",
        partOfSpeech: "n.",
        translation: "收據；發票",
        sentence: "Please keep your receipt as proof of purchase.",
        sentenceTranslation: "請保留您的收據作為購買憑證。",
        options: ["收據", "信件", "合約", "退款"],
        answer: 0,
        explanation: "receipt 意為「收據」，注意其發音中的 p 不發音。在購物或報帳情境中極為常見。"
      },
      {
        id: "g_v5",
        word: "schedule",
        partOfSpeech: "n./v.",
        translation: "行程表；安排",
        sentence: "The project is running ahead of schedule.",
        sentenceTranslation: "專案進度超前於預定行程。",
        options: ["預算", "行程表", "報告", "合約"],
        answer: 1,
        explanation: "schedule 意為「日程表、行程表」。ahead of schedule 代表進度超前，behind schedule 代表進度落後。"
      }
    ],
    phrases: [
      {
        id: "g_p1",
        phrase: "sign up for",
        translation: "登記報名",
        prompt: "Many employees want to _______ the leadership training seminar.",
        options: ["sign up for", "give up on", "look down on", "put up with"],
        answer: 0,
        explanation: "sign up for 意思是「報名、登記參加」，等同於 register for。"
      },
      {
        id: "g_p2",
        phrase: "fill out",
        translation: "填寫（表格）",
        prompt: "Please _______ this application form and return it to the HR desk.",
        options: ["fill in", "fill out", "fill with", "fill up"],
        answer: 1,
        explanation: "fill out 意為「填寫（表格等完整資訊）」，常用於填寫申請表、問卷等。"
      },
      {
        id: "g_p3",
        phrase: "out of order",
        translation: "故障的",
        prompt: "The vending machine in the lobby is _______, so we need to call repair.",
        options: ["out of work", "out of control", "out of order", "out of date"],
        answer: 2,
        explanation: "out of order 意為機器「故障的」。out of work 是失業，out of date 是過期。"
      },
      {
        id: "g_p4",
        phrase: "deal with",
        translation: "處理；應對",
        prompt: "Our customer service team has to _______ dozens of complaints daily.",
        options: ["deal with", "agree with", "depend on", "lead to"],
        answer: 0,
        explanation: "deal with 意為「處理、應對」，相當於 handle 或 manage。"
      }
    ],
    grammar: [
      {
        id: "g_g1",
        question: "Ms. Green _______ a report to the director yesterday afternoon.",
        options: ["sends", "sending", "sent", "will send"],
        answer: 2,
        explanation: "句尾有時間副詞 yesterday afternoon（昨天下午），表示過去發生的動作，動詞需使用過去式 sent。"
      },
      {
        id: "g_g2",
        question: "The new marketing strategy was _______ received by the sales team.",
        options: ["warm", "warmly", "warmth", "warmer"],
        answer: 1,
        explanation: "空格位於被動態助動詞 was 與過去分詞 received 之間，修飾動詞 received，應選副詞 warmly（熱烈地）。"
      },
      {
        id: "g_g3",
        question: "All visitors must _______ their identification badges at the entrance.",
        options: ["show", "showing", "showed", "shows"],
        answer: 0,
        explanation: "助動詞 must 後面必須接原形動詞，因此選擇 show（出示）。"
      },
      {
        id: "g_g4",
        question: "If the product is defective, customers can exchange it _______ thirty days.",
        options: ["at", "on", "within", "during"],
        answer: 2,
        explanation: "within thirty days 表示「在三十天之內」，表示時間範圍的限制。"
      }
    ],
    sentences: [
      {
        id: "g_s1",
        chinese: "我們將在下週一召開一次會議。",
        words: ["We", "will", "hold", "a", "meeting", "next", "Monday."],
        correctOrder: [0, 1, 2, 3, 4, 5, 6],
        explanation: "英文基本句型：主詞 (We) + 助動詞 (will) + 動詞 (hold) + 受詞 (a meeting) + 時間副詞 (next Monday)。"
      },
      {
        id: "g_s2",
        chinese: "請儘快將這份表格寄給我。",
        words: ["Please", "send", "this", "form", "to me", "as soon as possible."],
        correctOrder: [0, 1, 2, 3, 4, 5],
        explanation: "祈使句以 Please + 原形動詞 (send) 開頭，受詞為 this form，to me 表示對象，最後加上常用片語 as soon as possible。"
      },
      {
        id: "g_s3",
        chinese: "影印機目前無法正常工作。",
        words: ["The", "photocopier", "is", "not", "working", "properly", "right now."],
        correctOrder: [0, 1, 2, 3, 4, 5, 6],
        explanation: "現在進行式否定形：主詞 (The photocopier) + is not + working，後接副詞 properly（正常地）與時間 right now。"
      }
    ],
    dialogue: [
      {
        id: "g_d1",
        title: "訪客登記與接待",
        roleA: "Hello, I am here to meet with Mr. Davis.",
        translationA: "你好，我是來拜訪戴維斯先生的。",
        roleB: "Please sign your name in the guest book first.",
        translationB: "請先在訪客簿上簽名。",
        explanation: "訪客來訪時的標準櫃檯接待對答。meet with 表示「與...會面」，sign your name 表示「簽名」。"
      },
      {
        id: "g_d2",
        title: "詢問辦公設備位置",
        roleA: "Excuse me, where is the copy room?",
        translationA: "不好意思，請問影印室在哪裡？",
        roleB: "It is just down the hall, next to the break room.",
        translationB: "就在走廊盡頭，休息室旁邊。",
        explanation: "常見的辦公室方位詢問。down the hall 意為「沿著走廊走」，next to 意為「在...旁邊」。"
      }
    ]
  },

  // 2. 藍色證書級 (多益 470-725): 中階商務與職場溝通
  blue: {
    title: "藍色證書級 (TOEIC 470-725)",
    badge: "🔵 職場進階",
    description: "針對中階商務情境，如簡報、會議協商、市場行銷及專案管理。",
    vocabulary: [
      {
        id: "b_v1",
        word: "approximate",
        partOfSpeech: "adj.",
        translation: "大約的；近似的",
        sentence: "What is the approximate cost of the renovation project?",
        sentenceTranslation: "這項翻修工程的大約費用是多少？",
        options: ["精確的", "大約的", "昂貴的", "合理的"],
        answer: 1,
        explanation: "approximate 作形容詞表示「大約的」，其副詞形式為 approximately，常修飾數字或時間。"
      },
      {
        id: "b_v2",
        word: "collaborate",
        partOfSpeech: "v.",
        translation: "合作；協作",
        sentence: "Two departments will collaborate on the new campaign.",
        sentenceTranslation: "兩個部門將在新的行銷活動上展開合作。",
        options: ["競爭", "妥協", "合作", "衝突"],
        answer: 2,
        explanation: "collaborate on + 項目，或 collaborate with + 人。意為「共同合作」，是多益職場高頻詞。"
      },
      {
        id: "b_v3",
        word: "distribute",
        partOfSpeech: "v.",
        translation: "分發；分配；分銷",
        sentence: "The flyers will be distributed to local residents.",
        sentenceTranslation: "傳單將分發給當地的居民。",
        options: ["收集", "分發", "製造", "銷毀"],
        answer: 1,
        explanation: "distribute 意為「分發、分配」，名詞形式為 distribution，在物流與行銷學中常用作「分銷、通路」。"
      },
      {
        id: "b_v4",
        word: "implement",
        partOfSpeech: "v.",
        translation: "實施；執行",
        sentence: "The management decided to implement new security policies.",
        sentenceTranslation: "管理層決定實實施新的安全政策。",
        options: ["推遲", "討論", "實施", "取消"],
        answer: 2,
        explanation: "implement 意為「執行、實施」，常用賓語有 policy（政策）、plan（計劃）、decision（決定）。"
      },
      {
        id: "b_v5",
        word: "negotiate",
        partOfSpeech: "v.",
        translation: "談判；協商",
        sentence: "We managed to negotiate a better deal with our supplier.",
        sentenceTranslation: "我們設法與供應商談判出更好的交易條件。",
        options: ["取消", "談判", "抱怨", "起訴"],
        answer: 1,
        explanation: "negotiate 意為「談判、協商」，名詞為 negotiation，形容詞為 negotiable（可協商的）。"
      }
    ],
    phrases: [
      {
        id: "b_p1",
        phrase: "look into",
        translation: "調查；研究",
        prompt: "The technician promised to _______ the system error as soon as possible.",
        options: ["look into", "look up to", "look forward to", "look down on"],
        answer: 0,
        explanation: "look into 意為「調查、探究」，在客戶抱怨或系統故障排解情境中十分常見，相當於 investigate。"
      },
      {
        id: "b_p2",
        phrase: "put off",
        translation: "延期；推遲",
        prompt: "Because of the urgent crisis, the annual board meeting has been _______.",
        options: ["put out", "put away", "put off", "put down"],
        answer: 2,
        explanation: "put off 意為「延期、延後」，相當於 postpone 或 delay。"
      },
      {
        id: "b_p3",
        phrase: "take advantage of",
        translation: "利用；佔便宜",
        prompt: "We should _______ the low interest rates to expand our business.",
        options: ["take part in", "take care of", "take advantage of", "take charge of"],
        answer: 2,
        explanation: "take advantage of 意為「利用（機會等有利形勢）」，有時亦可有貶義，但在商業英語中多為「善用」資源之意。"
      },
      {
        id: "b_p4",
        phrase: "carry out",
        translation: "執行；開展",
        prompt: "The research institute will _______ a survey on consumer preferences.",
        options: ["carry out", "carry on", "bring about", "bring up"],
        answer: 0,
        explanation: "carry out 意為「執行、實施（研究、調查、任務等）」，相當於 conduct 或 perform。"
      }
    ],
    grammar: [
      {
        id: "b_g1",
        question: "Ms. Carter, _______ design won the annual award, will lead the new project.",
        options: ["who", "whom", "whose", "which"],
        answer: 2,
        explanation: "空格後有名詞 design，此處需要一個關係所有格代名詞，修飾 Ms. Carter 的設計，故選 whose。"
      },
      {
        id: "b_g2",
        question: "The director has suggested _______ a consultant to analyze our financial issues.",
        options: ["hire", "to hire", "hiring", "hired"],
        answer: 2,
        explanation: "動詞 suggest 後若直接接動詞作為賓語，必須使用動名詞 (V-ing)，即 suggest hiring。"
      },
      {
        id: "b_g3",
        question: "The seminar was postponed _______ the guest speaker fell ill unexpectedly.",
        options: ["because of", "because", "due to", "owing to"],
        answer: 1,
        explanation: "空格後面是一個完整的子句 (the guest speaker fell ill...)，因此需要使用連接詞 because，而非介係詞片語 because of/due to。"
      },
      {
        id: "b_g4",
        question: "The laboratory equipment must be handled as _______ as possible.",
        options: ["careful", "carefully", "carefulness", "caring"],
        answer: 1,
        explanation: "句中 be handled 是被動態動詞，空格處修飾 handle，應使用副詞 carefully。as...as possible 夾副詞修飾動詞。"
      }
    ],
    sentences: [
      {
        id: "b_s1",
        chinese: "我們必須設法降低我們的生產成本。",
        words: ["We", "must", "find a way", "to reduce", "our", "production costs."],
        correctOrder: [0, 1, 2, 3, 4, 5],
        explanation: "情態助動詞 must 接原形動詞 find，find a way 接不定詞 to reduce 作為修飾，最後接賓語 production costs。"
      },
      {
        id: "b_s2",
        chinese: "總經理昨天宣布了新的公司政策。",
        words: ["The general manager", "announced", "the new", "company policy", "yesterday."],
        correctOrder: [0, 1, 2, 3, 4],
        explanation: "標準的 SVO 過去式結構：主詞 (The general manager) + 動詞 (announced) + 賓語 (the new company policy) + 時間 (yesterday)。"
      },
      {
        id: "b_s3",
        chinese: "由於天氣惡劣，會議不得不延期。",
        words: ["Due to", "bad weather,", "the meeting", "had to", "be postponed."],
        correctOrder: [0, 1, 2, 3, 4],
        explanation: "Due to (由於) 引導原因介係詞片語放在句首，主句使用被動式 had to be postponed (不得不被延期)。"
      }
    ],
    dialogue: [
      {
        id: "b_d1",
        title: "討論簡報回饋",
        roleA: "How did your presentation go with the investors?",
        translationA: "你跟投資人的簡報進行得怎麼樣？",
        roleB: "Overall it went well, but they asked for more detailed budget projections.",
        translationB: "整體來說很順利，但他們要求提供更詳細的預算估算。",
        explanation: "簡報後的進度匯報。projection 在商業英語中常用作「預測、估算」而非單純的投射。"
      },
      {
        id: "b_d2",
        title: "供應鏈延誤協商",
        roleA: "We are facing a slight delay in raw materials shipment.",
        translationA: "我們的原料船運面臨輕微的延誤。",
        roleB: "If that is the case, we might need to adjust our manufacturing schedule.",
        translationB: "如果是這樣的話，我們可能需要調整我們的生產時程表。",
        explanation: "製造業與供應鏈常見的突發狀況溝通。adjust schedule 意為「調整時程表」。"
      }
    ]
  },

  // 3. 金色證書級 (多益 730-990): 高級商務、管理與複雜決策
  gold: {
    title: "金色證書級 (TOEIC 730-990)",
    badge: "🥇 頂尖商務",
    description: "挑戰高難度商務字彙、複雜子句結構、談判對話與高階決策溝通。",
    vocabulary: [
      {
        id: "gold_v1",
        word: "commensurate",
        partOfSpeech: "adj.",
        translation: "相稱的；相符的",
        sentence: "Salary will be commensurate with your experience and qualifications.",
        sentenceTranslation: "薪資將與您的經驗及資格相稱。",
        options: ["優渥的", "相稱的", "協商的", "固定的"],
        answer: 1,
        explanation: "commensurate 常與介係詞 with 連用 (be commensurate with)，表示「與...相稱/成比例」，多出現在招聘廣告的薪資福利說明中。"
      },
      {
        id: "gold_v2",
        word: "fluctuate",
        partOfSpeech: "v.",
        translation: "波動；起伏",
        sentence: "Market prices fluctuate wildly depending on global supply.",
        sentenceTranslation: "市場價格會根據全球供應量而劇烈波動。",
        options: ["上漲", "下跌", "波動", "穩定"],
        answer: 2,
        explanation: "fluctuate 意為「起伏、上下波動」，多用於形容價格 (prices)、匯率 (exchange rates)、溫度 (temperatures) 等。"
      },
      {
        id: "gold_v3",
        word: "incentive",
        partOfSpeech: "n.",
        translation: "激勵；誘因；獎金",
        sentence: "The company offers cash incentives for employees who exceed their targets.",
        sentenceTranslation: "公司對超出目標的員工提供現金獎勵。",
        options: ["懲罰", "誘因", "合約", "培訓"],
        answer: 1,
        explanation: "incentive 意為「激勵、誘因」，能推動某人採取行動。多益中常用於員工福利或市場促銷方案。"
      },
      {
        id: "gold_v4",
        word: "precedent",
        partOfSpeech: "n.",
        translation: "先例；前例",
        sentence: "This decision will set a precedent for future legal disputes.",
        sentenceTranslation: "這個決定將為未來的法律糾紛創下先例。",
        options: ["警告", "先例", "障礙", "標準"],
        answer: 1,
        explanation: "precedent 意為「先例」，常見動詞搭配為 set a precedent（樹立先例）或 without precedent（無先例的）。"
      },
      {
        id: "gold_v5",
        word: "stringent",
        partOfSpeech: "adj.",
        translation: "嚴格的；嚴厲的",
        sentence: "The chemical plant must comply with stringent environmental regulations.",
        sentenceTranslation: "這間化工廠必須遵守嚴格的環保法規。",
        options: ["寬鬆的", "嚴格的", "臨時的", "過時的"],
        answer: 1,
        explanation: "stringent 常用於形容 regulations（法規）、standards（標準）或 controls（控制），意為「嚴格的、毫無寬容餘地的」。"
      }
    ],
    phrases: [
      {
        id: "gold_p1",
        phrase: "comply with",
        translation: "遵守；順從",
        prompt: "All research procedures must _______ the safety protocols established by the committee.",
        options: ["comply with", "dispose of", "depend on", "consist of"],
        answer: 0,
        explanation: "comply with 意為「遵守（規定、法律、合約等）」，與 adhere to、conform to 同義。"
      },
      {
        id: "gold_p2",
        phrase: "in light of",
        translation: "鑑於；考慮到",
        prompt: "_______ the recent budget cuts, we have to scale back our promotional activities.",
        options: ["In spite of", "In light of", "In charge of", "In contrast to"],
        answer: 1,
        explanation: "in light of 意為「鑑於、考慮到...的結果」，表示在得知或考慮某些新資訊後所做出的調整。"
      },
      {
        id: "gold_p3",
        phrase: "be eligible for",
        translation: "有資格獲得...",
        prompt: "Only employees who have served for over a year are _______ the annual bonus.",
        options: ["eligible for", "compatible with", "responsible for", "accustomed to"],
        answer: 0,
        explanation: "be eligible for + 名詞，或 be eligible to + 動詞，意為「有資格獲得/做某事」。"
      },
      {
        id: "gold_p4",
        phrase: "fall through",
        translation: "落空；失敗",
        prompt: "Unfortunately, the merger talks _______ at the eleventh hour due to valuation differences.",
        options: ["fell down", "fell behind", "fell through", "fell out"],
        answer: 2,
        explanation: "fall through 常用於形容交易、談判、計畫「落空、失敗、未能實現」。at the eleventh hour 意為「在最後一刻」。"
      }
    ],
    grammar: [
      {
        id: "gold_g1",
        question: "Had the company invested in R&D earlier, it _______ the market leader today.",
        options: ["will be", "would be", "would have been", "is"],
        answer: 1,
        explanation: "本題為「混和條件句」。從句 Had the company invested... 是與過去事實相反（原本是 If the company had invested... 倒裝），主句表示對現在事實的假設影響（有 today），應使用「would + 原形動詞」，故選 would be。"
      },
      {
        id: "gold_g2",
        question: "The chief executive officer requested that all department heads _______ the budget proposal by Friday.",
        options: ["submit", "submits", "submitted", "should be submitted"],
        answer: 0,
        explanation: "表示「建議、要求、命令、堅持」的動詞 request 後接 that 子句時，子句動詞必須使用「(should) + 原形動詞」，此處省略 should，應選原形動詞 submit。"
      },
      {
        id: "gold_g3",
        question: "Not only _______ the quarterly target, but the sales team also secured a major long-term contract.",
        options: ["we reached", "did we reach", "have we reached", "we had reached"],
        answer: 1,
        explanation: "否定副詞片語 Not only 置於句首時，句子必須進行「倒裝」。後半句為過去式 (secured)，因此前半句也應為過去式倒裝，使用助動詞 did + 主詞 + 原形動詞，即 did we reach。"
      },
      {
        id: "gold_g4",
        question: "The merger is expected to yield substantial synergies, _______ the company's competitiveness.",
        options: ["enhance", "enhanced", "enhancing", "enhancement"],
        answer: 2,
        explanation: "此處為分詞建構的副詞子句簡化。原句為 ', which enhances the company's...' 主動簡化為現在分詞 enhancing，表示伴隨產生的結果。"
      }
    ],
    sentences: [
      {
        id: "gold_s1",
        chinese: "鑑於最近的市場趨勢，我們必須重新評估我們的投資組合。",
        words: ["In light of", "recent market trends,", "we must", "re-evaluate", "our", "investment portfolio."],
        correctOrder: [0, 1, 2, 3, 4, 5],
        explanation: "以 In light of (鑑於) 引導介係詞短語開頭，後接主句，動詞 re-evaluate 後接名詞詞組 investment portfolio。"
      },
      {
        id: "gold_s2",
        chinese: "如果我們提早開始談判，合約早就簽好了。",
        words: ["Had we", "begun negotiations", "earlier,", "the contract", "would have been", "signed by now."],
        correctOrder: [0, 1, 2, 3, 4, 5],
        explanation: "與過去事實相反的假設語氣倒裝句。If we had begun... 倒裝為 Had we begun...，主句使用 would have been + 過去分詞表示過去可能已發生的被動動作。"
      },
      {
        id: "gold_s3",
        chinese: "這間化工廠必須遵守極其嚴格的環保法規。",
        words: ["The chemical plant", "must comply with", "extremely", "stringent", "environmental", "regulations."],
        correctOrder: [0, 1, 2, 3, 4, 5],
        explanation: "comply with 為固定片語。名詞 regulations 前有形容詞 environmental (環境的) 與 stringent (嚴格的) 修飾，副詞 extremely 修飾 stringent。"
      }
    ],
    dialogue: [
      {
        id: "gold_d1",
        title: "跨國併購估值談判",
        roleA: "We believe your valuation of the intellectual property is slightly overstated.",
        translationA: "我們認為貴公司對智慧財產權的估值有些過高了。",
        roleB: "In light of our proprietary patents, we assure you the premium is fully justified.",
        translationB: "鑑於我們的專利技術，我們向您保證此溢價是完全合理的。",
        explanation: "高階商務談判。valuation（估值）、overstated（高估）、proprietary patents（專有專利）、premium（溢價）、justified（有合理依據的）。"
      },
      {
        id: "gold_d2",
        title: "董事會預算縮減檢討",
        roleA: "The board is pressing for a fifteen percent reduction in operational expenditures.",
        translationA: "董事會正施壓要求削減百分之十五的營運開支。",
        roleB: "That will inevitably impact our R&D capabilities unless we optimize overhead costs first.",
        translationB: "這將不可避免地影響我們的研發能力，除非我們首先優化經常性開支。",
        explanation: "董事會級別決策討論。expenditure（開支）、inevitably（不可避免地）、overhead costs（企業日常經常性開支/管理費用）。"
      }
    ]
  }
};

// 4. 美國註冊護理師考試 (NCLEX-RN) 題庫
const RN_DATA = {
  title: "美國註冊護理師 (NCLEX-RN)",
  badge: "🩺 專業證照",
  description: "涵蓋藥理學、內外科護理、兒科及婦產科等 NCLEX 英文高頻考題與病理詳解。",
  pharmacology: [
    {
      id: "rn_ph1",
      question: "A nurse is preparing to administer digoxin to a patient with heart failure. Which of the following parameters should the nurse assess before administration?",
      options: [
        "Apical heart rate for 1 full minute",
        "Radial pulse for 15 seconds",
        "Blood pressure in both arms",
        "Respiratory rate for 30 seconds"
      ],
      answer: 0,
      explanation: "給予毛地黃 (digoxin) 之前必須測量心尖脈 (Apical heart rate) 整整 1 分鐘。若成人心率低於 60 次/分 (bpm) 則應暫緩給藥並通知醫生，因為 digoxin 會降低房室結傳導，可能加重緩慢型心律不整。"
    },
    {
      id: "rn_ph2",
      question: "A patient is prescribed warfarin for atrial fibrillation. Which laboratory value should the nurse monitor to evaluate the therapeutic effect of this medication?",
      options: [
        "Activated partial thromboplastin time (aPTT)",
        "Prothrombin time and International Normalized Ratio (PT/INR)",
        "Platelet count",
        "Hemoglobin and hematocrit"
      ],
      answer: 1,
      explanation: "Warfarin 是口服抗凝血藥物，主要抑制維生素K依賴型凝血因子，臨床上使用 PT/INR 來監測其療效。而注射用肝素 (Heparin) 則使用 aPTT 來監測。"
    },
    {
      id: "rn_ph3",
      question: "A patient is receiving intravenous furosemide. Which of the following electrolyte imbalances is the patient at risk for?",
      options: [
        "Hyperkalemia",
        "Hypokalemia",
        "Hypercalcemia",
        "Hypnatremia"
      ],
      answer: 1,
      explanation: "Furosemide (Lasix) 是一種排鉀利尿劑 (loop diuretic)，會促進水分、鈉與鉀離子的排出，因此患者有發生低鉀血症 (hypokalemia) 的風險。需注意患者心律並監測鉀離子濃度。"
    }
  ],
  medSurg: [
    {
      id: "rn_ms1",
      question: "Which of the following clinical manifestations should the nurse expect to observe in a patient diagnosed with Grave's disease (hyperthyroidism)?",
      options: [
        "Weight gain, bradycardia, cold intolerance",
        "Weight loss, tachycardia, heat intolerance",
        "Lethargy, constipation, dry skin",
        "Hypotension, hypoglycemia, hyperkalemia"
      ],
      answer: 1,
      explanation: "葛瑞夫茲氏病 (Grave's disease) 屬於甲狀腺機能亢進 (hyperthyroidism)，其代謝率加快，臨床表現包括體重減輕 (weight loss)、心跳過速 (tachycardia) 以及畏熱 (heat intolerance)。而體重增加、心跳過緩、怕冷則是甲狀腺機能低下 (hypothyroidism) 的表現。"
    },
    {
      id: "rn_ms2",
      question: "A patient with type 1 diabetes mellitus presents with deep, rapid respirations, fruity breath odor, and blood glucose of 450 mg/dL. The nurse recognizes these as signs of which condition?",
      options: [
        "Hypoglycemic reaction",
        "Diabetic Ketoacidosis (DKA)",
        "Hyperosmolar Hyperglycemic State (HHS)",
        "Syndrome of Inappropriate Antidiuretic Hormone (SIADH)"
      ],
      answer: 1,
      explanation: "深快呼吸 (Kussmaul respirations)、水果味呼吸 (fruity breath odor) 及高血糖是糖尿病酮酸中毒 (DKA) 的典型特徵，常見於第一型糖尿病患者。HHS 則多見於第二型糖尿病，代謝性酸中毒與酮體表現不明顯。"
    },
    {
      id: "rn_ms3",
      question: "A nurse is caring for a patient who is 12 hours postoperative following a total thyroidectomy. The patient complains of tingling around the mouth and muscle spasms in the hands. Which complication should the nurse suspect?",
      options: [
        "Thyroid storm",
        "Hypocalcemia",
        "Recurrent laryngeal nerve damage",
        "Postoperative hemorrhage"
      ],
      answer: 1,
      explanation: "甲狀腺切除術後，若副甲狀腺 (parathyroid glands) 被誤切或受損，會導致副甲狀腺素分泌下降，引起急性低血鈣 (hypocalcemia)。其典型症狀包括嘴唇周圍麻木感 (tingling around mouth)、手部抽搐 (Trousseau's sign) 與面部抽搐 (Chvostek's sign)。"
    }
  ],
  pediatric: [
    {
      id: "rn_pe1",
      question: "A 4-year-old child is admitted with suspected acute epiglottitis. Which of the following nursing interventions is contraindicated for this child?",
      options: [
        "Keeping the child calm and in an upright position",
        "Visualizing the throat using a tongue blade",
        "Preparing equipment for emergency intubation",
        "Administering humidified oxygen as tolerated"
      ],
      answer: 1,
      explanation: "懷疑急性會厭炎 (acute epiglottitis) 的病童，**嚴禁**使用壓舌板 (tongue blade) 檢查喉嚨，因為這可能會誘發嚴重的喉頭痙攣 (laryngospasm)，導致氣道完全阻塞。應保持病童安靜、採直立坐姿，並準備好緊急插管設備。"
    },
    {
      id: "rn_pe2",
      question: "A nurse is teaching the parents of a child with celiac disease about dietary management. Which of the following grains should the parents exclude from the child's diet?",
      options: [
        "Rice",
        "Corn",
        "Wheat",
        "Millet"
      ],
      answer: 2,
      explanation: "乳糜瀉 (celiac disease) 是一種對麩質 (gluten) 不耐受的自體免疫疾病。麩質存在於小麥 (wheat)、大麥 (barley)、黑麥 (rye) 中。稻米 (rice)、玉米 (corn) 與小米 (millet) 則是無麩質的，可以安全食用。"
    }
  ],
  maternity: [
    {
      id: "rn_ma1",
      question: "A pregnant patient at 36 weeks gestation is admitted with sudden-onset, painless bright red vaginal bleeding. The nurse should suspect which obstetric complication?",
      options: [
        "Abruptio placentae",
        "Placenta previa",
        "Ectopic pregnancy",
        "Uterine rupture"
      ],
      answer: 1,
      explanation: "妊娠晚期出現突然發生的、**無痛性**鮮紅色陰道出血是**前置胎盤 (Placenta previa)** 的特徵。而**胎盤早期剝離 (Abruptio placentae)** 通常伴隨**劇烈腹痛**和子宮壓痛。"
    },
    {
      id: "rn_ma2",
      question: "A nurse is caring for a patient in labor who is receiving an oxytocin infusion. The nurse notes persistent late decelerations on the fetal heart rate monitor. Which action should the nurse take first?",
      options: [
        "Increase the rate of the oxytocin infusion",
        "Position the patient on her left side",
        "Administer oxygen at 2 L/min via nasal cannula",
        "Prepare the patient for immediate vaginal delivery"
      ],
      answer: 1,
      explanation: "胎心音監測出現持續性晚期減速 (late decelerations) 指示胎盤功能不足、胎兒缺氧。首要護理措施是停止催產素 (oxytocin) 並**協助產婦側臥 (usually left side)**，以解除下腔靜脈受壓，增加胎盤血流量。其次是給予氧氣與增加靜脈輸液。"
    }
  ],
  dialogue: [
    {
      id: "rn_di1",
      title: "交班急症回報",
      roleA: "The patient in bed four is complaining of severe chest pain.",
      translationA: "四號床的病人抱怨胸部劇烈疼痛。",
      roleB: "I will obtain a twelve-lead electrocardiogram immediately and check their vital signs.",
      translationB: "我會立即進行十二導程心電圖檢查，並測量生命徵象。",
      explanation: "面對胸痛患者，立即獲取 12-lead ECG (心電圖) 與 assessment of vital signs (生命徵象) 是護理評估的首要步驟，以排查心肌梗塞 (myocardial infarction)。"
    },
    {
      id: "rn_di2",
      title: "衛教胰島素注射",
      roleA: "Can you show me where I should inject the insulin?",
      translationA: "你能示範我應該在哪裡注射胰島素嗎？",
      roleB: "You should rotate injection sites in the abdomen, keeping at least one inch from the navel.",
      translationB: "您應該在腹部輪換注射部位，並距離肚臍至少一英寸。",
      explanation: "胰島素皮下注射衛教。rotate injection sites (輪換注射部位) 是為了防止脂肪營養不良 (lipodystrophy)；保持與 navel (肚臍) 一英寸距離以確保穩定的皮下吸收率。"
    }
  ]
};
