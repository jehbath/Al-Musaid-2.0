import { useState } from "react";
import "./App.css";
import { sendMessage as sendApiMessage } from "./services/api";

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="app" dir="rtl">

      {/* Sidebar */}

      <aside
        className={`sidebar ${sidebarOpen ? "open" : ""
          }`}
      >
        <div className="logo">
          <div className="logo-icon">
            M
          </div>

          <div>
            <h2>MaltBot</h2>

            <span>
              المساعد الذكي
            </span>
          </div>
        </div>

        <button
          className="new-chat"
          onClick={startNewChat}
        >
          + محادثة جديدة
        </button>

        <div className="history">
          <h3>
            المحادثات
          </h3>

          <div className="history-item">
            لا توجد محادثات سابقة
          </div>
        </div>
      </aside>

      {/* Main chat */}

      <main className="chat">

        {/* Menu */}

        <button
          className={`menu-button ${sidebarOpen ? "sidebar-open" : ""
            }`}
          onClick={() =>
            setSidebarOpen((prev) => !prev)
          }
          aria-label="فتح أو إغلاق القائمة"
        >
          ☰
        </button>

        {/* Header */}

        <header className="chat-header">
          <div>
            <h1>
              MaltBot
            </h1>

            <p>
              المساعد الذكي للخدمات المصرفية
            </p>
          </div>

          <div className="status">
            <span></span>
            متصل
          </div>
        </header>

        {/* Messages */}

        <section className="messages">

          {messages.length === 0 ? (
            <div className="welcome">

              <div className="welcome-icon">
                M
              </div>

              <h2>
                مرحباً بك في MaltBot 👋
              </h2>

              <p>
                أنا مساعدك الذكي.
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
                className={`message ${item.sender}`}
              >
                {item.text}
              </div>
            ))
          )}

          {/* Loading */}

          {loading && (
            <div className="message assistant loading">
              MaltBot يكتب...
            </div>
          )}

          {/* Error */}

          {error && (
            <div className="message error">
              {error}
            </div>
          )}

        </section>

        {/* Input */}

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

            <button
              type="button"
              className="voice-button"
              onClick={startListening}
              disabled={loading}
            >
              {isListening ? "🔴" : "🎤"}
            </button>

            <button
              className="send-button"
              onClick={sendMessage}
              disabled={loading}
            >
              {loading
                ? "جاري الإرسال..."
                : "إرسال"}
            </button>

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