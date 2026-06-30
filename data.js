// 智能單字分級字表 (用於 Dictionary API 線上出題)
const DICT_WORDLIST = {
  level1: [
    "happy", "friend", "family", "school", "travel", "simple", "always", "learn", 
    "healthy", "listen", "people", "understand", "window", "garden", "doctor"
  ],
  level2: [
    "achieve", "believe", "connect", "create", "decide", "explore", "happen", "imagine", 
    "improve", "protect", "receive", "reduce", "support", "together", "various"
  ],
  level3: [
    "accidental", "challenge", "delivery", "encourage", "frequently", "general", "hesitate", 
    "immediate", "observe", "prevent", "quality", "resource", "scared", "treatment", "valuable"
  ],
  level4: [
    "advocate", "collaborate", "diversity", "enhance", "flexible", "guarantee", "hypothesis", 
    "innovative", "minimize", "obstacle", "promote", "resilient", "stimulate", "transition", "unify"
  ],
  level5: [
    "aesthetic", "benevolent", "cognitive", "diligent", "ephemeral", "fortitude", "gregarious", 
    "haphazard", "indigenous", "juxtapose", "lucrative", "meticulous", "nebulous", "ostentatious", "pragmatic"
  ]
};

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
    },
    {
      id: "rn_ph4",
      question: "A nurse is caring for a patient receiving a continuous intravenous Heparin infusion. Which laboratory value should the nurse monitor to adjust the dosage?",
      options: [
        "Prothrombin time (PT)",
        "Activated partial thromboplastin time (aPTT)",
        "International Normalized Ratio (INR)",
        "Platelet count"
      ],
      answer: 1,
      explanation: "肝素 (Heparin) 靜脈注射主要使用 aPTT (Activated partial thromboplastin time) 作為抗凝血療效的監測指標。而口服抗凝血藥 Warfarin 則是使用 PT/INR。"
    },
    {
      id: "rn_ph5",
      question: "A patient is discharged with a prescription for Spironolactone. Which dietary instruction is most important for the nurse to provide?",
      options: [
        "Increase intake of high-potassium foods like bananas and spinach",
        "Avoid potassium-rich foods and salt substitutes containing potassium",
        "Maintain a high-sodium diet to prevent dehydration",
        "Restrict fluid intake to 1 liter per day"
      ],
      answer: 1,
      explanation: "螺內酯 (Spironolactone/Aldactone) 是一種保鉀利尿劑 (potassium-sparing diuretic)，容易導致高鉀血症 (hyperkalemia)。因此應衛教患者避免攝取過量的高鉀食物（如香蕉、深綠色蔬菜、柳橙）及含鉀的代鹽。"
    },
    {
      id: "rn_ph6",
      question: "A patient with stable angina is prescribed sublingual nitroglycerin tablets. What should the nurse teach the patient regarding administration during an acute chest pain episode?",
      options: [
        "Take 1 tablet every 15 minutes up to a total of 5 tablets",
        "Take 1 tablet, and if pain is not relieved in 5 minutes, call 911 immediately before taking a second one",
        "Take 1 tablet, and if pain is not relieved in 5 minutes, call 911 and take a second tablet",
        "Swallow the tablet with a full glass of water for rapid absorption"
      ],
      answer: 2,
      explanation: "舌下硝酸甘油 (nitroglycerin) 常用於心絞痛急救。正確指引是：出現症狀時服 1 錠，等 5 分鐘。若疼痛未緩解或加劇，**應立即撥打 119/911** 並服用第 2 錠。最多可服用 3 錠。"
    },
    {
      id: "rn_ph7",
      question: "A nurse is caring for a patient who has taken an overdose of acetaminophen. Which medication should the nurse anticipate administering as an antidote?",
      options: [
        "Naloxone",
        "Acetylcysteine",
        "Flumazenil",
        "Protamine sulfate"
      ],
      answer: 1,
      explanation: "乙醯胺酚 (Acetaminophen/Tylenol) 藥物過量中毒，會產生肝毒性代謝物，其專屬解毒劑是乙醯半胱氨酸 (Acetylcysteine)。Naloxone 是鴉片類解毒劑，Flumazenil 是 BZD 類解毒劑，Protamine sulfate 是 Heparin 解毒劑。"
    },
    {
      id: "rn_ph8",
      question: "A patient is prescribed Lisinopril for hypertension. The nurse should instruct the patient to report which common and dry cough-inducing side effect?",
      options: [
        "Dry hacking cough",
        "Peripheral edema",
        "Severe hypokalemia",
        "Constipation"
      ],
      answer: 0,
      explanation: "血管收縮素轉化酶抑制劑 (ACE inhibitors, 如 Lisinopril) 常見的特異性副作用是乾咳 (dry cough)，這是由於體內緩激肽 (bradykinin) 累積所致，若乾咳嚴重通常需要換藥。另一個罕見但嚴重的副作用是血管性水腫 (angioedema)。"
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
      explanation: "甲狀腺切除術後，若副甲狀腺 (parathyroid glands) 被阻斷或受損，會導致副甲狀腺素分泌下降，引起急性低血鈣 (hypocalcemia)。其典型症狀包括嘴唇周圍麻木感 (tingling around mouth)、手部抽搐 (Trousseau's sign) 與面部抽搐 (Chvostek's sign)。"
    },
    {
      id: "rn_ms4",
      question: "A patient presents with suspected acute appendicitis. Which of the following assessment findings should the nurse prioritize to confirm this condition?",
      options: [
        "Pain relieved by coughing or movement",
        "Rebound tenderness in the right lower quadrant (RLQ)",
        "Hyperactive bowel sounds in all quadrants",
        "Pain radiating to the left shoulder"
      ],
      answer: 1,
      explanation: "急性闌尾炎 (appendicitis) 的典型理學檢查特徵是右下腹部麥氏點 (McBurney's point) 的壓痛與反跳痛 (rebound tenderness)。如果疼痛突然完全消失，可能暗示闌尾破裂，需緊急處理。"
    },
    {
      id: "rn_ms5",
      question: "A nurse notices that a patient's chest tube has accidentally become dislodged from the insertion site. Which action should the nurse take first?",
      options: [
        "Call the physician immediately to reinsert the tube",
        "Apply a sterile occlusive dressing taped on three sides over the site",
        "Insert a sterile gloved finger into the insertion site to seal it",
        "Clamp the chest tube close to the patient's chest wall"
      ],
      answer: 1,
      explanation: "胸管意外滑脫時，首要護理措施是立即用無菌不透氣敷料 (sterile occlusive dressing/Vaseline gauze) 覆蓋，並只固定三邊。這能形成單向閥作用：患者呼氣時氣體可排出，吸氣時阻絕外界空氣進入，防止發生張力性氣胸 (tension pneumothorax)。"
    },
    {
      id: "rn_ms6",
      question: "A patient with severe Chronic Obending Pulmonary Disease (COPD) is receiving oxygen therapy. The nurse should closely monitor the patient to avoid suppressing which primary respiratory drive?",
      options: [
        "Hypercapnic drive (elevated CO2 levels)",
        "Hypoxic drive (low arterial O2 levels)",
        "Acidotic drive (low blood pH)",
        "Alkalotic drive (high bicarbonate levels)"
      ],
      answer: 1,
      explanation: "健康人的呼吸刺激來自血液二氧化碳升高 (hypercapnic drive)。但重度 COPD 患者長期二氧化碳滯留，呼吸中樞對二氧化碳失去敏感度，其呼吸完全依賴低血氧刺激 (hypoxic drive)。因此，若給予高流量氧氣，血氧過高會消除其缺氧驅動，引發呼吸暫停。"
    },
    {
      id: "rn_ms7",
      question: "A patient is admitted with suspected bacterial meningitis. The nurse assesses the patient for meningeal irritation. Which of the following signs indicates a positive Brudzinski's sign?",
      options: [
        "Pain and stiffness in the neck when trying to touch the chin to the chest",
        "Flexion of the hips and knees in response to passive neck flexion",
        "Inability to extend the leg when the hip is flexed at 90 degrees",
        "Numbness and tingling in the lower extremities"
      ],
      answer: 1,
      explanation: "布魯辛斯基氏徵 (Brudzinski's sign) 是指被動屈曲患者頸部時，患者會出現自動的雙側髖關節與膝關節屈曲動作，代表腦膜受刺激。A 選項是頸部僵直 (nuchal rigidity)，C 選項是克尼格氏徵 (Kernig's sign)。"
    },
    {
      id: "rn_ms8",
      question: "A patient is in hypovolemic shock. Which of the following positions should the nurse place the patient in to promote venous return?",
      options: [
        "High Fowler's position",
        "Trendelenburg position",
        "Modified Trendelenburg position (legs elevated 30-45 degrees, trunk flat)",
        "Prone position"
      ],
      answer: 2,
      explanation: "低血容量性休克 (hypovolemic shock) 建議採「改良式垂頭仰臥位 (Modified Trendelenburg)」：保持頭部與軀幹平躺，將下肢抬高 30 到 45 度。這能利用重力將下肢血液回流至中心循環，增加心輸出量，同時避免壓迫膈肌引發呼吸困難。"
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
    },
    {
      id: "rn_pe3",
      question: "A 2-year-old child with Tetralogy of Fallot experienced a hypercyanotic spell ('tet spell') during crying. Which of the following actions should the nurse take first?",
      options: [
        "Administer 100% oxygen via simple face mask",
        "Place the child in a knee-to-chest position",
        "Administer intravenous morphine sulfate",
        "Obtain a twelve-lead electrocardiogram"
      ],
      answer: 1,
      explanation: "當法洛氏四聯症 (Tetralogy of Fallot) 幼兒發生缺氧發作 (tet spell) 時，首要的非藥物急救措施是將幼兒置於「膝胸臥位 (knee-to-chest position)」。此體位能增加體循環阻力 (SVR)，減少右向左分流，迫使更多血液流向肺部進行氣體交換。"
    },
    {
      id: "rn_pe4",
      question: "A nurse is assessing a 4-week-old infant suspected of having hypertrophic pyloric stenosis. Which of the following clinical manifestations should the nurse expect to observe?",
      options: [
        "Bile-stained projectile vomiting",
        "Non-bilious projectile vomiting and an olive-shaped abdominal mass",
        "Ribbon-like, foul-smelling stools",
        "Currant jelly-like stools containing blood and mucus"
      ],
      answer: 1,
      explanation: "肥厚性幽門狹窄 (pyloric stenosis) 常見於 3-6 週大嬰兒，其特徵為「非膽汁性噴射性嘔吐 (non-bilious projectile vomiting)」，且在右上腹部可觸及橄欖樣的包塊。C 選項是巨結腸症，D 選項是腸套疊。"
    },
    {
      id: "rn_pe5",
      question: "A 6-year-old child is brought to the emergency department with an acute asthma exacerbation. Which medication should the nurse prepare to administer immediately to relieve bronchospasm?",
      options: [
        "Salmeterol (long-acting beta2-agonist)",
        "Albuterol (short-acting beta2-agonist)",
        "Fluticasone (inhaled corticosteroid)",
        "Montelukast (leukotriene receptor antagonist)"
      ],
      answer: 1,
      explanation: "氣喘急性發作 (acute asthma attack) 需立刻給予支氣管擴張劑。沙丁胺醇 (Albuterol) 是一種短效型β2受體協同劑 (SABA)，屬於快速緩解藥 (rescue drug)；而吸入型類固醇 (Fluticasone) 與長效型支氣管擴張劑 (Salmeterol) 用於日常長期控制，急性發作時無效。"
    },
    {
      id: "rn_pe6",
      question: "A nurse is preparing to administer otic drops to a 2-year-old child with otitis media. How should the nurse pull the pinna of the ear?",
      options: [
        "Up and back",
        "Down and back",
        "Straight back",
        "Forward and down"
      ],
      answer: 1,
      explanation: "對於 3 歲以下的嬰幼兒，由於耳咽管和外耳道生理構造，滴耳藥時應將耳廓 (pinna) 向「後下方 (down and back)」拉。3 歲以上兒童及成人，則應向「後上方 (up and back)」拉，以利藥物注入。"
    },
    {
      id: "rn_pe7",
      question: "A nurse is caring for a child diagnosed with Kawasaki disease. Which life-threatening cardiovascular complication should the nurse monitor for?",
      options: [
        "Mitral valve prolapse",
        "Coronary artery aneurysm",
        "Patent ductus arteriosus",
        "Ventricular septal defect"
      ],
      answer: 1,
      explanation: "川崎氏病 (Kawasaki disease) 是一種小兒全身性中小型血管炎。其最嚴重、致命的併發症是「冠狀動脈瘤 (coronary artery aneurysm)」，會增加心肌梗塞與血管破裂的風險。臨床上會給予靜脈注射免疫球蛋白 (IVIG) 與高劑量阿斯匹靈預防。"
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
    },
    {
      id: "rn_ma3",
      question: "A nurse is assessing a pregnant patient with severe preeclampsia. Which of the following signs should the nurse identify as an indicator of worsening condition and potential seizure activity?",
      options: [
        "Generalized edema and 1+ proteinuria",
        "Hyperreflexia and positive clonus",
        "Blood pressure of 140/90 mmHg",
        "Decreased deep tendon reflexes"
      ],
      answer: 1,
      explanation: "子癇前症 (preeclampsia) 惡化為子癇症 (eclampsia，伴隨癲癇發作) 的前兆包括：腱反射亢進 (hyperreflexia) 與踝陣攣 (positive clonus，暗示中樞神經高度興奮/易激惹)。此外，劇烈頭痛、右上腹痛、視力模糊也是危險徵兆。"
    },
    {
      id: "rn_ma4",
      question: "A nurse performs a vaginal examination on a patient in labor and detects a prolapsed umbilical cord. Which action should the nurse take first?",
      options: [
        "Attempt to push the umbilical cord back into the uterus",
        "Place the patient in a knee-chest or Trendelenburg position and apply upward digital pressure to the presenting part",
        "Cover the cord with dry sterile gauze and prepare for delivery",
        "Administer a dose of oxytocin to accelerate labor"
      ],
      answer: 1,
      explanation: "臍帶脫垂會導致臍帶受壓，阻斷胎兒氧氣供應。首要護理措施是：穿戴無菌手套，用手指將胎兒先露部位往上推以解除臍帶壓迫，並同時協助產婦採「膝胸臥位 (knee-chest)」或「垂頭仰臥位 (Trendelenburg)」，利用重力減少先露部對臍帶的壓迫，隨後緊急進行剖腹產。"
    },
    {
      id: "rn_ma5",
      question: "A patient at 8 weeks gestation presents to the emergency department with unilateral lower abdominal pain, missed menses, and light vaginal bleeding. The nurse should suspect which potential obstetric emergency?",
      options: [
        "Threatened abortion",
        "Ectopic pregnancy",
        "Molar pregnancy",
        "Placenta previa"
      ],
      answer: 1,
      explanation: "妊娠早期（第一孕期）出現單側下腹疼痛、停經史、陰道微量出血，是「子宮外孕 (ectopic pregnancy)」的典型三聯徵。此時首要任務是排查輸卵管破裂引發內出血與休克的風險。"
    },
    {
      id: "rn_ma6",
      question: "A patient at 10 weeks gestation is diagnosed with hyperemesis gravidarum. Which of the following clinical findings should the nurse prioritize for immediate intervention?",
      options: [
        "Nausea and vomiting morning only",
        "Weight loss of 5% of pre-pregnancy weight and electrolyte imbalance",
        "Blood pressure of 120/80 mmHg",
        "Trace ketones in the urine"
      ],
      answer: 1,
      explanation: "妊娠劇吐 (hyperemesis gravidarum) 超過了一般孕吐的範疇，典型特徵包括體重減輕超過懷孕前體重的 5%、脫水與嚴重的電解質失衡（如低鉀血症，會引發心律不整）。此時需要立即住院進行靜脈輸液與補充電解質。"
    },
    {
      id: "rn_ma7",
      question: "A nurse is monitoring a preeclamptic patient receiving a magnesium sulfate infusion. The nurse notes deep tendon reflexes (DTR) are absent, respiratory rate is 10 breaths/minute, and urine output is 20 mL/hour. Which medication should the nurse prepare to administer immediately?",
      options: [
        "Naloxone",
        "Calcium gluconate",
        "Protamine sulfate",
        "Terbutaline"
      ],
      answer: 1,
      explanation: "深腱反射消失 (absent DTR)、呼吸抑制 (<12次/分) 及少尿 (<30mL/小時) 皆為「硫酸鎂 (Magnesium sulfate) 中毒」的典型表現。硫酸鎂毒性的專屬解毒劑是「葡萄糖酸鈣 (Calcium gluconate)」，應立即給藥以逆轉呼吸與心臟抑制。"
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
    },
    {
      id: "rn_di3",
      title: "建立靜脈管道溝通",
      roleA: "I need to insert a peripheral IV catheter for your antibiotics.",
      translationA: "我需要為您置入一條靜脈留置針以注射抗生素。",
      roleB: "Please use my left arm if possible, as I am right-handed.",
      translationB: "如果可以的話請用我的左手，因為我是右撇子。",
      explanation: "靜脈注射溝通。護理人員在選擇置入部位時，應儘量避開關節，並優先選擇病人的非慣用手 (non-dominant hand)，以方便其日常自理活動。"
    },
    {
      id: "rn_di4",
      title: "術後疼痛評估",
      roleA: "On a scale of zero to ten, how would you rate your pain right now?",
      translationA: "從零到十的評分標準，您現在的疼痛程度是幾分？",
      roleB: "It is about a seven, especially when I try to take a deep breath.",
      translationB: "大約是七分，特別是在我嘗試深呼吸的時候。",
      explanation: "臨床疼痛評量 (Pain Scale 0-10)。術後病人在深呼吸與咳嗽時的疼痛控制至關重要，可避免因不敢吸氣而引發的肺不張 (atelectasis) 與墜積性肺炎。"
    },
    {
      id: "rn_di5",
      title: "準備出院衛教",
      roleA: "We will review your discharge instructions and medication list before you leave.",
      translationA: "在您離開之前，我們會一起複習您的出院指示與藥物清單。",
      roleB: "Thank you, I want to make sure I understand when to follow up with my doctor.",
      translationB: "謝謝，我想確認我了解什麼時候需要回診看醫生。",
      explanation: "出院衛教 (discharge teaching) 是確保病人出院後照護安全與預防再住院的重要手段。確認病人清楚回診追蹤 (follow-up) 的時間與藥物服用時機是關鍵點。"
    }
  ]
};
