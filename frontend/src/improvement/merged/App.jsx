import { useState } from "react";
import "./App.css";
import { sendMessage as sendApiMessage } from "./services/api";

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

// وقت الرسالة يُحفظ لحظة إنشائها (شكلي فقط)
const formatTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // الوضع الليلي (شكلي فقط)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Create one ID for the current conversation
  const [conversationId, setConversationId] = useState(
    () => crypto.randomUUID()
  );

  // Add assistant message
  const addAssistantMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        text,
        sender: "assistant",
        time: formatTime(),
      },
    ]);
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

        // Request location using the SAME conversation ID
        await requestCurrentLocation(
          userMessage,
          currentConversationId
        );

        return;
      }

      // Normal response
      if (result?.response) {
        addAssistantMessage(result.response);
      } else {
        addAssistantMessage(
          "عذرًا، لم أتمكن من الحصول على رد مناسب."
        );
      }
    } catch (error) {
      console.error("Backend Error:", error);

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
    currentConversationId
  ) => {
    if (!navigator.geolocation) {
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
    } catch (error) {
      console.error(
        "Location error API:",
        error
      );

      setError(
        "تعذر الاتصال بالخادم. حاول مرة أخرى."
      );
    }
  };

  // Voice recognition
  const startListening = () => {
    if (!SpeechRecognition) {
      setError(
        "المتصفح لا يدعم التعرف على الصوت."
      );

      return;
    }

    const recognition = new SpeechRecognition();

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

    recognition.onerror = () => {
      setError(
        "تعذر التعرف على الصوت. حاول مرة أخرى."
      );

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Send user message
  const sendMessage = async () => {
    if (!message.trim() || loading) {
      return;
    }

    const userMessage = message.trim();

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

  return (
    <div className={`app ${isDarkMode ? "dark-mode" : ""}`}>

      {/* ================= SIDEBAR ================= */}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>

        <div className="brand">
          <div className="brand-logo">
            <span>M</span>
          </div>

          <div>
            <h2>MaltBot</h2>
            <p>Your Banking Assistant</p>
          </div>
        </div>

        <button className="new-chat" onClick={startNewChat}>
          <span className="plus">＋</span>
          محادثة جديدة
        </button>

        <div className="history">
          <h3>المحادثات السابقة</h3>

          <div className="history-item">
            <span className="history-title">
              لا توجد محادثات سابقة
            </span>
          </div>
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

          <button className="bottom-item">
            <span>⚙</span>
            الإعدادات
          </button>

          <button className="bottom-item">
            <span>↪</span>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* ================= MAIN CHAT ================= */}

      <main
        className="chat"
        onClick={() => {
          if (sidebarOpen) {
            setSidebarOpen(false);
          }
        }}
      >

        <button
          className="menu-button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label="فتح أو إغلاق القائمة"
          style={{ display: sidebarOpen ? "none" : "flex" }}
        >
          ☰
        </button>

        {/* HEADER */}

        <header className="chat-header">
          <div className="header-info">
            <h1>MaltBot</h1>
          </div>
        </header>

        {/* ================= MESSAGES ================= */}

        <section className="messages">

          {messages.length === 0 ? (

            <div className="welcome">

              <div className="welcome-avatar">
                🤖
              </div>

              <h2>مرحباً بك في MaltBot 👋</h2>

              <p>
                أنا مساعدك الذكي.
                <br />
                اكتب سؤالك وسأساعدك.
              </p>

              <div className="suggestions">

                <button
                  onClick={() =>
                    setMessage(
                      "ما هي الخدمات المصرفية المتاحة؟"
                    )
                  }
                >
                  الخدمات المصرفية
                </button>

                <button
                  onClick={() =>
                    setMessage(
                      "كيف أستفسر عن حسابي؟"
                    )
                  }
                >
                  الاستفسار عن الحساب
                </button>

                <button
                  onClick={() =>
                    setMessage(
                      "أريد معرفة المزيد"
                    )
                  }
                >
                  أريد معرفة المزيد
                </button>

              </div>
            </div>

          ) : (

            messages.map((item) => (
              <div
                key={item.id}
                className={`message-row ${item.sender}`}
              >
                <div className="avatar">
                  {item.sender === "assistant" ? "🤖" : "●"}
                </div>

                <div className="message-content">
                  <div className="message">
                    {item.text}
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
                  aria-label="MaltBot يكتب..."
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

            <button
              className="attach-button"
              type="button"
              aria-label="إرفاق ملف"
            >
              <svg
                viewBox="0 0 24 24"
                width="23"
                height="23"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.4 11.1-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />
              </svg>
            </button>

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
                onClick={sendMessage}
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
                onClick={startListening}
                disabled={loading}
                aria-label="التحدث"
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
            MaltBot قد يحتاج إلى التحقق من
            المعلومات قبل تقديم إجابة نهائية.
          </p>

        </div>

      </main>
    </div>
  );
}

export default App;
