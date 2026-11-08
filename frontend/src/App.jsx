import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  sendMessage as sendApiMessage,
  getStoredSession,
  clearSession,
  AuthExpiredError,
  ConversationForbiddenError,
  fetchConversations,
  fetchConversationMessages,
  deleteConversation,
  getGuestConversations,
  saveGuestConversation,
  removeGuestConversation,
} from "./services/api";
import AuthModal from "./AuthModal";
import ConfirmDialog from "./ConfirmDialog";
import FormattedMessage from "./FormattedMessage";
import LocationCard from "./LocationCard";

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

// رسائل واضحة لأخطاء التعرف على الصوت
const SPEECH_ERROR_MESSAGES = {
  "not-allowed": "يرجى السماح للمتصفح باستخدام الميكروفون ثم المحاولة مرة أخرى.",
  "service-not-allowed": "يرجى السماح للمتصفح باستخدام الميكروفون ثم المحاولة مرة أخرى.",
  "no-speech": "لم يتم سماع أي كلام. حاول مرة أخرى.",
  "audio-capture": "لم يتم العثور على ميكروفون متصل بالجهاز.",
  network: "تعذر الاتصال بخدمة التعرف على الصوت. تحقق من الإنترنت.",
};

// اقتراحات بداية المحادثة: تُرسل مباشرة عند الضغط عليها
const GUEST_SUGGESTIONS = [
  "ما هي الخدمات المصرفية المتاحة؟",
  "ما الفرق بين الحساب الجاري وحساب التوفير؟",
  "حوّل 100 دولار إلى جنيه سوداني",
  "أين أقرب صراف آلي؟",
];

const USER_SUGGESTIONS = [
  "كم رصيدي؟",
  "اعرض آخر معاملاتي",
  "كم أنفقت في المطاعم؟",
  "قارن مصروفاتي بين سبتمبر وأكتوبر",
  "حلل مصروفاتي في أكتوبر",
  "أين أقرب فرع؟",
];

// صورة المستخدم الرمزية حسب الجنس، وشخصية غامضة للزائر أو غير المحدد
const getUserAvatar = (user) => {
  if (user?.gender === "male") return "👨";
  if (user?.gender === "female") return "👩";
  return "👤";
};

// نفس حد الجوال المستخدم في App.css
const isMobileScreen = () =>
  window.matchMedia("(max-width: 700px)").matches;

// وقت الرسالة يُحفظ لحظة إنشائها (شكلي فقط)
const formatTime = (date = new Date()) =>
  new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

// تاريخ مختصر لقائمة المحادثات: الوقت لليوم، والتاريخ لما قبله
const formatHistoryDate = (iso) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  const isToday = date.toDateString() === new Date().toDateString();

  return isToday
    ? formatTime(date)
    : date.toLocaleDateString("ar", { day: "numeric", month: "short" });
};

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);

  // جلسة التعرف على الصوت الحالية (لإيقافها عند الحاجة)
  const recognitionRef = useRef(null);
  // القائمة ظاهرة افتراضياً على الشاشات الكبيرة ومخفية على الجوال
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !isMobileScreen()
  );

  // المستخدم المسجل حالياً (null = زائر)
  const [currentUser, setCurrentUser] = useState(
    () => getStoredSession()?.user ?? null
  );

  // نافذة تسجيل الدخول / إنشاء الحساب
  const [authModal, setAuthModal] = useState(null);

  // المحادثات السابقة: للمستخدم من الخادم، وللزائر من هذا المتصفح فقط
  const [conversations, setConversations] = useState([]);

  // المحادثة المفتوح لها قائمة الخيارات (⋮)
  const [menuConversationId, setMenuConversationId] = useState(null);

  // المحادثة التي ينتظر حذفها تأكيد المستخدم
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // إغلاق قائمة الخيارات عند الضغط في أي مكان آخر
  useEffect(() => {
    if (!menuConversationId) return;

    const close = () => setMenuConversationId(null);

    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);
  }, [menuConversationId]);

  const openAuthModal = (notice = "") => {
    setAuthModal({ notice });
  };

  // الوضع الليلي (شكلي فقط)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Create one ID for the current conversation
  const [conversationId, setConversationId] = useState(
    () => crypto.randomUUID()
  );

  // Add assistant message
  const addAssistantMessage = (text, extra = {}) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        text,
        sender: "assistant",
        time: formatTime(),
        ...extra,
      },
    ]);
  };

  // تحميل قائمة المحادثات حسب نوع المستخدم
  const loadConversations = async (user = currentUser) => {
    if (!user) {
      setConversations(getGuestConversations());
      return;
    }

    try {
      setConversations(await fetchConversations());
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        handleAuthExpired(err);
        return;
      }

      console.error("Conversations error:", err);
    }
  };

  // عند تسجيل الدخول أو الخروج تتبدل القائمة تلقائياً
  useEffect(() => {
    loadConversations(currentUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // تحديث القائمة بعد كل رسالة ناجحة
  const refreshHistory = (userMessage, currentConversationId) => {
    if (currentUser) {
      loadConversations(currentUser);
    } else {
      setConversations(
        saveGuestConversation(currentConversationId, userMessage)
      );
    }
  };

  // فتح محادثة سابقة
  const openConversation = async (id) => {
    if (loading || id === conversationId) return;

    stopListening();
    setError("");

    if (isMobileScreen()) setSidebarOpen(false);

    try {
      const history = await fetchConversationMessages(id);

      // المحادثة غير موجودة أو ليست ملكاً لهذا المستخدم
      if (history === null) {
        if (!currentUser) setConversations(removeGuestConversation(id));
        setError("تعذر فتح هذه المحادثة.");
        return;
      }

      setMessages(
        history.map((m) => ({
          id: m.id,
          text: m.content,
          sender: m.role === "user" ? "user" : "assistant",
          time: formatTime(m.created_at),
        }))
      );

      setMessage("");
      setConversationId(id);
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        handleAuthExpired(err);
        return;
      }

      setError(err.message);
    }
  };

  // حذف محادثة من القائمة
  const handleDeleteConversation = (id) => {
    setMenuConversationId(null);
    setPendingDeleteId(id);
  };

  const confirmDeleteConversation = async () => {
    const id = pendingDeleteId;

    setPendingDeleteId(null);

    if (!id) return;

    try {
      await deleteConversation(id);

      if (currentUser) {
        setConversations((prev) =>
          prev.filter((c) => c.conversation_id !== id)
        );
      } else {
        setConversations(removeGuestConversation(id));
      }

      // إذا كانت المحادثة المحذوفة مفتوحة نبدأ محادثة جديدة
      if (id === conversationId) startNewChat();
    } catch (err) {
      if (err instanceof AuthExpiredError) {
        handleAuthExpired(err);
        return;
      }

      setError(err.message);
    }
  };

  // رسالة حالة محلية (مثل تحديد الموقع): تظهر في الواجهة فقط ولا تُرسل أو تُحفظ
  const addStatusMessage = (text) => {
    const id = Date.now() + Math.random();

    setMessages((prev) => [
      ...prev,
      { id, text, sender: "assistant", status: true, time: formatTime() },
    ]);

    return id;
  };

  const updateStatusMessage = (id, text) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text } : m))
    );
  };

  // الجلسة انتهت أو أصبحت غير صالحة
  const handleAuthExpired = (error) => {
    setCurrentUser(null);
    setError(error.message);
    openAuthModal(error.message);
  };

  // Send message to backend
  const sendMessageToBackend = async (
    userMessage,
    latitude = null,
    longitude = null,
    locationError = null,
    currentConversationId = conversationId
  ) => {
    setLoading(true);
    setError("");

    try {
      console.log("Sending to backend:", {
        message: userMessage,
        conversation_id: currentConversationId,
        latitude,
        longitude,
        location_error: locationError,
      });

      const result = await sendApiMessage(userMessage, {
        latitude,
        longitude,
        location_error: locationError,
        conversation_id: currentConversationId,
      });

      console.log("Backend response:", result);

      // Gemini requires location
      if (result?.action === "location_required") {
        console.log(
          "Gemini requested location:",
          result.location_type
        );

        const statusId = addStatusMessage("📍 جارٍ تحديد موقعك...");

        // Request location using the SAME conversation ID
        await requestCurrentLocation(
          userMessage,
          currentConversationId,
          statusId
        );

        return;
      }

      // Private banking data requires login
      if (result?.action === "login_required") {
        addAssistantMessage(result.response, {
          loginRequired: true,
        });

        refreshHistory(userMessage, currentConversationId);

        return;
      }

      refreshHistory(userMessage, currentConversationId);

      // Normal response (with map cards for branch/ATM results)
      if (result?.response) {
        addAssistantMessage(
          result.response,
          result.locations?.length ? { locations: result.locations } : {}
        );
      } else {
        addAssistantMessage(
          "عذرًا، لم أتمكن من الحصول على رد مناسب."
        );
      }
    } catch (error) {
      console.error("Backend Error:", error);

      if (error instanceof AuthExpiredError) {
        handleAuthExpired(error);
        return;
      }

      // المحادثة ليست ملكاً للمستخدم الحالي
      if (error instanceof ConversationForbiddenError) {
        startNewChat();
        setError(error.message);
        return;
      }

      setError(
        "تعذر الاتصال بالخادم. حاول مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  };

  // Request current browser location
  const requestCurrentLocation = async (
    userMessage,
    currentConversationId,
    statusId = null
  ) => {
    if (!navigator.geolocation) {
      if (statusId) {
        updateStatusMessage(statusId, "⚠️ المتصفح لا يدعم تحديد الموقع.");
      }

      console.error(
        "Geolocation is not supported."
      );

      await sendLocationUnavailable(
        userMessage,
        "unsupported",
        currentConversationId
      );

      return;
    }

    console.log("Requesting browser location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        console.log("Location granted:", {
          latitude,
          longitude,
        });

        if (statusId) {
          updateStatusMessage(statusId, "✅ تم تحديد موقعك.");
        }

        // Resend the SAME message with the SAME conversation ID
        await sendMessageToBackend(
          userMessage,
          latitude,
          longitude,
          null,
          currentConversationId
        );
      },

      async (geoError) => {
        console.error(
          "Geolocation Error:",
          geoError
        );

        let reason = "unknown";

        if (
          geoError.code ===
          geoError.PERMISSION_DENIED
        ) {
          reason = "denied";
        } else if (
          geoError.code ===
          geoError.POSITION_UNAVAILABLE
        ) {
          reason = "unavailable";
        } else if (
          geoError.code ===
          geoError.TIMEOUT
        ) {
          reason = "timeout";
        }

        if (statusId) {
          updateStatusMessage(
            statusId,
            reason === "denied"
              ? "⚠️ لم يتم السماح بالوصول إلى موقعك."
              : "⚠️ تعذر تحديد موقعك."
          );
        }

        // Send location error with the SAME conversation ID
        await sendLocationUnavailable(
          userMessage,
          reason,
          currentConversationId
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Tell backend that location is unavailable
  const sendLocationUnavailable = async (
    userMessage,
    reason,
    currentConversationId
  ) => {
    setLoading(true);

    try {
      console.log(
        "Location unavailable:",
        reason
      );

      const result = await sendApiMessage(
        userMessage,
        {
          latitude: null,
          longitude: null,
          location_error: reason,
          conversation_id: currentConversationId,
        }
      );

      console.log(
        "Backend response after location error:",
        result
      );

      if (result?.response) {
        addAssistantMessage(result.response);
      } else {
        addAssistantMessage(
          "تعذر الحصول على موقعك الحالي."
        );
      }

      refreshHistory(userMessage, currentConversationId);
    } catch (error) {
      console.error(
        "Location error API:",
        error
      );

      if (error instanceof AuthExpiredError) {
        handleAuthExpired(error);
        return;
      }

      setError(
        "تعذر الاتصال بالخادم. حاول مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  };

  // إيقاف التسجيل الصوتي الجاري (إن وجد)
  const stopListening = () => {
    const recognition = recognitionRef.current;

    if (!recognition) return;

    // فصل المعالجات حتى لا يُكتب أي نص بعد الإيقاف
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.abort();

    recognitionRef.current = null;
    setIsListening(false);
  };

  // إيقاف التسجيل عند إغلاق الصفحة أو إزالة المكوّن
  useEffect(() => stopListening, []);

  // Voice recognition: الضغط مرة يبدأ التسجيل، والضغط مرة ثانية يوقفه
  const toggleListening = () => {
    if (recognitionRef.current) {
      stopListening();
      return;
    }

    if (!SpeechRecognition) {
      setError(
        "المتصفح لا يدعم التعرف على الصوت."
      );

      return;
    }

    setError("");

    const recognition = new SpeechRecognition();

    recognitionRef.current = recognition;

    recognition.lang = "ar-SA";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setMessage(transcript);
    };

    recognition.onerror = (event) => {
      // الإلغاء المقصود لا يحتاج رسالة خطأ
      if (event.error !== "aborted") {
        setError(
          SPEECH_ERROR_MESSAGES[event.error] ??
            "تعذر التعرف على الصوت. حاول مرة أخرى."
        );
      }

      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError("تعذر تشغيل الميكروفون. حاول مرة أخرى.");
    }
  };

  // Send user message
  const sendMessage = async (text = message) => {
    if (!text.trim() || loading) {
      return;
    }

    const userMessage = text.trim();

    setError("");

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        text: userMessage,
        sender: "user",
        time: formatTime(),
      },
    ]);

    setMessage("");

    // Send using the current conversation ID
    await sendMessageToBackend(
      userMessage,
      null,
      null,
      null,
      conversationId
    );
  };

  // Start new chat
  const startNewChat = () => {
    // لا نسمح لتسجيل صوتي قديم بالكتابة في المحادثة الجديدة
    stopListening();

    setMessages([]);
    setMessage("");
    setError("");
    setLoading(false);

    // Generate a NEW ID only for a new conversation
    const newConversationId = crypto.randomUUID();

    setConversationId(newConversationId);

    console.log(
      "New conversation started:",
      newConversationId
    );
  };

  // بعد تسجيل الدخول: نبدأ محادثة جديدة حتى لا تختلط محادثة الزائر بمحادثة المستخدم
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setAuthModal(null);
    startNewChat();
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    startNewChat();
  };

  return (
    <div className={`app ${isDarkMode ? "dark-mode" : ""}`} dir="rtl">

      {/* ================= SIDEBAR ================= */}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>

        <div className="brand">
          <div className="brand-logo">
            <span>M</span>
          </div>

          <div>
            <h2>المساعد 2.0</h2>
            <p>مساعدك البنكي</p>
          </div>

          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="إخفاء القائمة"
            aria-expanded={true}
            title="إخفاء القائمة"
          >
            ☰
          </button>
        </div>

        <button className="new-chat" onClick={startNewChat}>
          <span className="plus">＋</span>
          محادثة جديدة
        </button>

        <div className="history">
          <h3>
            {currentUser ? "محادثاتي" : "محادثات الزائر"}
          </h3>

          {conversations.length === 0 ? (
            <div className="history-item history-empty">
              <span className="history-title">
                لا توجد محادثات سابقة
              </span>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                className={`history-row ${menuConversationId === conv.conversation_id ? "menu-open" : ""}`}
              >
                <button
                  type="button"
                  className={`history-item ${conv.conversation_id === conversationId ? "active" : ""}`}
                  onClick={() => openConversation(conv.conversation_id)}
                  title={conv.title}
                >
                  <span className="history-icon">💬</span>
                  <span className="history-title">{conv.title}</span>
                  <span className="history-time">
                    {formatHistoryDate(conv.updated_at)}
                  </span>
                </button>

                <button
                  type="button"
                  className="history-menu-button"
                  aria-label="خيارات المحادثة"
                  aria-haspopup="menu"
                  aria-expanded={menuConversationId === conv.conversation_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuConversationId((prev) =>
                      prev === conv.conversation_id ? null : conv.conversation_id
                    );
                  }}
                >
                  ⋮
                </button>

                {menuConversationId === conv.conversation_id && (
                  <div
                    className="history-menu"
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="history-menu-delete"
                      onClick={() => handleDeleteConversation(conv.conversation_id)}
                    >
                      حذف المحادثة
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="sidebar-bottom">

          <div className="appearance-option">
            <div className="appearance-info">
              <span className="appearance-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
                </svg>
              </span>
              <span>الوضع الليلي</span>
            </div>

            <button
              className={`appearance-switch ${isDarkMode ? "active" : ""}`}
              type="button"
              aria-label="تغيير الوضع الليلي"
              aria-pressed={isDarkMode}
              onClick={() => setIsDarkMode((prev) => !prev)}
            >
              <span></span>
            </button>
          </div>

          {currentUser ? (
            <>
              <div className="user-card">
                <div className="user-avatar">
                  {getUserAvatar(currentUser)}
                </div>

                <div className="user-info">
                  <strong>{currentUser.name}</strong>
                  <span>{currentUser.email}</span>
                </div>
              </div>

              <button className="bottom-item" onClick={handleLogout}>
                <span>↪</span>
                تسجيل الخروج
              </button>
            </>
          ) : (
            <button
              className="bottom-item login-item"
              onClick={() => openAuthModal()}
            >
              <span>↩</span>
              تسجيل الدخول
            </button>
          )}
        </div>
      </aside>

      {/* ================= MAIN CHAT ================= */}

      <main
        className="chat"
        onClick={() => {
          // على الجوال فقط: الضغط على المحادثة يغلق القائمة
          if (sidebarOpen && isMobileScreen()) {
            setSidebarOpen(false);
          }
        }}
      >

        {/* HEADER */}

        <header className="chat-header">
          {!sidebarOpen && (
            <button
              className="menu-button menu-open-button"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(true);
              }}
              aria-label="إظهار القائمة"
              aria-expanded={false}
              title="إظهار القائمة"
            >
              ☰
            </button>
          )}

          <div className="header-info">
            <h1>المساعد 2.0</h1>
          </div>
        </header>

        {/* ================= MESSAGES ================= */}

        <section className="messages">

          {messages.length === 0 ? (

            <div className="welcome">

              <div className="welcome-avatar">
                🤖
              </div>

              <h2>
                {currentUser
                  ? `مرحباً ${currentUser.name} 👋`
                  : "مرحباً بك في المساعد 2.0 👋"}
              </h2>

              <p>
                {currentUser ? (
                  <>
                    يمكنك سؤالي عن رصيدك ومعاملاتك ومصروفاتك.
                    <br />
                    كيف أساعدك اليوم؟
                  </>
                ) : (
                  <>
                    أنا مساعدك الذكي.
                    <br />
                    اكتب سؤالك وسأساعدك.
                  </>
                )}
              </p>

              <div className="suggestions">
                {(currentUser ? USER_SUGGESTIONS : GUEST_SUGGESTIONS).map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendMessage(suggestion)}
                      disabled={loading}
                    >
                      {suggestion}
                    </button>
                  )
                )}
              </div>
            </div>

          ) : (

            messages.map((item) => (
              <div
                key={item.id}
                className={`message-row ${item.sender}`}
              >
                <div className="avatar">
                  {item.sender === "assistant"
                    ? "🤖"
                    : getUserAvatar(currentUser)}
                </div>

                <div className="message-content">
                  <div className={`message ${item.status ? "status-message" : ""}`}>
                    {item.sender === "assistant" && !item.status ? (
                      <FormattedMessage text={item.text} />
                    ) : (
                      item.text
                    )}

                    {item.locations?.map((location, index) => (
                      <LocationCard key={index} location={location} />
                    ))}

                    {item.loginRequired && !currentUser && (
                      <button
                        className="login-prompt-button"
                        type="button"
                        onClick={() => openAuthModal()}
                      >
                        تسجيل الدخول
                      </button>
                    )}
                  </div>

                  <span className="message-time">
                    {item.time}
                  </span>
                </div>
              </div>
            ))

          )}

          {/* Loading */}

          {loading && (
            <div className="message-row assistant">
              <div className="avatar">🤖</div>

              <div className="message-content">
                <div
                  className="message loading"
                  aria-label="المساعد 2.0 يكتب..."
                >
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}

          {error && (
            <div className="error">
              {error}
            </div>
          )}

        </section>

        {/* ================= INPUT ================= */}

        <div className="input-area">
          <div className="input-box">

            <input
              type="text"
              placeholder="اكتب رسالتك هنا..."
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              disabled={loading}
            />

            {message.trim() ? (
              <button
                className="send-button"
                type="button"
                onClick={() => sendMessage()}
                disabled={loading}
                aria-label="إرسال"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2 11 13" />
                  <path d="m22 2-7 20-4-9-9-4Z" />
                </svg>
              </button>
            ) : (
              <button
                className={`voice-button ${isListening ? "recording" : ""}`}
                type="button"
                onClick={toggleListening}
                disabled={loading}
                aria-label={isListening ? "إيقاف التسجيل" : "التحدث"}
                aria-pressed={isListening}
                title={isListening ? "اضغط لإيقاف التسجيل" : "اضغط للتحدث"}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <path d="M12 17v5" />
                  <path d="M8 22h8" />
                </svg>
              </button>
            )}

          </div>

          <p className="input-note">
            المساعد 2.0 قد يحتاج إلى التحقق من
            المعلومات قبل تقديم إجابة نهائية.
          </p>

        </div>

      </main>

      {pendingDeleteId && (
        <ConfirmDialog
          title="حذف المحادثة"
          message="هل تريد حذف هذه المحادثة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
          confirmLabel="حذف"
          danger
          onConfirm={confirmDeleteConversation}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {authModal && (
        <AuthModal
          notice={authModal.notice}
          onClose={() => setAuthModal(null)}
          onSuccess={handleLoginSuccess}
        />
      )}
    </div>
  );
}

export default App;
